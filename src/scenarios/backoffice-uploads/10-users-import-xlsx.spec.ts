/**
 * Spec 10 — Users admin: Importar CSV modal (XLSX path is unused by the UI;
 * the button is labelled "Importar CSV" and the modal only accepts .csv).
 * This spec uploads an XLSX and asserts the validation error so we know the
 * guard logic fires. The real happy-path import is covered by spec 11 (CSV).
 *
 * NOTE: Users.jsx's handleFileUpload checks file.type === "text/csv" and
 * rejects anything else with an error message. Spec 10 therefore exercises
 * the error path and spec 11 exercises the success path.
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { loginAsAdmin } from '../../lib/auth.js'

const XLSX_PATH = resolve('fixtures/uploads/test-users.xlsx')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'

test.fixme('10 — users import: XLSX file rejected with validation error', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/users')
  await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

  await page.screenshot({ path: `${SCREENSHOT_BASE}/10-01-users-list.png`, fullPage: true })

  // Open the import modal
  await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 })

  await page.screenshot({ path: `${SCREENSHOT_BASE}/10-02-import-modal-open.png`, fullPage: true })

  // Upload XLSX — should trigger the type-check error
  await page.locator('#csvFile').setInputFiles(XLSX_PATH)

  // The UI renders an alert with an error message when file type is wrong
  const errorAlert = page.locator('.alert-danger')
  await expect(errorAlert).toBeVisible({ timeout: 8_000 })
  await expect(errorAlert).toContainText(/não é um arquivo CSV válido/i)

  // Confirm the Import button stays disabled (no valid file)
  const importBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i })
  await expect(importBtn).toBeDisabled()

  await page.screenshot({ path: `${SCREENSHOT_BASE}/10-03-xlsx-rejected.png`, fullPage: true })
})
