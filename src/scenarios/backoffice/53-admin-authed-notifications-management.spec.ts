import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/notifications/management renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/notifications/management')
  for (const text of ['Notificações']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'notifications-management')
})
