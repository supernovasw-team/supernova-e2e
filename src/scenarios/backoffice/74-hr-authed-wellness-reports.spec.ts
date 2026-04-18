import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/reports renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/reports')
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page.getByText(/Relat[oó]rios/).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'wellness-reports')
})
