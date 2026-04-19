/**
 * Spec 44 — Course edit page: Cover image upload via ContentHeader.
 *
 * Strategy:
 *  1. Create course, navigate to /categorias/courses/edit/:id
 *  2. Upload test-image.png to <input#cover>
 *  3. Save, assert success toast
 *  4. DB assert: courses.cover starts with 'data:image/'
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const IMG_PATH = resolve('fixtures/uploads/test-image.png')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'
const UNIQUE_TITLE = `E2E Course Cover ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('44 — course cover upload', () => {
  test('step 1: create course + navigate to edit', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/categorias/courses')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: /^\s*Novo/i }).first().click()
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
    await page.screenshot({ path: `${SCREENSHOT_BASE}/44-01-course-created.png`, fullPage: true })

    const editLink = page.locator(`tr:has-text("${UNIQUE_TITLE}") a[href*="edit"], tr:has-text("${UNIQUE_TITLE}") button:has-text("Editar")`)
      .first()
    await expect(editLink).toBeVisible({ timeout: 10_000 })
    await editLink.click()

    await expect(page).toHaveURL(/courses\/edit\/\d+/, { timeout: 15_000 })
    await page.screenshot({ path: `${SCREENSHOT_BASE}/44-02-edit-page.png`, fullPage: true })
  })

  test('step 2: upload cover + save + assert DB', async ({ page }) => {
    await loginAsAdmin(page)

    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM "Course" WHERE name = '${UNIQUE_TITLE}' ORDER BY id DESC LIMIT 1;`,
    )
    if (rows.length === 0) {
      test.skip(true, 'Course not found in DB')
      return
    }
    const courseId = rows[0][0]

    await page.goto(`/categorias/courses/edit/${courseId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)

    await page.locator('#cover').setInputFiles(IMG_PATH)
    await page.waitForTimeout(500)

    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').first()
    await saveBtn.click({ timeout: 10_000 })

    const toast = page.locator("[role='status'], .Toastify__toast, .react-toastify__toast").first()
    await expect(toast).toBeVisible({ timeout: 20_000 })
    await expect(toast).toContainText(/course|atualiz/i)

    await dbAssert<{ cover: string }>(
      config.db.url,
      `SELECT cover FROM "Course" WHERE id = ${courseId};`,
      ['cover'],
      (r) => typeof r.cover === 'string' && r.cover.startsWith('data:image/'),
    )
  })
})
