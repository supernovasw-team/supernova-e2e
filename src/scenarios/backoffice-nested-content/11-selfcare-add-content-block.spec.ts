/**
 * Nested-content 11 — Selfcare: add a content block inline.
 *
 * Parent route : /categorias/selfcare/edit/:id   (EditSelfcare)
 * DB table     : selfcare_contents               (@@map in Prisma schema)
 *
 * Seed parent used: "E2E — Respiração 5min" (fixtures/seed-data.json)
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbQuery, dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-nested-content'
const SEED_SELFCARE_NAME = 'E2E — Respiração 5min'
const UNIQUE = `E2E Content Block — Selfcare ${Date.now()}`
const CONTENT_URL = 'https://example.com/selfcare-audio.mp3'

test.describe.configure({ mode: 'serial' })

test.describe('11 — selfcare add content block', () => {
  let selfcareId: string

  test.beforeAll(async () => {
    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM selfcares WHERE name = '${SEED_SELFCARE_NAME}' LIMIT 1`,
    )
    if (rows.length === 0) throw new Error(`Seed selfcare not found: ${SEED_SELFCARE_NAME}`)
    selfcareId = rows[0]['0']
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate to selfcare edit page', async ({ page }) => {
    await page.goto(`/categorias/selfcare/edit/${selfcareId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await expect(
      page.locator('h4:has-text("Novo Conteúdo de Selfcare"), #contentName').first(),
    ).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-01-selfcare-edit.png`, fullPage: true })
  })

  test('step 2: fill and submit add-content form', async ({ page }) => {
    await page.goto(`/categorias/selfcare/edit/${selfcareId}`)
    await expect(page.locator('#contentName')).toBeVisible({ timeout: 15_000 })

    // Nome
    await page.locator('#contentName').scrollIntoViewIfNeeded()
    await page.locator('#contentName').fill(UNIQUE)

    // URL
    await page.locator('#contentURL').scrollIntoViewIfNeeded()
    await page.locator('#contentURL').fill(CONTENT_URL)

    // Descrição — rich-text (react-quill / TinyMCE), best-effort
    const descEditor = page.locator('#contentDescription .ql-editor, [aria-label*="contentDescription"] .ql-editor').first()
    if (await descEditor.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descEditor.click()
      await page.keyboard.type('Bloco de conteúdo criado pelo E2E.')
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-02-selfcare-content-filled.png`, fullPage: true })

    // Submit
    const saveBtn = page.getByRole('button', { name: /Salvar Conteúdo/i })
    await saveBtn.scrollIntoViewIfNeeded()
    await saveBtn.click()

    // Toast or new row visible
    await expect(
      page.locator(`text=${UNIQUE}, [role="status"]:has-text("sucesso")`).first(),
    ).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-03-selfcare-content-saved.png`, fullPage: true })
  })

  test('step 3: DB row exists in selfcare_contents', async () => {
    const rows = await dbAssert<{ id: string; name: string }>(
      config.db.url,
      `SELECT id, name FROM selfcare_contents WHERE name = '${UNIQUE}' ORDER BY id DESC LIMIT 1`,
      ['id', 'name'],
      (r) => r.name === UNIQUE,
    )
    console.log('[db-assert] selfcare_contents row:', rows[0])
  })
})
