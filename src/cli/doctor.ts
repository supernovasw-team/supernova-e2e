import { execa } from 'execa'
import kleur from 'kleur'
import { access, constants } from 'node:fs/promises'
import { config } from '../../e2e.config.js'

type Check = { name: string; ok: boolean; detail: string }

async function exists(path: string): Promise<boolean> {
  try { await access(path, constants.R_OK); return true } catch { return false }
}

async function cmdOk(cmd: string, args: string[] = []): Promise<boolean> {
  try { await execa(cmd, args, { reject: false, timeout: 5000 }); return true } catch { return false }
}

export async function doctor(): Promise<void> {
  const checks: Check[] = []

  for (const [name, path] of Object.entries(config.repos)) {
    checks.push({
      name: `repo:${name}`,
      ok: await exists(path),
      detail: path,
    })
  }

  checks.push({
    name: 'tool:psql',
    ok: await cmdOk('psql', ['--version']),
    detail: 'Postgres client',
  })
  checks.push({
    name: 'tool:maestro',
    ok: await cmdOk('maestro', ['--version']),
    detail: '~/.maestro/bin/maestro',
  })
  checks.push({
    name: 'tool:adb',
    ok: await cmdOk('adb', ['--version']),
    detail: 'Android platform-tools',
  })

  try {
    const { stdout } = await execa('adb', ['devices'], { timeout: 3000 })
    const hasDevice = stdout.split('\n').slice(1).some((l) => /\tdevice$/.test(l))
    checks.push({
      name: 'emulator:running',
      ok: hasDevice,
      detail: hasDevice ? 'ok' : 'start an emulator before running',
    })
  } catch {
    checks.push({ name: 'emulator:running', ok: false, detail: 'adb not responding' })
  }

  let allOk = true
  for (const c of checks) {
    const mark = c.ok ? kleur.green('✓') : kleur.red('✗')
    console.log(`${mark} ${c.name.padEnd(22)} ${kleur.gray(c.detail)}`)
    if (!c.ok) allOk = false
  }

  if (!allOk) {
    console.log(kleur.red('\nDoctor failed — fix prerequisites above before running `e2e run`.'))
    process.exit(1)
  }
  console.log(kleur.green('\nAll checks passed.'))
}
