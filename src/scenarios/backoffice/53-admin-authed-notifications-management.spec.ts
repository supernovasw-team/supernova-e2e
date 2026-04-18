import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test.fixme('/notifications/management renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/notifications/management')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1500)  // empty/placeholder route — just ensure no crash
  await captureFullPage(page, 'notifications-management')
})
