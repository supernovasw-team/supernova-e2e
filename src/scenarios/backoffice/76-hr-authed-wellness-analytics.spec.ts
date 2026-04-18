import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/analytics renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/analytics')
  await expect(page.getByText(/An[aá]lises HR/, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'wellness-analytics')
})
