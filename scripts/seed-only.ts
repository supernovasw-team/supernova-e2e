import { config } from '../e2e.config.js'
import { boot } from '../src/stack/index.js'
import { seed } from '../src/stack/seed.js'

async function main(): Promise<void> {
  const stack = await boot({ freshDb: true, captureLogs: true })
  try {
    console.log('seeding...')
    const result = await seed(config.db.url, config.testUsers)
    console.log('seeded:', JSON.stringify(result, null, 2))
  } finally {
    await stack.teardown()
  }
}

main().catch((e) => {
  console.error('seed failed:', e)
  process.exit(1)
})
