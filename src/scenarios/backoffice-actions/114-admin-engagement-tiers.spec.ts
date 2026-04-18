import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/tiers — primary action: Novo Nível', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/tiers')
  await page.locator("button:has-text('Novo')").first().click()
  await page.getByLabel(/Nome/i).or(page.getByPlaceholder(/Nome/i)).fill('E2E Nome')
  await page.getByLabel(/Nível/i).or(page.getByPlaceholder(/Nível/i)).fill('E2E Nível')
  await page.getByLabel(/Pontos Mín/i).or(page.getByPlaceholder(/Pontos Mín/i)).fill('E2E Pontos Mínimos')
  await captureFullPage(page, 'engagement-tiers-after-novonvel')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
