import { execa } from 'execa'
import { config } from '../e2e.config.js'
import { boot } from '../src/stack/index.js'
import { seed } from '../src/stack/seed.js'

async function main(): Promise<void> {
  const stack = await boot({ freshDb: true, captureLogs: true })
  try {
    await seed(config.db.url, config.testUsers)
    console.log('seeded, triggering send-code...')

    const res = await fetch(`${config.urls.backend}/api/auth/admin/send-two-factor-auth-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: config.testUsers.admin.email, password: config.testUsers.admin.password }),
    })
    console.log('send-code status:', res.status, 'body:', (await res.text()).slice(0, 300))

    await new Promise((r) => setTimeout(r, 1500))

    const psqlUrl = config.db.url.split('?')[0]
    const { stdout } = await execa('psql', [
      psqlUrl, '-P', 'pager=off',
      '-c', "SELECT id, type, metadata, created_at FROM tokens ORDER BY created_at DESC LIMIT 5;",
    ])
    console.log('tokens:\n' + stdout)
  } finally {
    await stack.teardown()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
