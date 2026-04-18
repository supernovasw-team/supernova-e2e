import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/terapias renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/terapias')
  await expect(page.getByText('Terapias Guiadas', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'categorias-terapias')
})
