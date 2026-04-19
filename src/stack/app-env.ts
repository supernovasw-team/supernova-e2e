import { execa } from 'execa'
import { copyFile, readFile, unlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import kleur from 'kleur'

const DEFAULT_PORT = 8088
const EMULATOR_HOST = '10.0.2.2'
const METRO_PORT = 8081
const METRO_BOOT_WAIT_MS = 8_000

/** Detect the LAN IP of the host machine (en0). */
export async function getLanIp(): Promise<string> {
  const { stdout } = await execa('ipconfig', ['getifaddr', 'en0'])
  const ip = stdout.trim()
  if (!ip) throw new Error('Could not determine LAN IP from en0')
  return ip
}

/** Return true if Metro bundler is currently running. */
async function isMetroRunning(): Promise<boolean> {
  try {
    const { stdout } = await execa('pgrep', ['-f', 'expo start'], { reject: false })
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

/** Wait for Metro to bind to its port (poll lsof). Gives up after timeout. */
async function waitForMetro(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const { stdout } = await execa('lsof', [`-ti:${METRO_PORT}`], { reject: false })
      if (stdout.trim().length > 0) return
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

/**
 * Swap `<appPath>/.env.local` to point at the local backend stack, then return
 * a `restore()` function that puts it back.
 *
 * @param appPath   Absolute path to the React Native app repo.
 * @param backendUrl Override the computed backend URL (disables auto-compute).
 * @param useLanIp  Use the host's LAN IP instead of the Android emulator address.
 *
 * @returns `{ restore, didSwap }` — call `restore()` in a `finally` block.
 */
export async function swapToLocal(
  appPath: string,
  backendUrl?: string,
  useLanIp = false,
): Promise<{ restore: () => Promise<void>; didSwap: boolean }> {
  const envPath = join(appPath, '.env.local')
  const backupPath = join(appPath, '.env.local.e2e-backup')

  // --- Determine target URL ---
  let targetUrl: string
  if (backendUrl) {
    targetUrl = backendUrl
  } else if (useLanIp) {
    const ip = await getLanIp()
    targetUrl = `http://${ip}:${DEFAULT_PORT}`
  } else {
    targetUrl = `http://${EMULATOR_HOST}:${DEFAULT_PORT}`
  }

  const newContent = `EXPO_PUBLIC_API_BASE_URL=${targetUrl}\n`

  // --- Idempotency: check current value ---
  const hadExistingEnv = existsSync(envPath)
  if (hadExistingEnv) {
    const current = await readFile(envPath, 'utf8')
    const currentUrl = current.match(/EXPO_PUBLIC_API_BASE_URL=(.+)/)?.[1]?.trim() ?? ''
    if (currentUrl === targetUrl) {
      console.log(kleur.gray(`  ↷ app .env.local already points at ${targetUrl} — skipping swap`))
      return { restore: async () => {}, didSwap: false }
    }
    // Backup existing file
    await copyFile(envPath, backupPath)
  }

  const prevUrl = hadExistingEnv
    ? ((await readFile(backupPath, 'utf8')).match(/EXPO_PUBLIC_API_BASE_URL=(.+)/)?.[1]?.trim() ?? 'unknown')
    : '(none)'

  console.log(kleur.cyan(`\n▶ swapping app .env.local → ${targetUrl} (was ${prevUrl})`))
  await writeFile(envPath, newContent, 'utf8')

  // --- Restart Metro if it was running ---
  const metroWasRunning = await isMetroRunning()
  if (metroWasRunning) {
    console.log(kleur.gray('  ↺ Metro running — killing and restarting with new env'))
    await execa('pkill', ['-f', 'expo start'], { reject: false })
    // Small pause to let the process die
    await new Promise((r) => setTimeout(r, 1_000))
    // Restart Metro in the background (detached)
    execa('npx', ['expo', 'start', '--no-dev', '--minify'], {
      cwd: appPath,
      detached: true,
      stdio: 'ignore',
    }).unref()
    console.log(kleur.gray(`  ⏳ waiting up to ${METRO_BOOT_WAIT_MS / 1000}s for Metro on :${METRO_PORT}`))
    await waitForMetro(METRO_BOOT_WAIT_MS)
    console.log(kleur.gray('  ✓ Metro ready'))
  } else {
    console.log(kleur.gray('  ↷ Metro not running — skipping restart'))
  }

  // --- Build restore function ---
  const restore = async (): Promise<void> => {
    console.log(kleur.cyan('\n▶ restoring app .env.local'))
    if (hadExistingEnv && existsSync(backupPath)) {
      await copyFile(backupPath, envPath)
      await unlink(backupPath)
    } else if (!hadExistingEnv && existsSync(envPath)) {
      // We wrote the file; original state was "no file"
      await unlink(envPath)
    }

    if (metroWasRunning) {
      console.log(kleur.gray('  ↺ restarting Metro with original env'))
      await execa('pkill', ['-f', 'expo start'], { reject: false })
      await new Promise((r) => setTimeout(r, 1_000))
      execa('npx', ['expo', 'start', '--no-dev', '--minify'], {
        cwd: appPath,
        detached: true,
        stdio: 'ignore',
      }).unref()
      await waitForMetro(METRO_BOOT_WAIT_MS)
      console.log(kleur.gray('  ✓ Metro ready'))
    }
    console.log(kleur.gray(`  ✓ app .env.local restored (was: ${prevUrl})`))
  }

  return { restore, didSwap: true }
}
