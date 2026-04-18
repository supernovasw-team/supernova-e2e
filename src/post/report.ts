/**
 * buildReport() — generates .artifacts/qa-report.html from all post-run artifacts.
 * Gracefully degrades: any missing input source is silently skipped.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
} from 'node:fs'
import { resolve, relative, basename } from 'node:path'
import { execSync } from 'node:child_process'

// ---------------------------------------------------------------------------
// Types — Playwright JSON reporter schema (standard)
// ---------------------------------------------------------------------------

interface PlaywrightAttachment {
  name: string
  path?: string
  contentType?: string
}

interface PlaywrightResult {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'
  duration: number
  error?: { message?: string; stack?: string }
  attachments?: PlaywrightAttachment[]
}

interface PlaywrightTest {
  title: string
  status?: string // suite-level roll-up
  annotations?: Array<{ type: string; description?: string }>
  results: PlaywrightResult[]
}

interface PlaywrightSpec {
  title: string
  file: string
  tests: PlaywrightTest[]
}

interface PlaywrightSuite {
  title: string
  file?: string
  suites?: PlaywrightSuite[]
  specs?: PlaywrightSpec[]
}

interface PlaywrightReport {
  stats?: {
    expected?: number
    unexpected?: number
    flaky?: number
    skipped?: number
  }
  suites?: PlaywrightSuite[]
}

// ---------------------------------------------------------------------------
// Types — Maestro JUnit XML (best-effort parse)
// ---------------------------------------------------------------------------

interface MaestroFlow {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number   // seconds
  error?: string
}

// ---------------------------------------------------------------------------
// Types — internal normalized card
// ---------------------------------------------------------------------------

type Layer = 'backoffice' | 'app' | 'cross-stack' | 'fixme'

interface QaCard {
  layer: Layer
  name: string
  status: 'pass' | 'fail' | 'flaky' | 'fixme' | 'skip'
  duration: number // ms
  screenshotRel?: string      // relative to .artifacts/
  diffRel?: string            // relative to .artifacts/
  ocrText?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = resolve(process.cwd()) // supernova-e2e root
const ARTIFACTS = resolve(ROOT, '.artifacts')
const SCREENSHOTS_BO = resolve(ARTIFACTS, 'screenshots/backoffice')
const SCREENSHOTS_APP = resolve(ARTIFACTS, 'screenshots/app')
const REPORT_PATH = resolve(ARTIFACTS, 'qa-report.html')

function safeReadJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return null
  }
}

function safeReadText(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return null
  }
}

function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ---------------------------------------------------------------------------
// Playwright JSON parsing
// ---------------------------------------------------------------------------

function flattenSpecs(suite: PlaywrightSuite): PlaywrightSpec[] {
  const specs: PlaywrightSpec[] = []
  if (suite.specs) specs.push(...suite.specs)
  if (suite.suites) {
    for (const child of suite.suites) {
      specs.push(...flattenSpecs(child))
    }
  }
  return specs
}

function playwrightStatus(test: PlaywrightTest): 'pass' | 'fail' | 'flaky' | 'fixme' | 'skip' {
  const isFixme = test.annotations?.some((a) => a.type === 'fixme')
  if (isFixme) return 'fixme'
  const results = test.results ?? []
  if (results.length === 0) return 'skip'
  const last = results[results.length - 1]
  if (last.status === 'skipped') return 'skip'
  if (results.length > 1) {
    // More than 1 result means retries — if last passed but earlier failed → flaky
    const anyFail = results.some((r) => r.status !== 'passed' && r.status !== 'skipped')
    if (anyFail && last.status === 'passed') return 'flaky'
  }
  if (last.status === 'passed') return 'pass'
  return 'fail'
}

function parsePlaywright(jsonPath: string): QaCard[] {
  const report = safeReadJson<PlaywrightReport>(jsonPath)
  if (!report) return []

  const cards: QaCard[] = []

  for (const suite of report.suites ?? []) {
    for (const spec of flattenSpecs(suite)) {
      for (const test of spec.tests ?? []) {
        const status = playwrightStatus(test)
        const lastResult = test.results?.[test.results.length - 1]
        const duration = lastResult?.duration ?? 0
        const errorMsg = lastResult?.error?.message?.split('\n')[0]

        // Determine layer from spec file path
        const filePath = spec.file ?? ''
        let layer: Layer = 'backoffice'
        if (filePath.includes('cross-stack')) layer = 'cross-stack'
        if (status === 'fixme') layer = 'fixme'

        // Attempt to find screenshot attachment from results
        let screenshotRel: string | undefined
        for (const result of test.results ?? []) {
          for (const att of result.attachments ?? []) {
            if (att.contentType === 'image/png' && att.path) {
              // Try to find matching file under .artifacts/screenshots/backoffice
              screenshotRel = findScreenshotRel(att.path, att.name)
              if (screenshotRel) break
            }
          }
          if (screenshotRel) break
        }

        cards.push({
          layer,
          name: [spec.title, test.title].filter(Boolean).join(' › '),
          status,
          duration,
          screenshotRel,
          error: errorMsg,
        })
      }
    }
  }

  return cards
}

/**
 * Try to resolve a screenshot path relative to .artifacts/.
 * Playwright stores screenshots under its own output dir; we also look in
 * .artifacts/screenshots/backoffice/ for any matching basename.
 */
function findScreenshotRel(absPath: string, name: string): string | undefined {
  // If the path already exists on disk, make it relative to ARTIFACTS
  if (existsSync(absPath)) {
    try {
      const rel = relative(ARTIFACTS, absPath)
      if (!rel.startsWith('..')) return rel
    } catch {
      // ignore
    }
  }
  // Fallback: look for a file with a similar name in screenshots/backoffice
  const slug = name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  if (existsSync(SCREENSHOTS_BO)) {
    const files = readdirSync(SCREENSHOTS_BO).filter((f) => f.endsWith('.png'))
    const match = files.find((f) => f.toLowerCase().includes(slug))
    if (match) return `screenshots/backoffice/${match}`
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Maestro XML parsing — simple regex-based, no xml2js dep
// ---------------------------------------------------------------------------

function parseMaestro(xmlPath: string): QaCard[] {
  const xml = safeReadText(xmlPath)
  if (!xml) return []

  const cards: QaCard[] = []

  // Match <testcase name="..." time="..." ...> blocks
  const tcRe = /<testcase\b([^>]*)>([\s\S]*?)<\/testcase>|<testcase\b([^>]*)\/>/g
  let m: RegExpExecArray | null
  while ((m = tcRe.exec(xml)) !== null) {
    const attrs = m[1] ?? m[3] ?? ''
    const body = m[2] ?? ''

    const name = attrVal(attrs, 'name') ?? 'unknown'
    const timeStr = attrVal(attrs, 'time')
    const duration = timeStr ? Math.round(parseFloat(timeStr) * 1000) : 0

    // Look for <failure ...> or <error ...> child
    const failureMatch = /<failure\b[^>]*>([\s\S]*?)<\/failure>/.exec(body)
    const errorMatch = /<error\b[^>]*>([\s\S]*?)<\/error>/.exec(body)
    const errorMsg = (failureMatch?.[1] ?? errorMatch?.[1] ?? '').trim().slice(0, 300)
    const status: QaCard['status'] = failureMatch || errorMatch ? 'fail' : 'pass'

    cards.push({
      layer: 'app',
      name,
      status,
      duration,
      error: errorMsg || undefined,
    })
  }

  return cards
}

function attrVal(attrs: string, key: string): string | undefined {
  const re = new RegExp(`${key}="([^"]*)"`)
  return re.exec(attrs)?.[1]
}

// ---------------------------------------------------------------------------
// Copy app screenshots from saude_mental_app root
// ---------------------------------------------------------------------------

function copyAppScreenshots(appRepoRoot: string): void {
  if (!existsSync(appRepoRoot)) return
  mkdirSync(SCREENSHOTS_APP, { recursive: true })
  try {
    const files = readdirSync(appRepoRoot).filter((f) => f.endsWith('.png'))
    for (const f of files) {
      copyFileSync(resolve(appRepoRoot, f), resolve(SCREENSHOTS_APP, f))
    }
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Attach screenshot + OCR + diff data to cards
// ---------------------------------------------------------------------------

function enrichCards(
  cards: QaCard[],
  ocrIndex: Record<string, string>,
  diffIndex: Array<{ path: string; diffRatio?: number; thresholdExceeded?: boolean }>,
): void {
  // Build a lookup: basename → relPath within .artifacts/screenshots/
  const shotMap = buildScreenshotMap()

  for (const card of cards) {
    // Attach screenshot if not already set
    if (!card.screenshotRel) {
      const slug = card.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      card.screenshotRel = shotMap.get(slug) ?? findBestShot(card.name, shotMap)
    }

    // OCR text
    if (card.screenshotRel) {
      const ocrKey = card.screenshotRel.replace(/^screenshots\//, '')
      const ocrText = ocrIndex[ocrKey] ?? ocrIndex[card.screenshotRel]
      if (ocrText) card.ocrText = ocrText.slice(0, 500)
    }

    // Visual diff
    if (card.screenshotRel) {
      const diffKey = card.screenshotRel.replace(/^screenshots\//, '')
      const diffRecord = diffIndex.find((d) => d.path === diffKey)
      if (diffRecord?.thresholdExceeded) {
        card.diffRel = `visual-diff/${diffKey}`
      }
    }
  }
}

function buildScreenshotMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [subdir, prefix] of [
    [SCREENSHOTS_BO, 'screenshots/backoffice'],
    [SCREENSHOTS_APP, 'screenshots/app'],
  ] as Array<[string, string]>) {
    if (!existsSync(subdir)) continue
    try {
      const files = readdirSync(subdir).filter((f) => f.endsWith('.png'))
      for (const f of files) {
        const slug = f.replace(/\.png$/, '').toLowerCase()
        map.set(slug, `${prefix}/${f}`)
      }
    } catch {
      // ignore
    }
  }
  return map
}

function findBestShot(name: string, map: Map<string, string>): string | undefined {
  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  let bestKey: string | undefined
  let bestScore = 0
  for (const [key] of map) {
    const score = words.filter((w) => key.includes(w)).length
    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }
  return bestScore > 0 ? map.get(bestKey!) : undefined
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

interface LayerStats {
  total: number
  pass: number
  fail: number
  flaky: number
  fixme: number
  skip: number
}

function computeStats(cards: QaCard[]): Record<Layer | 'all', LayerStats> {
  const blank = (): LayerStats => ({ total: 0, pass: 0, fail: 0, flaky: 0, fixme: 0, skip: 0 })
  const result: Record<string, LayerStats> = {
    all: blank(),
    backoffice: blank(),
    app: blank(),
    'cross-stack': blank(),
    fixme: blank(),
  }

  for (const card of cards) {
    const l = result[card.layer]
    l.total++
    l[card.status]++
    const a = result['all']
    a.total++
    a[card.status]++
  }

  return result
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function statusBadge(status: QaCard['status']): string {
  const map: Record<QaCard['status'], string> = {
    pass: '🟢 PASS',
    fail: '🔴 FAIL',
    flaky: '🟡 FLAKY',
    fixme: '⚪ FIXME',
    skip: '⬜ SKIP',
  }
  return map[status]
}

function statusClass(status: QaCard['status']): string {
  const map: Record<QaCard['status'], string> = {
    pass: 'pass',
    fail: 'fail',
    flaky: 'flaky',
    fixme: 'fixme',
    skip: 'skip',
  }
  return map[status]
}

function renderStatRow(label: string, s: LayerStats): string {
  return `
    <tr>
      <td class="stat-label">${esc(label)}</td>
      <td class="stat-num">${s.total}</td>
      <td class="stat-num pass">${s.pass}</td>
      <td class="stat-num fail">${s.fail}</td>
      <td class="stat-num flaky">${s.flaky}</td>
      <td class="stat-num fixme">${s.fixme}</td>
      <td class="stat-num skip">${s.skip}</td>
    </tr>`
}

function renderCard(card: QaCard): string {
  const cls = statusClass(card.status)

  let screenshotBlock = ''
  if (card.screenshotRel && existsSync(resolve(ARTIFACTS, card.screenshotRel))) {
    const src = esc(card.screenshotRel)
    screenshotBlock = `<div class="shot-row">`
    screenshotBlock += `<div class="shot-wrap"><img src="${src}" alt="screenshot" loading="lazy"><div class="shot-label">Current</div></div>`
    if (card.diffRel && existsSync(resolve(ARTIFACTS, card.diffRel))) {
      screenshotBlock += `<div class="shot-wrap"><img src="${esc(card.diffRel)}" alt="visual diff" loading="lazy"><div class="shot-label diff-label">Diff</div></div>`
    }
    screenshotBlock += `</div>`
  }

  const ocrBlock = card.ocrText
    ? `<details class="ocr-block"><summary>OCR text</summary><pre>${esc(card.ocrText)}</pre></details>`
    : ''

  const errorBlock = card.error
    ? `<div class="error-msg">${esc(card.error)}</div>`
    : ''

  return `
  <div class="card ${cls}">
    <div class="card-header">
      <span class="card-badge ${cls}">${statusBadge(card.status)}</span>
      <span class="card-dur">${formatDuration(card.duration)}</span>
    </div>
    <div class="card-name">${esc(card.name)}</div>
    ${errorBlock}
    ${screenshotBlock}
    ${ocrBlock}
  </div>`
}

function renderTabPanel(id: string, cards: QaCard[]): string {
  if (cards.length === 0) {
    return `<div class="tab-panel" id="panel-${id}"><p class="empty">No tests recorded for this layer.</p></div>`
  }
  return `<div class="tab-panel" id="panel-${id}">${cards.map(renderCard).join('\n')}</div>`
}

function buildHtml(cards: QaCard[], stats: Record<string, LayerStats>, commit: string): string {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const layers: Array<{ id: Layer; label: string }> = [
    { id: 'backoffice', label: 'Backoffice' },
    { id: 'app', label: 'App (Maestro)' },
    { id: 'cross-stack', label: 'Cross-stack' },
    { id: 'fixme', label: 'Fixmes' },
  ]

  const tabButtons = layers
    .map(
      ({ id, label }) =>
        `<button class="tab-btn" data-panel="panel-${id}" onclick="switchTab(this)">${label} <span class="tab-count">${stats[id]?.total ?? 0}</span></button>`,
    )
    .join('\n')

  const tabPanels = layers
    .map(({ id }) => renderTabPanel(id, cards.filter((c) => c.layer === id)))
    .join('\n')

  const s = stats['all']

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QA Report — SaudeMental.club+</title>
<style>
:root {
  --bg: #0f0f13;
  --surface: #1a1a24;
  --surface2: #222231;
  --border: #2e2e42;
  --text: #e2e2f0;
  --text-muted: #888899;
  --pass: #22c55e;
  --fail: #ef4444;
  --flaky: #f59e0b;
  --fixme: #94a3b8;
  --skip: #64748b;
  --accent: #6366f1;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);padding:24px;min-height:100vh}
a{color:var(--accent)}

/* Header */
.report-header{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 24px;margin-bottom:24px}
.report-title{font-size:22px;font-weight:700;margin-bottom:4px}
.report-meta{font-size:12px;color:var(--text-muted);margin-bottom:16px}
.report-meta strong{color:var(--text)}

/* Summary table */
.summary-table{width:100%;border-collapse:collapse;font-size:13px}
.summary-table th{text-align:left;padding:6px 10px;color:var(--text-muted);border-bottom:1px solid var(--border)}
.summary-table td{padding:6px 10px;border-bottom:1px solid var(--border)}
.stat-label{font-weight:600}
.stat-num{text-align:right;font-variant-numeric:tabular-nums}
.stat-num.pass{color:var(--pass)}
.stat-num.fail{color:var(--fail)}
.stat-num.flaky{color:var(--flaky)}
.stat-num.fixme{color:var(--fixme)}
.stat-num.skip{color:var(--skip)}

/* Tabs */
.tabs{display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap}
.tab-btn{background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;transition:all .15s}
.tab-btn:hover{border-color:var(--accent);color:var(--text)}
.tab-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
.tab-count{font-size:11px;opacity:.75;margin-left:4px}

/* Grid */
.tab-panel{display:none;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.tab-panel.visible{display:grid}
.empty{color:var(--text-muted);font-size:13px;padding:24px 0}

/* Card */
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;border-left:3px solid var(--border)}
.card.pass{border-left-color:var(--pass)}
.card.fail{border-left-color:var(--fail)}
.card.flaky{border-left-color:var(--flaky)}
.card.fixme{border-left-color:var(--fixme)}
.card.skip{border-left-color:var(--skip)}

.card-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)}
.card-badge{font-size:12px;font-weight:700}
.card-badge.pass{color:var(--pass)}
.card-badge.fail{color:var(--fail)}
.card-badge.flaky{color:var(--flaky)}
.card-badge.fixme{color:var(--fixme)}
.card-badge.skip{color:var(--skip)}
.card-dur{font-size:11px;color:var(--text-muted)}
.card-name{padding:8px 14px;font-size:12px;color:var(--text-muted);line-height:1.4;word-break:break-word}

.error-msg{margin:0 14px 8px;padding:8px;background:#2a1515;border:1px solid #4a2020;border-radius:6px;font-family:monospace;font-size:11px;color:#fca5a5;word-break:break-all}

/* Screenshots */
.shot-row{display:flex;gap:8px;padding:10px 14px;background:var(--surface2);border-top:1px solid var(--border)}
.shot-wrap{flex:1;min-width:0;text-align:center}
.shot-wrap img{max-width:100%;max-height:320px;object-fit:contain;border-radius:4px;background:#000}
.shot-label{font-size:10px;color:var(--text-muted);margin-top:4px}
.diff-label{color:var(--flaky)}

/* OCR */
.ocr-block{padding:8px 14px;border-top:1px solid var(--border)}
.ocr-block summary{font-size:11px;color:var(--text-muted);cursor:pointer;user-select:none}
.ocr-block summary:hover{color:var(--text)}
.ocr-block pre{margin-top:6px;font-size:10px;white-space:pre-wrap;word-break:break-word;color:var(--text-muted);max-height:120px;overflow-y:auto;background:var(--surface2);padding:8px;border-radius:4px}
</style>
</head>
<body>

<div class="report-header">
  <div class="report-title">SaudeMental.club+ QA Report</div>
  <div class="report-meta">
    Generated: <strong>${ts}</strong> &nbsp;·&nbsp;
    Commit: <strong>${esc(commit)}</strong> &nbsp;·&nbsp;
    Total: <strong>${s.total}</strong>
    &nbsp; 🟢 ${s.pass} &nbsp; 🔴 ${s.fail} &nbsp; 🟡 ${s.flaky} &nbsp; ⚪ ${s.fixme} &nbsp; ⬜ ${s.skip}
  </div>

  <table class="summary-table">
    <thead>
      <tr>
        <th>Layer</th><th style="text-align:right">Total</th><th style="text-align:right">Pass</th>
        <th style="text-align:right">Fail</th><th style="text-align:right">Flaky</th>
        <th style="text-align:right">Fixme</th><th style="text-align:right">Skip</th>
      </tr>
    </thead>
    <tbody>
      ${renderStatRow('All', stats['all'])}
      ${renderStatRow('Backoffice', stats['backoffice'])}
      ${renderStatRow('App (Maestro)', stats['app'])}
      ${renderStatRow('Cross-stack', stats['cross-stack'])}
      ${renderStatRow('Fixmes', stats['fixme'])}
    </tbody>
  </table>
</div>

<div class="tabs">
${tabButtons}
</div>

${tabPanels}

<script>
function switchTab(btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('visible'))
  btn.classList.add('active')
  const panel = document.getElementById(btn.dataset.panel)
  if (panel) panel.classList.add('visible')
}
// Activate first tab with content
(function() {
  const panels = document.querySelectorAll('.tab-panel')
  const btns = document.querySelectorAll('.tab-btn')
  for (let i = 0; i < panels.length; i++) {
    const isEmpty = panels[i].querySelector('.empty')
    if (!isEmpty) {
      btns[i].classList.add('active')
      panels[i].classList.add('visible')
      return
    }
  }
  // fallback: first tab
  if (btns[0]) btns[0].classList.add('active')
  if (panels[0]) panels[0].classList.add('visible')
})()
</script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function buildReport(): Promise<string> {
  mkdirSync(ARTIFACTS, { recursive: true })

  // --- Dynamic config import (avoid circular dep issues at build time) ---
  let appRepoRoot: string
  try {
    const { config } = await import('../../e2e.config.js')
    appRepoRoot = config.repos.app
  } catch {
    appRepoRoot = resolve(process.env.HOME ?? '', 'Documents/supernova/saude_mental_app')
  }

  // 1. Copy app screenshots into .artifacts/screenshots/app/
  copyAppScreenshots(appRepoRoot)

  // 2. Parse Playwright JSON
  const pwJsonPath = resolve(ROOT, 'runs/history/latest/playwright.json')
  const pwCards = parsePlaywright(pwJsonPath)

  // 3. Parse Maestro XML
  const maestroXmlPath = resolve(appRepoRoot, '.maestro/artifacts/report.xml')
  const appCards = parseMaestro(maestroXmlPath)

  // 4. Load OCR index
  const ocrIndex: Record<string, string> =
    safeReadJson<Record<string, string>>(resolve(ARTIFACTS, 'ocr/index.json')) ?? {}

  // 5. Load visual-diff index
  const diffIndex: Array<{ path: string; diffRatio?: number; thresholdExceeded?: boolean }> =
    safeReadJson(resolve(ARTIFACTS, 'visual-diff/index.json')) ?? []

  // 6. Merge all cards — fixme cards from Playwright are already layer=fixme
  //    App cards don't have fixme annotation, keep them as-is.
  const allCards: QaCard[] = [...pwCards, ...appCards]

  // 7. Enrich with screenshots, OCR, diffs
  enrichCards(allCards, ocrIndex, diffIndex)

  // 8. Compute stats
  const stats = computeStats(allCards)

  // 9. Git commit
  const commit = gitCommit()

  // 10. Render HTML
  const html = buildHtml(allCards, stats, commit)
  writeFileSync(REPORT_PATH, html, 'utf-8')

  return REPORT_PATH
}
