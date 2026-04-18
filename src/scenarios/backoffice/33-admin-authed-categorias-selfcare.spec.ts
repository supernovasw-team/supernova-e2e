import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/selfcare renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/selfcare')
  for (const text of ['Selfcare', 'Novo Selfcare']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'categorias-selfcare')
})
