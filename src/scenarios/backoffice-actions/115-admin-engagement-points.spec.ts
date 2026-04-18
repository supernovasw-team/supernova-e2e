import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/points — primary action: Regra de Pontos', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/points')
  await page.locator("button:has-text('Regra')").first().click()
  await page.getByLabel(/Ação/i).or(page.getByPlaceholder(/Ação/i)).fill('E2E Ação')
  await page.getByLabel(/Pontos/i).or(page.getByPlaceholder(/Pontos/i)).fill('E2E Pontos')
  await captureFullPage(page, 'engagement-points-after-regradepontos')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
