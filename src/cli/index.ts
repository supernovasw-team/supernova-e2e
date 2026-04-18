#!/usr/bin/env node
import { Command } from 'commander'
import kleur from 'kleur'

const program = new Command()
program
  .name('e2e')
  .description('Supernova full-stack E2E regression suite')
  .version('0.1.0')

program
  .command('doctor')
  .description('Verify prerequisites (sibling repos, postgres, emulator, maestro)')
  .action(async () => {
    const { doctor } = await import('./doctor.js')
    await doctor()
  })

program
  .command('run')
  .description('Boot stack, seed, run all scenarios, teardown, report')
  .option('--only <scenario>', 'run a single scenario by name')
  .option('--screenshots-only', 'navigate + capture, skip deep asserts')
  .option('--visual-regression', 'compare screenshots with baseline, fail on diff')
  .option('--app-only', 'run only the Maestro app flows')
  .option('--backoffice-only', 'run only the Playwright backoffice specs')
  .action(async (opts) => {
    const { run } = await import('./run.js')
    await run(opts)
  })

program
  .command('report')
  .description('Open the latest HTML report')
  .option('--open', 'open in default browser', false)
  .action(async (opts) => {
    const { report } = await import('./report.js')
    await report(opts)
  })

program
  .command('baseline')
  .description('Manage visual-regression baseline')
  .argument('<action>', 'update | clear')
  .action(async (action) => {
    const { baseline } = await import('./baseline.js')
    await baseline(action)
  })

program
  .command('ocr-index')
  .description('Run tesseract on all screenshots, write text index to .artifacts/ocr/')
  .action(async () => {
    const { ocrIndex } = await import('./ocr-index.js')
    await ocrIndex()
  })

program.parseAsync(process.argv).catch((err) => {
  console.error(kleur.red('fatal:'), err instanceof Error ? err.message : err)
  process.exit(1)
})
