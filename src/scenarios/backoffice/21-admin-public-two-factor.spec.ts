import { test, expect } from '@playwright/test'
import { captureFullPage } from '../../lib/screenshot.js'

test('/login/two-factor renders', async ({ page }) => {
  await page.goto('/login/two-factor')
  for (const text of ['Código de Autenticação', 'Verificar']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'login-two-factor')
})
