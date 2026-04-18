import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/ranking — primary action: Configurações', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/ranking')
  await page.locator("button:has-text('Configurações')").first().click()
  await captureFullPage(page, 'engagement-ranking-after-configuraes')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
