import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from '../../e2e.config.js'
import { createTestDatabase, dropTestDatabase, runMigrations } from './db.js'
import { startBackend } from './backend.js'
import { startBackoffice } from './backoffice.js'
import type { BootOptions, StackHandle, StackStatus } from './types.js'
import type { ServiceHandle } from './backend.js'

const LOG_DIR = resolve(process.cwd(), 'runs/history/latest')

export async function boot(opts: BootOptions = {}): Promise<StackHandle> {
  const freshDb = opts.freshDb ?? true
  const captureLogs = opts.captureLogs ?? true

  mkdirSync(LOG_DIR, { recursive: true })

  // DB
  if (freshDb) {
    await dropTestDatabase(config.db.url)
  }
  await createTestDatabase(config.db.url)
  await runMigrations(config.repos.backend, config.db.url)

  // Backend
  const backend: ServiceHandle = await startBackend({
    backendPath: config.repos.backend,
    dbUrl: config.db.url,
    port: config.ports.backend,
    logFile: captureLogs ? resolve(LOG_DIR, 'backend.log') : undefined,
  })

  // Backoffice
  const backoffice: ServiceHandle = await startBackoffice({
    backofficePath: config.repos.backoffice,
    backendUrl: backend.url,
    port: config.ports.backoffice,
    logFile: captureLogs ? resolve(LOG_DIR, 'backoffice.log') : undefined,
  })

  let tornDown = false

  const teardown = async (): Promise<void> => {
    if (tornDown) return
    tornDown = true
    await backoffice.stop()
    await backend.stop()
    if (freshDb) await dropTestDatabase(config.db.url)
  }

  const status = async (): Promise<StackStatus> => {
    const check = async (url: string): Promise<boolean> => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
        return [200, 404, 501].includes(res.status)
      } catch { return false }
    }

    return {
      db: { up: true, url: config.db.url },
      backend: { up: await check(`${backend.url}/health`), url: backend.url, pid: backend.pid },
      backoffice: { up: await check(backoffice.url), url: backoffice.url, pid: backoffice.pid },
    }
  }

  return { teardown, status }
}
