import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/b2b-plan-manager renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/b2b-plan-manager')
  for (const text of ['Planos B2B', 'Novo Plano']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'b2b-plan-manager')
})
