import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/notifications/management renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/notifications/management')
  await expect(page.getByText('Notificações', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'notifications-management')
})
