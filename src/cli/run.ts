import { execa } from 'execa'
import kleur from 'kleur'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from '../../e2e.config.js'
import { boot } from '../stack/index.js'
import { seed } from '../stack/seed.js'

type Opts = {
  only?: string
  screenshotsOnly?: boolean
  visualRegression?: boolean
  appOnly?: boolean
  backofficeOnly?: boolean
}

function step(label: string): () => void {
  const t0 = Date.now()
  console.log(kleur.cyan(`\n▶ ${label}`))
  return () => console.log(kleur.gray(`  ✓ ${((Date.now() - t0) / 1000).toFixed(1)}s`))
}

export async function run(opts: Opts): Promise<void> {
  const runDir = resolve(process.cwd(), 'runs/history/latest')
  mkdirSync(runDir, { recursive: true })

  let stack: Awaited<ReturnType<typeof boot>> | null = null
  let exitCode = 0

  try {
    // --- PHASE 1: boot ---
    let done = step('boot stack (db + backend + backoffice)')
    stack = await boot({ freshDb: true, captureLogs: true })
    done()

    // --- PHASE 2: seed ---
    done = step('seed fixtures')
    const seeded = await seed(config.db.url, config.testUsers)
    console.log(kleur.gray(`  admin=${seeded.admin.id} hr=${seeded.hrAdmin.id} user=${seeded.endUser.id}`))
    done()

    const st = await stack!.status()

    // --- PHASE 3: backoffice (Playwright) ---
    if (!opts.appOnly) {
      done = step('playwright (backoffice specs)')
      const args = ['playwright', 'test']
      if (opts.only) args.push('--grep', opts.only)
      const pw = await execa('npx', args, {
        reject: false,
        stdio: 'inherit',
        env: { ...process.env, BACKOFFICE_URL: st.backoffice.url },
      })
      done()
      if (pw.exitCode !== 0) exitCode = pw.exitCode ?? 1
    }

    // --- PHASE 4: app (Maestro) ---
    if (!opts.backofficeOnly) {
      done = step('maestro (app flows)')
      const appPath = config.repos.app
      const mae = await execa('maestro', ['test', `${appPath}/.maestro/flows`], {
        reject: false,
        stdio: 'inherit',
        env: {
          ...process.env,
          EXPO_PUBLIC_API_BASE_URL: st.backend.url,
        },
      })
      done()
      if (mae.exitCode !== 0) exitCode = mae.exitCode ?? 1
    }
  } catch (err) {
    console.error(kleur.red('\n✗ run failed:'), err instanceof Error ? err.message : err)
    exitCode = 1
  } finally {
    if (stack) {
      const done = step('teardown')
      await stack.teardown().catch((e) => console.error(kleur.red('teardown error:'), e))
      done()
    }
  }

  console.log(exitCode === 0 ? kleur.green('\n✓ run complete') : kleur.red(`\n✗ run failed (exit ${exitCode})`))
  process.exit(exitCode)
}
