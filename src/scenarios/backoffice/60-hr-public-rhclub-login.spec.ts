import { test, expect } from '@playwright/test'
import { captureFullPage } from '../../lib/screenshot.js'

test('/rhclub/login renders', async ({ page }) => {
  await page.goto('/rhclub/login')
  await expect(page.getByText('RH Club', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'rhclub-login')
})
