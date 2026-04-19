/**
 * Spec 46 — Programa edit page: Cover image upload via ContentHeader.
 *
 * Strategy:
 *  1. Create programa, navigate to /categorias/programa/edit/:id
 *  2. Upload test-image.png to <input#cover>
 *  3. Save, assert success toast
 *  4. DB assert: programas.cover starts with 'data:image/'
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const IMG_PATH = resolve('fixtures/uploads/test-image.png')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'
const UNIQUE_TITLE = `E2E Programa Cover ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('46 — programa cover upload', () => {
  test('step 1: create programa + navigate to edit', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/categorias/programa')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

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

    await expect(page.locator(`text=${UNIQUE_TITLE}`).first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_BASE}/46-01-programa-created.png`, fullPage: true })

    const editLink = page.locator(`:has-text("${UNIQUE_TITLE}") a[href*="edit"], :has-text("${UNIQUE_TITLE}") button:has-text("Editar")`)
      .first()
    await expect(editLink).toBeVisible({ timeout: 10_000 })
    await editLink.click()

    await expect(page).toHaveURL(/programa\/edit\/\d+/, { timeout: 15_000 })
    await page.screenshot({ path: `${SCREENSHOT_BASE}/46-02-edit-page.png`, fullPage: true })
  })

  test('step 2: upload cover + save + assert DB', async ({ page }) => {
    await loginAsAdmin(page)

    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM "Programa" WHERE name = '${UNIQUE_TITLE}' ORDER BY id DESC LIMIT 1;`,
    )
    if (rows.length === 0) {
      test.skip(true, 'Programa not found in DB')
      return
    }
    const programaId = rows[0][0]

    await page.goto(`/categorias/programa/edit/${programaId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)

    await page.locator('#cover').setInputFiles(IMG_PATH)
    await page.waitForTimeout(500)

    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').first()
    await saveBtn.click({ timeout: 10_000 })

    const toast = page.locator("[role='status'], .Toastify__toast, .react-toastify__toast").first()
    await expect(toast).toBeVisible({ timeout: 20_000 })
    await expect(toast).toContainText(/programa|atualiz/i)

    await dbAssert<{ cover: string }>(
      config.db.url,
      `SELECT cover FROM "Programa" WHERE id = ${programaId};`,
      ['cover'],
      (r) => typeof r.cover === 'string' && r.cover.startsWith('data:image/'),
    )
  })
})
