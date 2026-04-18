import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/audit/age-rejections renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/audit/age-rejections')
  await expect(page.getByText('Age Rejections Audit', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'audit-age-rejections')
})
