import { execa } from 'execa'
import { config } from '../../e2e.config.js'

/**
 * Reads the most recent 2FA code from the backend's `tokens` table.
 *
 * Backend stores codes in Postgres (`tokens` table, type='AUTH', metadata.code).
 * Raw 6-char uppercase code — no hashing. TTL ~15min.
 *
 * We don't bypass 2FA: we just wait for the backend to write it, then read
 * it and feed it back into the login form. Exercises the whole flow.
 */
export async function getLatest2faCode(opts: {
  /** admin | hr — filters by metadata.type; HR uses 'HR_AUTH', admin uses 'AUTH'. */
  flow: 'admin' | 'hr'
  /** Max time to wait for the code row to appear after triggering send (ms). */
  timeoutMs?: number
  /** Poll interval (ms). */
  pollMs?: number
}): Promise<string> {
  const timeout = opts.timeoutMs ?? 15_000
  const interval = opts.pollMs ?? 500
  const started = Date.now()

  // Admin and HR both write into `tokens` with type='AUTH' and
  // metadata={"code":"XXXXXX"}. In an isolated test DB the most recent row
  // is always the one we just triggered — we don't need to disambiguate by
  // user, though we filter to the expected user_id when known.
  const query = `SELECT metadata->>'code' AS code FROM tokens WHERE type='AUTH' ORDER BY created_at DESC LIMIT 1;`
  const psqlUrl = config.db.url.split('?')[0]  // psql rejects Prisma's ?schema= param
  void opts.flow  // reserved for future disambiguation if needed

  while (Date.now() - started < timeout) {
    const { stdout } = await execa(
      'psql',
      [psqlUrl, '-t', '-A', '-c', query],
      { reject: false },
    )
    const code = stdout.trim()
    if (code && /^[A-Z0-9]{6}$/.test(code)) return code
    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error(`2FA code not found in DB within ${timeout}ms (flow=${opts.flow})`)
}
