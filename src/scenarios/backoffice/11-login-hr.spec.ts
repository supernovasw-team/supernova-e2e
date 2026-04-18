import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

// covered by globalSetup — this spec would race on the single live 2FA code
test.fixme('HR login — email + password + 2FA code from DB', async ({ page }) => {
  await loginAsHr(page)
  await expect(page).toHaveURL(/wellness/)
  await captureFullPage(page, '11-login-hr-dashboard')
})
