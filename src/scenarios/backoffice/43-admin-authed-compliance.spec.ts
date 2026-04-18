import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/compliance renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/compliance')
  await expect(page.getByText('Relatório de Conformidade', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'compliance')
})
