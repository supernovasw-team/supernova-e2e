import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/users renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/users')
  for (const text of ['Usuários', 'Novo Usuário']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'categorias-users')
})
