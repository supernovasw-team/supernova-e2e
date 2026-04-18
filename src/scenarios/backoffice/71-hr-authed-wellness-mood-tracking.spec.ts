import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/mood-tracking renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/mood-tracking')
  await expect(page.getByText('Monitoramento de Humor', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'wellness-mood-tracking')
})
