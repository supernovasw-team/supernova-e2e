import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/mood-tracking renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/mood-tracking')
  for (const text of ['Monitoramento de Humor', 'Tendência']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'wellness-mood-tracking')
})
