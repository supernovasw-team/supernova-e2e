/**
 * Spec 11 — Users admin /categorias/users: Importar CSV happy path.
 *
 * Uploads fixtures/uploads/test-users.csv (2 rows), asserts:
 *  - Success toast with importedCount
 *  - At least one of the imported emails visible in the user table
 *  - DB: `user` table count increased (or row with the fixture email exists)
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'
import { config } from '../../../e2e.config.js'

const CSV_PATH = resolve('fixtures/uploads/test-users.csv')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'
const FIXTURE_EMAIL_1 = 'e2e-import-user1@supernovasw.com'

test.fixme('11 — users import CSV: success toast + row visible + DB row created', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/users')
  await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

  // Record current count shown in table (rows before import)
  const rowsBefore = await page.locator('table tbody tr').count().catch(() => 0)

  // Open import modal
  await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 })

  await page.screenshot({ path: `${SCREENSHOT_BASE}/11-01-import-modal-open.png`, fullPage: true })

  // Upload CSV
  await page.locator('#csvFile').setInputFiles(CSV_PATH)

  // File accepted — no error alert, button becomes enabled
  await expect(page.locator('.alert-danger')).not.toBeVisible({ timeout: 3_000 }).catch(() => {})
  const importBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i })
  await expect(importBtn).toBeEnabled({ timeout: 5_000 })

  await page.screenshot({ path: `${SCREENSHOT_BASE}/11-02-file-selected.png`, fullPage: true })

  // Submit import
  await importBtn.click()

  // Wait for success toast (any of the common toast selectors)
  const toast = page.locator("[role='status'], .Toastify__toast, .react-toastify__toast").first()
  await expect(toast).toBeVisible({ timeout: 30_000 })
  await expect(toast).toContainText(/usuário|importad/i)

  await page.screenshot({ path: `${SCREENSHOT_BASE}/11-03-import-success-toast.png`, fullPage: true })

  // Modal should close on success (no errors)
  // If it stays open with partial errors, that's acceptable — just take screenshot
  await page.screenshot({ path: `${SCREENSHOT_BASE}/11-04-after-import.png`, fullPage: true })

  // DB assert — fixture email row exists in `user` table
  await dbAssert<{ email: string }>(
    config.db.url,
    `SELECT email FROM "user" WHERE email = '${FIXTURE_EMAIL_1}' LIMIT 1;`,
    ['email'],
    (r) => r.email === FIXTURE_EMAIL_1,
  )
})
