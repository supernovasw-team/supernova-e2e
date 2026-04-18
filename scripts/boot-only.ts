import { boot } from '../src/stack/index.js'

async function main(): Promise<void> {
  const stack = await boot({ freshDb: true, captureLogs: true })
  console.log('booted:', await stack.status())
  await new Promise(r => setTimeout(r, 3000))
  console.log('tearing down...')
  await stack.teardown()
  console.log('done')
}

main().catch((e) => {
  console.error('boot failed:', e)
  process.exit(1)
})
