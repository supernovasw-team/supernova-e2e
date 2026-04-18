import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/compliance renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/compliance')
  for (const text of ['Relatório de Conformidade']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'compliance')
})
