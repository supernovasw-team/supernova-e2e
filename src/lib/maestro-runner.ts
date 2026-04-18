/**
 * Maestro flow runner for cross-stack scenarios.
 *
 * Wraps the Maestro CLI (`maestro test`) and detects whether an Android
 * emulator is ready via `adb devices`.  Tests that call this should wrap
 * their Maestro steps in a `skipIfNoEmulator` guard so the suite still
 * runs (as `test.fixme`) when the emulator is offline.
 */
import { execa } from 'execa'

export interface MaestroResult {
  ok: boolean
  stdout: string
  stderr: string
}

/**
 * Returns true when at least one ADB device reports as "device" (ready).
 * Returns false if `adb` is not installed or no devices are ready.
 */
export async function isEmulatorReady(): Promise<boolean> {
  try {
    const { stdout } = await execa('adb', ['devices'], { reject: false })
    // Each ready line ends with "\tdevice" (not "offline" / "unauthorized")
    const lines = stdout.split('\n').slice(1) // skip header
    return lines.some((l) => l.trim().endsWith('\tdevice') || l.trim().endsWith(' device'))
  } catch {
    return false
  }
}

/**
 * Run a Maestro flow file.
 *
 * @param opts.flowPath  Absolute path to the .yaml flow file
 * @param opts.env       Extra env vars forwarded as `--env KEY=VALUE` flags
 *
 * Throws if the emulator is not ready — callers should check
 * `isEmulatorReady()` first and use `test.fixme` / `test.skip` accordingly.
 */
export async function runMaestroFlow(opts: {
  flowPath: string
  env?: Record<string, string>
}): Promise<MaestroResult> {
  const ready = await isEmulatorReady()
  if (!ready) {
    throw new Error(
      'No Android emulator detected (adb devices returned no ready device). ' +
      'Start the emulator and Metro, then re-run the cross-stack suite.',
    )
  }

  // Build --env flags
  const envFlags: string[] = []
  const envVars: Record<string, string> = {
    // Let the emulator reach the host-machine backend
    EXPO_PUBLIC_API_BASE_URL: 'http://10.0.2.2:8088',
    ...opts.env,
  }
  for (const [k, v] of Object.entries(envVars)) {
    envFlags.push('--env', `${k}=${v}`)
  }

  const args = ['test', opts.flowPath, ...envFlags]

  const { stdout, stderr, exitCode } = await execa('maestro', args, {
    reject: false,
    // Maestro can take a while on first run; give it 5 minutes
    timeout: 300_000,
  })

  const ok = exitCode === 0
  return { ok, stdout: stdout ?? '', stderr: stderr ?? '' }
}
