import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/rewards — primary action: Alocar Orçamento', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/rewards')
  await page.locator("button:has-text('Orçamento')").first().click()
  await page.getByLabel(/Orçamento /i).or(page.getByPlaceholder(/Orçamento /i)).fill('E2E Orçamento Anual')
  await captureFullPage(page, 'wellness-rewards-after-alocaroramento')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
