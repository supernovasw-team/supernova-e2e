import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/analytics/dashboard renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/analytics/dashboard')
  for (const text of ['Analytics', 'Métricas']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'analytics-dashboard')
})
