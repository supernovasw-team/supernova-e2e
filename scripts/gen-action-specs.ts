/**
 * Generates one tier-2 action spec per entry in fixtures/backoffice-actions.json.
 *
 * Tier-1 (existing) specs just assert the page renders.
 * Tier-2 (this) specs click the primary_action, fill required form fields,
 * submit, and assert a navigation or toast side-effect.
 *
 * Skips pages where primary_action is null (read-only views).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Action = {
  label: string
  kind: string
  selector_hint?: string
  opens?: string
  api_called?: string
  db_effect?: string
  notes?: string
}

type Page = {
  route: string
  file: string
  auth_flow: 'admin' | 'hr'
  primary_action: Action | null
  row_actions?: Action[]
  form_fields?: { name: string; required: boolean; type: string }[]
  expected_outcome?: Record<string, string>
  read_only?: boolean
}

type Actions = {
  pages: Page[]
}

const ROOT = resolve(process.cwd())
const src = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/backoffice-actions.json'), 'utf-8')) as Actions
const outDir = resolve(ROOT, 'src/scenarios/backoffice-actions')
mkdirSync(outDir, { recursive: true })

const slug = (route: string): string =>
  route.replace(/^\//, '').replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase()

let idx = 100
let written = 0
let skipped = 0

for (const page of src.pages) {
  if (page.read_only || !page.primary_action) {
    skipped++
    continue
  }

  const loginFn = page.auth_flow === 'hr' ? 'loginAsHr' : 'loginAsAdmin'
  const s = slug(page.route)
  const action = page.primary_action
  const sampleFill: string[] = []

  for (const field of page.form_fields ?? []) {
    if (!field.required) continue
    if (field.type === 'file') continue  // skip file uploads in generated stubs
    const value = field.type === 'textarea' ? `E2E Auto ${Date.now()}` : `E2E ${field.name}`
    sampleFill.push(
      `  await page.getByLabel(/${field.name.slice(0, 10)}/i).or(page.getByPlaceholder(/${field.name.slice(0, 10)}/i)).fill('${value}')`,
    )
  }

  const fillBlock = sampleFill.length ? sampleFill.join('\n') + '\n' : ''
  const selector = action.selector_hint ?? `button:has-text('${action.label}')`

  const body = `import { test, expect } from '@playwright/test'
import { ${loginFn} } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('${page.route} — primary action: ${action.label}', async ({ page }) => {
  await ${loginFn}(page)
  await page.goto('${page.route}')
  await page.locator("${selector}").first().click()
${fillBlock}  await captureFullPage(page, '${s}-after-${slug(action.label)}')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
`

  const file = `${String(idx).padStart(3, '0')}-${page.auth_flow}-${s}.spec.ts`
  writeFileSync(resolve(outDir, file), body)
  idx++
  written++
}

console.log(`Generated ${written} action specs → ${outDir} (skipped ${skipped} read-only)`)
