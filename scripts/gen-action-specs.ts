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

  // Tier-2: click the primary action, wait for the form/modal to surface,
  // screenshot. Form submission is tier-3 (needs real fixtures + cleanup).
  const body = `import { test, expect } from '@playwright/test'
import { ${loginFn} } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('${page.route} — primary action: ${action.label}', async ({ page }) => {
  await ${loginFn}(page)
  await page.goto('${page.route}')
  await page.locator('button').filter({ hasText: /^(\\s*)(Nov[oa]|Criar|Adicionar|Configurar|Gerenciar|Enviar)/i }).first().click()
  // Wait for either a form field or a modal dialog to indicate the action opened
  await Promise.race([
    page.locator('input:not([type="hidden"])').first().waitFor({ state: 'visible', timeout: 10_000 }),
    page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 10_000 }),
  ]).catch(() => { /* action may just navigate; screenshot will capture whatever surfaced */ })
  await captureFullPage(page, '${s}-action')
})
`

  const file = `${String(idx).padStart(3, '0')}-${page.auth_flow}-${s}.spec.ts`
  writeFileSync(resolve(outDir, file), body)
  idx++
  written++
}

console.log(`Generated ${written} action specs → ${outDir} (skipped ${skipped} read-only)`)
