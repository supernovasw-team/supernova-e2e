import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/dashboard renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard')
  for (const text of ['Dashboard', 'Gestão de Conteúdo']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'dashboard')
})
