import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/artigos renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/artigos')
  await expect(page.getByText('Artigos', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'categorias-artigos')
})
