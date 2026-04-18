import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/premium-plan-manager renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/premium-plan-manager')
  await expect(page.getByText('Planos Premium', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'premium-plan-manager')
})
