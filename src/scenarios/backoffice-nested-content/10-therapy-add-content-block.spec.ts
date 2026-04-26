/**
 * Nested-content 10 — Therapy: add a content block inline.
 *
 * Parent route : /categorias/terapias/edit/:id   (EditTerapia)
 * DB table     : terapias_contents               (@@map in Prisma schema)
 *
 * Seed parent used: "E2E — Ansiedade: introdução" (fixtures/seed-data.json)
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbQuery, dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-nested-content'
const SEED_THERAPY_NAME = 'E2E — Ansiedade: introdução'
const UNIQUE = `E2E Content Block — Therapy ${Date.now()}`
const CONTENT_URL = 'https://example.com/therapy-audio.mp3'

test.describe.configure({ mode: 'serial' })

test.describe('10 — therapy add content block', () => {
  let therapyId: string

  test.beforeAll(async () => {
    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM terapias WHERE name = '${SEED_THERAPY_NAME}' LIMIT 1`,
    )
    if (rows.length === 0) throw new Error(`Seed therapy not found: ${SEED_THERAPY_NAME}`)
    therapyId = rows[0]['0']
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate to therapy edit page', async ({ page }) => {
    await page.goto(`/categorias/terapias/edit/${therapyId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await expect(
      page.locator('h4:has-text("Novo Conteúdo de Terapia"), #contentName').first(),
    ).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-01-therapy-edit.png`, fullPage: true })
  })

  test('step 2: fill and submit add-content form', async ({ page }) => {
    await page.goto(`/categorias/terapias/edit/${therapyId}`)
    await expect(page.locator('#contentName')).toBeVisible({ timeout: 15_000 })

    // Nome
    await page.locator('#contentName').scrollIntoViewIfNeeded()
    await page.locator('#contentName').fill(UNIQUE)

    // URL
    await page.locator('#contentURL').scrollIntoViewIfNeeded()
    await page.locator('#contentURL').fill(CONTENT_URL)

    // Descrição — rich-text (react-quill / TinyMCE)
    const descEditor = page.locator('#contentDescription .ql-editor, [aria-label*="contentDescription"] .ql-editor').first()
    if (await descEditor.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descEditor.click()
      await page.keyboard.type('Bloco de conteúdo criado pelo E2E.')
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-02-therapy-content-filled.png`, fullPage: true })

    // Submit
    const saveBtn = page.getByRole('button', { name: /Salvar Conteúdo/i })
    await saveBtn.scrollIntoViewIfNeeded()
    await saveBtn.click()

    // Toast or new row appears
    await expect(
      page.locator(`text=${UNIQUE}, [role="status"]:has-text("sucesso")`).first(),
    ).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-03-therapy-content-saved.png`, fullPage: true })
  })

  test('step 3: DB row exists in terapias_contents', async () => {
    const rows = await dbAssert<{ id: string; name: string }>(
      config.db.url,
      `SELECT id, name FROM terapias_contents WHERE name = '${UNIQUE}' ORDER BY id DESC LIMIT 1`,
      ['id', 'name'],
      (r) => r.name === UNIQUE,
    )
    console.log('[db-assert] terapias_contents row:', rows[0])
  })
})
