/**
 * Spec 31 — Selfcare edit page: Thumbnail image upload via ContentHeader.
 *
 * Reuses the selfcare created by spec 30 (looks it up by the same UNIQUE_TITLE
 * prefix pattern from the DB).  If no selfcare exists, creates one first.
 *
 * ContentHeader renders <input type="file" id="thumbnail" accept="image/*" className="d-none">
 * DB assertion: selfcares.thumbnail is NOT NULL and starts with 'data:image/'
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const IMG_PATH = resolve('fixtures/uploads/test-image.png')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'
// Use a distinct title so this spec can run standalone too
const UNIQUE_TITLE = `E2E Thumb Upload ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe.fixme('31 — selfcare thumbnail image upload', () => {
  let selfcareId: string

  test('step 1: ensure selfcare exists, navigate to edit', async ({ page }) => {
    await loginAsAdmin(page)

    // Try to reuse any recent E2E selfcare; otherwise create one
    const existing = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM selfcares WHERE name LIKE 'E2E%Upload%' ORDER BY id DESC LIMIT 1;`,
    )

    if (existing.length > 0) {
      selfcareId = existing[0][0]
    } else {
      // Create one
      await page.goto('/categorias/selfcare')
      await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

      await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first().click()
      await page.waitForTimeout(800)

      const nomeField = page.locator('#name').first()
      await nomeField.scrollIntoViewIfNeeded()
      await nomeField.fill(UNIQUE_TITLE)

      const descEditor = page.locator('.ql-editor').first()
      await descEditor.scrollIntoViewIfNeeded()
      await descEditor.click()
      await page.keyboard.type('Thumbnail upload E2E test.')

      const submitBtn = page
        .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
        .last()
      await submitBtn.click({ timeout: 10_000 })

      await expect(page.locator(`text=${UNIQUE_TITLE}`).first()).toBeVisible({ timeout: 20_000 })

      const rows = await dbQuery<Record<string, string>>(
        config.db.url,
        `SELECT id FROM selfcares WHERE name = '${UNIQUE_TITLE}' ORDER BY id DESC LIMIT 1;`,
      )
      selfcareId = rows[0][0]
    }

    await page.goto(`/categorias/selfcare/edit/${selfcareId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)

    await page.screenshot({ path: `${SCREENSHOT_BASE}/31-01-edit-loaded.png`, fullPage: true })
  })

  test('step 2: upload thumbnail + save + assert DB', async ({ page }) => {
    await loginAsAdmin(page)

    // Re-fetch ID (serial steps share process but not page-scoped vars reliably)
    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM selfcares WHERE name LIKE 'E2E%Upload%' ORDER BY id DESC LIMIT 1;`,
    )
    if (rows.length === 0) {
      test.skip(true, 'No E2E selfcare found in DB')
      return
    }
    const id = rows[0][0]

    await page.goto(`/categorias/selfcare/edit/${id}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)

    // Upload thumbnail: <input type="file" id="thumbnail" class="d-none">
    await page.locator('#thumbnail').setInputFiles(IMG_PATH)
    await page.waitForTimeout(500)

    await page.screenshot({ path: `${SCREENSHOT_BASE}/31-02-thumbnail-selected.png`, fullPage: true })

    // Save
    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').first()
    await saveBtn.click({ timeout: 10_000 })

    // Wait for success toast
    const toast = page.locator("[role='status'], .Toastify__toast, .react-toastify__toast").first()
    await expect(toast).toBeVisible({ timeout: 20_000 })
    await expect(toast).toContainText(/selfcare|atualiz/i)

    await page.screenshot({ path: `${SCREENSHOT_BASE}/31-03-save-success.png`, fullPage: true })

    // DB assert
    await dbAssert<{ thumbnail: string }>(
      config.db.url,
      `SELECT thumbnail FROM selfcares WHERE id = ${id};`,
      ['thumbnail'],
      (r) => typeof r.thumbnail === 'string' && r.thumbnail.startsWith('data:image/'),
    )
  })
})
