import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/terms/versions renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/terms/versions')
  for (const text of ['Terms Versions', 'Nova Versão']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'terms-versions')
})
