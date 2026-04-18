import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('admin login — email + password + 2FA code from DB', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page).toHaveURL(/dashboard/)
  await captureFullPage(page, '10-login-admin-dashboard')
})
