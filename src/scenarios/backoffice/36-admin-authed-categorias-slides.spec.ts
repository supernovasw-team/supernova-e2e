import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/slides renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/slides')
  await expect(page.getByText('Slides', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'categorias-slides')
})
