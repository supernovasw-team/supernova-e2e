import { execa } from 'execa'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

function dbName(url: string): string {
  return new URL(url).pathname.replace(/^\//, '').split('?')[0]
}

function pgArgs(url: string): string[] {
  const u = new URL(url)
  const args: string[] = []
  if (u.hostname) args.push('-h', u.hostname)
  if (u.port) args.push('-p', u.port)
  if (u.username) args.push('-U', u.username)
  return args
}

export async function createTestDatabase(url: string): Promise<void> {
  const name = dbName(url)
  const base = pgArgs(url)
  const { stdout } = await execa('psql', [...base, '-d', 'postgres', '-tAc', `SELECT 1 FROM pg_database WHERE datname='${name}'`], { reject: false })
  if (stdout.trim() !== '1') {
    await execa('createdb', [...base, name])
  }
}

export async function runMigrations(backendPath: string, dbUrl: string): Promise<void> {
  // `db push` syncs schema without migration history — fits test DBs where
  // we don't need auditability. The backend's migration history currently
  // has a broken step (references `plans` table that doesn't exist at that
  // point) so `migrate deploy` fails. `db push` uses the live schema.
  await execa('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
    cwd: backendPath,
    env: { ...process.env, DATABASE_URL: dbUrl },
  })
}

export async function snapshot(dbUrl: string, out: string): Promise<void> {
  mkdirSync(dirname(out), { recursive: true })
  const pw = new URL(dbUrl).password
  await execa('pg_dump', [...pgArgs(dbUrl), '-f', out, dbName(dbUrl)], {
    env: { ...process.env, PGPASSWORD: pw || process.env.PGPASSWORD || '' },
  })
}

export async function restore(dbUrl: string, snapshotPath: string): Promise<void> {
  const u = new URL(dbUrl)
  await execa('psql', [...pgArgs(dbUrl), '-d', dbName(dbUrl), '-f', snapshotPath], {
    env: { ...process.env, PGPASSWORD: u.password || process.env.PGPASSWORD || '' },
  })
}

export async function dropTestDatabase(url: string): Promise<void> {
  const name = dbName(url)
  await execa('dropdb', [...pgArgs(url), '--if-exists', name])
}
