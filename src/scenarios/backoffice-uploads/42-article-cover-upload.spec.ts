/**
 * Spec 42 — Article edit page: Cover image upload via ContentHeader.
 *
 * Strategy:
 *  1. Create article, navigate to /categorias/artigos/edit/:id
 *  2. Upload test-image.png to <input#cover>
 *  3. Save, assert success toast
 *  4. DB assert: artigos.cover starts with 'data:image/'
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const IMG_PATH = resolve('fixtures/uploads/test-image.png')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'
const UNIQUE_TITLE = `E2E Article Cover ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('42 — article cover upload', () => {
  test('step 1: create article + navigate to edit', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/categorias/artigos')
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
    await page.screenshot({ path: `${SCREENSHOT_BASE}/42-01-article-created.png`, fullPage: true })

    const editLink = page.locator(`:has-text("${UNIQUE_TITLE}") a[href*="edit"], :has-text("${UNIQUE_TITLE}") button:has-text("Editar")`)
      .first()
    await expect(editLink).toBeVisible({ timeout: 10_000 })
    await editLink.click()

    await expect(page).toHaveURL(/artigos\/edit\/\d+/, { timeout: 15_000 })
    await page.screenshot({ path: `${SCREENSHOT_BASE}/42-02-edit-page.png`, fullPage: true })
  })

  test('step 2: upload cover + save + assert DB', async ({ page }) => {
    await loginAsAdmin(page)

    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM artigo WHERE name = '${UNIQUE_TITLE}' ORDER BY id DESC LIMIT 1;`,
    )
    if (rows.length === 0) {
      test.skip(true, 'Article not found in DB')
      return
    }
    const articleId = rows[0][0]

    await page.goto(`/categorias/artigos/edit/${articleId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)

    await page.locator('#cover').setInputFiles(IMG_PATH)
    await page.waitForTimeout(500)

    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').first()
    await saveBtn.click({ timeout: 10_000 })

    const toast = page.locator("[role='status'], .Toastify__toast, .react-toastify__toast").first()
    await expect(toast).toBeVisible({ timeout: 20_000 })
    await expect(toast).toContainText(/artigo|atualiz/i)

    await dbAssert<{ cover: string }>(
      config.db.url,
      `SELECT cover FROM artigo WHERE id = ${articleId};`,
      ['cover'],
      (r) => typeof r.cover === 'string' && r.cover.startsWith('data:image/'),
    )
  })
})
