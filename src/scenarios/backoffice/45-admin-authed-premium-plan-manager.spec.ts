import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/premium-plan-manager renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/premium-plan-manager')
  for (const text of ['Planos Premium', 'Novo Plano']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'premium-plan-manager')
})
