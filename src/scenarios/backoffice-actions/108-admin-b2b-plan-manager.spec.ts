import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/b2b-plan-manager — primary action: Novo Plano', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/b2b-plan-manager')
  await page.locator("button:has-text('Novo Plano')").first().click()
  await page.getByLabel(/Nome do Pl/i).or(page.getByPlaceholder(/Nome do Pl/i)).fill('E2E Nome do Plano')
  await captureFullPage(page, 'b2b-plan-manager-after-novoplano')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
