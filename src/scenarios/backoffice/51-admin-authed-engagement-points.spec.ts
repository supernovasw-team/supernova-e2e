import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/points renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/points')
  await expect(page.getByText('Pontos', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'engagement-points')
})
