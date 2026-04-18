import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/dashboard renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard')
  await expect(page.getByText('Dashboard', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'dashboard')
})
