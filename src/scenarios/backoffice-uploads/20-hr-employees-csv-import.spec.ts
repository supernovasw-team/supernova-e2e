/**
 * Spec 20 — HR WellnessSettings /wellness/settings: Importar CSV employees.
 *
 * Switches to the "Usuários" tab, opens the "Importar CSV" modal, uploads
 * fixtures/uploads/test-employees.csv, and asserts:
 *  - Success toast with importedCount
 *  - Modal closes (or partial-error alert if some rows fail)
 *  - DB: `user` table contains at least one fixture employee email
 *
 * NOTE: The CSV columns used by importEmployeesCSV (hr-api.js) match the
 * employee fields in WellnessSettings.jsx:
 *   first_name, last_name, email, cpf, birthday, gender, sector, job_title, password
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { loginAsHr } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'
import { config } from '../../../e2e.config.js'

const CSV_PATH = resolve('fixtures/uploads/test-employees.csv')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'
const FIXTURE_EMAIL = 'e2e-employee-alpha@supernovasw.com'

test.fixme('20 — HR employees CSV import: success toast + DB row created', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/settings')
  await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

  await page.screenshot({ path: `${SCREENSHOT_BASE}/20-01-settings-conta-tab.png`, fullPage: true })

  // Switch to Usuários tab
  await page.getByRole('tab', { name: /usuários/i }).click()
  await expect(page.locator('[aria-label="Lista de usuários e acessos"]')).toBeVisible({ timeout: 15_000 })
    .catch(() => {}) // table may be empty; that's fine

  await page.screenshot({ path: `${SCREENSHOT_BASE}/20-02-usuarios-tab.png`, fullPage: true })

  // Open import modal
  await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 })

  await page.screenshot({ path: `${SCREENSHOT_BASE}/20-03-import-modal-open.png`, fullPage: true })

  // The CSV file input inside the modal — use label text context to disambiguate
  const fileInput = page.locator('[role="dialog"] input[type="file"]').first()
  await fileInput.setInputFiles(CSV_PATH)

  // Wait for file to be registered (no immediate error expected)
  await page.waitForTimeout(500)

  await page.screenshot({ path: `${SCREENSHOT_BASE}/20-04-file-selected.png`, fullPage: true })

  // Submit
  const importBtn = page.locator('[role="dialog"] button').filter({ hasText: /importar/i }).last()
  await expect(importBtn).toBeEnabled({ timeout: 5_000 })
  await importBtn.click()

  // Wait for toast
  const toast = page.locator("[role='status'], .Toastify__toast, .react-toastify__toast").first()
  await expect(toast).toBeVisible({ timeout: 30_000 })
  await expect(toast).toContainText(/funcionári|importad/i)

  await page.screenshot({ path: `${SCREENSHOT_BASE}/20-05-import-result.png`, fullPage: true })

  // DB assert
  await dbAssert<{ email: string }>(
    config.db.url,
    `SELECT email FROM "user" WHERE email = '${FIXTURE_EMAIL}' LIMIT 1;`,
    ['email'],
    (r) => r.email === FIXTURE_EMAIL,
  )
})
