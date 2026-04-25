/**
 * Thin psql wrapper for DB assertions in cross-stack scenarios.
 *
 * Strips `?schema=` (and other query params) from the URL before passing it
 * to psql — Prisma-style connection strings are not accepted by the CLI.
 */
import { execa } from 'execa'

/** Run a SQL query and return parsed rows (tab-delimited, unaligned mode). */
export async function dbQuery<T extends Record<string, string>>(
  url: string,
  sql: string,
): Promise<T[]> {
  // psql rejects Prisma's `?schema=public` — strip query params entirely.
  const cleanUrl = url.split('?')[0]

  const { stdout, exitCode, stderr } = await execa(
    'psql',
    [cleanUrl, '-t', '-A', '-F', '\t', '-c', sql],
    { reject: false },
  )

  if (exitCode !== 0) {
    throw new Error(`psql exited ${exitCode}: ${stderr}`)
  }

  const lines = stdout
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return []

  // In -t (tuples-only) mode there is no header; caller must know the column
  // order. We expose rows as arrays via the positional keys `0`, `1`, … and
  // also let callers pass a `colNames` to get named keys (see dbAssert below).
  return lines.map((line) => {
    const cols = line.split('\t')
    const obj: Record<string, string> = {}
    cols.forEach((v, i) => { obj[String(i)] = v })
    return obj as T
  })
}

/**
 * Assert at least one row satisfies the predicate; throws on failure.
 *
 * Polls the DB for up to `timeoutMs` (default 3000) before giving up.
 * Necessary because the FE often updates its in-memory list optimistically
 * — the test sees the new item in the UI before the POST round-trip
 * commits to Postgres. Without a poll, dbAssert races and fails ~30% of
 * the time on parallel-worker CRUD specs.
 *
 * @param url        Prisma-style DB URL (query params stripped automatically)
 * @param sql        Raw SQL — SELECT columns exactly as expected
 * @param colNames   Column names in SELECT order (used to map positional cols)
 * @param predicate  Optional guard; if omitted, just asserts rowCount >= 1
 * @param opts       { timeoutMs?: number; pollMs?: number }
 */
export async function dbAssert<T extends Record<string, string>>(
  url: string,
  sql: string,
  colNames: string[],
  predicate?: (row: T) => boolean,
  opts?: { timeoutMs?: number; pollMs?: number },
): Promise<T[]> {
  const timeoutMs = opts?.timeoutMs ?? 3000
  const pollMs = opts?.pollMs ?? 250
  const deadline = Date.now() + timeoutMs

  let lastRows: T[] = []
  let lastError = ''

  while (Date.now() <= deadline) {
    const rawRows = await dbQuery(url, sql)
    const rows = rawRows.map((r) => {
      const named: Record<string, string> = {}
      colNames.forEach((name, i) => { named[name] = r[String(i)] ?? '' })
      return named as T
    })
    lastRows = rows

    if (rows.length === 0) {
      lastError = `query returned 0 rows`
    } else if (predicate) {
      const match = rows.find(predicate)
      if (match) return rows
      lastError = `no row matched predicate. Rows: ${JSON.stringify(rows)}`
    } else {
      return rows
    }

    if (Date.now() + pollMs > deadline) break
    await new Promise((r) => setTimeout(r, pollMs))
  }

  throw new Error(
    `dbAssert: ${lastError} after ${timeoutMs}ms.\nSQL: ${sql}\nLast rows: ${JSON.stringify(lastRows, null, 2)}`,
  )
}
