import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/rewards renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/rewards')
  for (const text of ['Recompensas', 'Nova Recompensa']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'engagement-rewards')
})
