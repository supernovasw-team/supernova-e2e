import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/analytics renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/analytics')
  for (const text of ['Análises HR', 'Bem-Estar']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'wellness-analytics')
})
