import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/programas renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/programas')
  for (const text of ['Programas', 'Novo Programa']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'categorias-programas')
})
