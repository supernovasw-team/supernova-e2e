import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/tiers renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/tiers')
  await expect(page.getByText('Níveis', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'engagement-tiers')
})
