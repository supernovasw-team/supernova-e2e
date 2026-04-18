import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/reports renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/reports')
  for (const text of ['Relatórios de Conteúdo']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'reports')
})
