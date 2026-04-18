import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ServiceHandle } from './backend.js'

async function checkPort(port: number): Promise<number | null> {
  const { execa } = await import('execa')
  const { stdout } = await execa('lsof', ['-ti', `:${port}`], { reject: false })
  const pid = parseInt(stdout.trim(), 10)
  return isNaN(pid) ? null : pid
}

async function waitReady(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if ([200, 404, 501].includes(res.status)) return
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`)
}

export async function startBackoffice(opts: {
  backofficePath: string
  backendUrl: string
  port: number
  logFile?: string
}): Promise<ServiceHandle> {
  const existing = await checkPort(opts.port)
  if (existing) throw new Error(`Port ${opts.port} already in use by PID ${existing}. Kill it before starting backoffice.`)

  if (opts.logFile) mkdirSync(dirname(opts.logFile), { recursive: true })

  const child = spawn('npm', ['run', 'dev', '--', '--port', String(opts.port)], {
    cwd: opts.backofficePath,
    detached: true,
    env: {
      ...process.env,
      VITE_API_URL: opts.backendUrl,
      NODE_ENV: 'development',
    },
    stdio: opts.logFile ? ['ignore', 'pipe', 'pipe'] : 'ignore',
  })

  if (opts.logFile && child.stdout && child.stderr) {
    const ws = createWriteStream(opts.logFile, { flags: 'a' })
    child.stdout.pipe(ws)
    child.stderr.pipe(ws)
  }

  child.unref()

  const url = `http://localhost:${opts.port}`
  await waitReady(url)

  const stop = (): Promise<void> =>
    new Promise(resolve => {
      try { process.kill(-(child.pid!), 'SIGTERM') } catch { /* already gone */ }
      setTimeout(resolve, 500)
    })

  return { pid: child.pid!, url, stop }
}
