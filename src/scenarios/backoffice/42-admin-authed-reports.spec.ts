import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/reports renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/reports')
  await expect(page.getByText('Relatórios de Conteúdo', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'reports')
})
