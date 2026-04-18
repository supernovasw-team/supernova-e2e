import { execa } from 'execa'
import kleur from 'kleur'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from '../../e2e.config.js'
import { boot } from '../stack/index.js'
import { seed } from '../stack/seed.js'
import { extractTextFromAll } from '../post/ocr.js'
import { diffAgainstBaseline } from '../post/visual-diff.js'
import { buildReport } from '../post/report.js'

type Opts = {
  only?: string
  screenshotsOnly?: boolean
  visualRegression?: boolean
  appOnly?: boolean
  backofficeOnly?: boolean
}

function step(label: string): () => void {
  const t0 = Date.now()
  console.log(kleur.cyan(`\n▶ ${label}`))
  return () => console.log(kleur.gray(`  ✓ ${((Date.now() - t0) / 1000).toFixed(1)}s`))
}

export async function run(opts: Opts): Promise<void> {
  const runDir = resolve(process.cwd(), 'runs/history/latest')
  mkdirSync(runDir, { recursive: true })

  let stack: Awaited<ReturnType<typeof boot>> | null = null
  let exitCode = 0

  try {
    // --- PHASE 1: boot ---
    let done = step('boot stack (db + backend + backoffice)')
    stack = await boot({ freshDb: true, captureLogs: true })
    done()

    // --- PHASE 2: seed ---
    done = step('seed fixtures')
    const seeded = await seed(config.db.url, config.testUsers)
    console.log(kleur.gray(`  admin=${seeded.admin.id} hr=${seeded.hrAdmin.id} user=${seeded.endUser.id}`))
    done()

    const st = await stack!.status()

    // --- PHASE 3: backoffice (Playwright) ---
    if (!opts.appOnly) {
      done = step('playwright (backoffice specs)')
      const args = ['playwright', 'test']
      if (opts.only) args.push('--grep', opts.only)
      const pw = await execa('npx', args, {
        reject: false,
        stdio: 'inherit',
        env: { ...process.env, BACKOFFICE_URL: st.backoffice.url },
      })
      done()
      if (pw.exitCode !== 0) exitCode = pw.exitCode ?? 1
    }

    // --- PHASE 4: app (Maestro) ---
    if (!opts.backofficeOnly) {
      done = step('maestro (app flows)')
      const appPath = config.repos.app
      const mae = await execa('maestro', ['test', `${appPath}/.maestro/flows`], {
        reject: false,
        stdio: 'inherit',
        env: {
          ...process.env,
          EXPO_PUBLIC_API_BASE_URL: st.backend.url,
        },
      })
      done()
      if (mae.exitCode !== 0) exitCode = mae.exitCode ?? 1
    }
    // --- PHASE 5: post-processing (OCR + visual-diff) ---
    const screenshotsDir = resolve(process.cwd(), config.screenshots.dir)
    const baselineDir = resolve(screenshotsDir, '_baseline')
    const ocrDir = resolve(process.cwd(), '.artifacts/ocr')
    const diffDir = resolve(process.cwd(), '.artifacts/visual-diff')

    // (a) OCR index
    let ocrCount = 0
    try {
      const doneOcr = step('ocr-index (tesseract)')
      const ocrIndex = await extractTextFromAll(screenshotsDir, ocrDir)
      ocrCount = Object.keys(ocrIndex).length
      doneOcr()
    } catch (err) {
      console.error(kleur.yellow('  ⚠ ocr-index failed:'), err instanceof Error ? err.message : err)
    }

    // (b) visual-diff vs _baseline
    let diffChanged = 0
    let diffAboveThreshold = 0
    try {
      const doneDiff = step('visual-diff vs baseline')
      const diffResults = await diffAgainstBaseline(
        screenshotsDir,
        baselineDir,
        diffDir,
        config.screenshots.visualDiffThreshold,
      )
      diffChanged = diffResults.filter((r) => r.status === 'changed').length
      diffAboveThreshold = diffResults.filter((r) => r.thresholdExceeded).length
      doneDiff()
      if (opts.visualRegression && diffAboveThreshold > 0) {
        console.error(kleur.red(`  ✗ ${diffAboveThreshold} screenshot(s) exceed visual-diff threshold`))
        exitCode = exitCode !== 0 ? exitCode : 1
      }
    } catch (err) {
      console.error(kleur.yellow('  ⚠ visual-diff failed:'), err instanceof Error ? err.message : err)
    }

    console.log(
      kleur.cyan(
        `\n  📊 OCR indexed ${ocrCount} screenshot${ocrCount !== 1 ? 's' : ''}; ` +
        `visual-diff: ${diffChanged} changed (${diffAboveThreshold} above threshold)`,
      ),
    )
  } catch (err) {
    console.error(kleur.red('\n✗ run failed:'), err instanceof Error ? err.message : err)
    exitCode = 1
  } finally {
    if (stack) {
      const done = step('teardown')
      await stack.teardown().catch((e) => console.error(kleur.red('teardown error:'), e))
      done()
    }

    // --- PHASE 6: build HTML report ---
    try {
      const reportPath = await buildReport()
      console.log(kleur.cyan(`\n  📄 Report: ${reportPath}`))
    } catch (err) {
      console.error(kleur.yellow('  ⚠ report build failed:'), err instanceof Error ? err.message : err)
    }
  }

  console.log(exitCode === 0 ? kleur.green('\n✓ run complete') : kleur.red(`\n✗ run failed (exit ${exitCode})`))
  process.exit(exitCode)
}
