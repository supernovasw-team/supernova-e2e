import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('HR login — email + password + 2FA code from DB', async ({ page }) => {
  await loginAsHr(page)
  await expect(page).toHaveURL(/wellness/)
  await captureFullPage(page, '11-login-hr-dashboard')
})
