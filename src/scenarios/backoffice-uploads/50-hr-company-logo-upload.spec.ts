/**
 * Spec 50 — HR WellnessSettings: Company logo upload via ImageUploadTabs modal.
 *
 * Navigates to wellness settings, opens logo upload modal, uploads image, saves.
 * DB assert: plans.company_logo starts with 'data:image/'
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const IMG_PATH = resolve('fixtures/uploads/test-image.png')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'

test.describe.configure({ mode: 'serial' })

test.describe('50 — HR company logo upload', () => {
  test('step 1: load settings page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/rhclub/wellness-settings')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)
    await page.screenshot({ path: `${SCREENSHOT_BASE}/50-01-settings-loaded.png`, fullPage: true })
  })

  test('step 2: upload logo + save + assert DB', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/rhclub/wellness-settings')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)

    // Get first HR plan ID
    const plans = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM "Plan" WHERE type IN ('corporativo', 'trial') ORDER BY id ASC LIMIT 1;`,
    )
    if (plans.length === 0) {
      test.skip(true, 'No HR plan found')
      return
    }
    const planId = plans[0][0]

    // Click Edit to enable form
    const editBtn = page.locator('button:has-text("Editar")').first()
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
      await page.waitForTimeout(500)
    }

    // Open logo upload modal
    const uploadBtn = page.locator('button:has-text("Upload Logo")').first()
    if (await uploadBtn.isVisible().catch(() => false)) {
      await uploadBtn.click()
      const modal = page.locator('[role="dialog"], .modal').first()
      await expect(modal).toBeVisible({ timeout: 10_000 })

      // Upload file via input
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles(IMG_PATH)
      await page.waitForTimeout(500)

      // Close modal
      const closeBtn = page.locator('[role="dialog"] button:has-text("Fechar")').first()
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(500)
    }

    // Save
    const saveBtn = page.locator('button:has-text("Salvar")').first()
    await saveBtn.click({ timeout: 10_000 })

    const toast = page.locator("[role='status'], .Toastify__toast").first()
    await expect(toast).toBeVisible({ timeout: 20_000 })
    await expect(toast).toContainText(/atualiz|sucesso/i)

    // DB assert
    await dbAssert<{ company_logo: string }>(
      config.db.url,
      `SELECT company_logo FROM "Plan" WHERE id = ${planId};`,
      ['company_logo'],
      (r) => typeof r.company_logo === 'string' && r.company_logo.startsWith('data:image/'),
    )
  })
})
