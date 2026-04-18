import { test, expect } from '@playwright/test'
import { captureFullPage } from '../../lib/screenshot.js'

test('/rhclub/login renders', async ({ page }) => {
  await page.goto('/rhclub/login')
  for (const text of ['HR Club', 'E-mail']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'rhclub-login')
})
