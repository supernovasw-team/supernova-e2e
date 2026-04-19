/**
 * Spec 30 — Selfcare edit page: Cover image upload via ContentHeader.
 *
 * Strategy:
 *  1. Create a new selfcare via the list modal (reuses the pattern from CRUD spec 10)
 *  2. Click the "Editar" row action → navigates to /categorias/selfcare/edit/:id
 *  3. Upload test-image.png to the cover <input#cover> (hidden, unlocked via label)
 *  4. Click Save — assert success toast
 *  5. DB-assert: selfcares.cover is NOT NULL and starts with 'data:image/'
 *
 * ContentHeader renders <input type="file" id="cover" accept="image/*" className="d-none">
 * Playwright's setInputFiles works on hidden inputs — no need to make it visible.
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const IMG_PATH = resolve('fixtures/uploads/test-image.png')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'
const UNIQUE_TITLE = `E2E Cover Upload ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe.fixme('30 — selfcare cover image upload', () => {
  test('step 1: create selfcare + navigate to edit page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/categorias/selfcare')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

    // Create a fresh selfcare
    await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first().click()
    await page.waitForTimeout(800)

    const nomeField = page.locator('#name').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE_TITLE)

    const descEditor = page.locator('.ql-editor').first()
    await descEditor.scrollIntoViewIfNeeded()
    await descEditor.click()
    await page.keyboard.type('Cover upload E2E test.')

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    // Wait for item to appear in list
    await expect(page.locator(`text=${UNIQUE_TITLE}`).first()).toBeVisible({ timeout: 20_000 })

    await page.screenshot({ path: `${SCREENSHOT_BASE}/30-01-selfcare-created.png`, fullPage: true })

    // Click the "Editar" button for our new row — use the row text to scope it
    const editLink = page.locator(`:has-text("${UNIQUE_TITLE}") a[href*="edit"], :has-text("${UNIQUE_TITLE}") button:has-text("Editar")`)
      .first()
    await expect(editLink).toBeVisible({ timeout: 10_000 })
    await editLink.click()

    await expect(page).toHaveURL(/selfcare\/edit\/\d+/, { timeout: 15_000 })
    await page.screenshot({ path: `${SCREENSHOT_BASE}/30-02-edit-page.png`, fullPage: true })
  })

  test('step 2: upload cover image + save + assert DB', async ({ page }) => {
    await loginAsAdmin(page)

    // Get the selfcare id from DB (dbQuery returns positional keys '0','1',…)
    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM selfcares WHERE name = '${UNIQUE_TITLE}' ORDER BY id DESC LIMIT 1;`,
    )
    if (rows.length === 0) {
      test.skip(true, 'Selfcare not found in DB — run step 1 first')
      return
    }
    const selfcareId = rows[0][0]

    await page.goto(`/categorias/selfcare/edit/${selfcareId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    // Wait for content to load (skeleton disappears)
    await page.waitForTimeout(2_000)

    await page.screenshot({ path: `${SCREENSHOT_BASE}/30-03-edit-loaded.png`, fullPage: true })

    // Upload cover: ContentHeader renders <input type="file" id="cover" class="d-none">
    await page.locator('#cover').setInputFiles(IMG_PATH)
    await page.waitForTimeout(500)

    await page.screenshot({ path: `${SCREENSHOT_BASE}/30-04-cover-uploaded-preview.png`, fullPage: true })

    // Save
    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').first()
    await saveBtn.click({ timeout: 10_000 })

    // Wait for success toast
    const toast = page.locator("[role='status'], .Toastify__toast, .react-toastify__toast").first()
    await expect(toast).toBeVisible({ timeout: 20_000 })
    await expect(toast).toContainText(/selfcare|atualiz/i)

    await page.screenshot({ path: `${SCREENSHOT_BASE}/30-05-save-success.png`, fullPage: true })

    // DB assert: cover is non-null and starts with data:image/
    await dbAssert<{ cover: string }>(
      config.db.url,
      `SELECT cover FROM selfcares WHERE id = ${selfcareId};`,
      ['cover'],
      (r) => typeof r.cover === 'string' && r.cover.startsWith('data:image/'),
    )
  })
})
