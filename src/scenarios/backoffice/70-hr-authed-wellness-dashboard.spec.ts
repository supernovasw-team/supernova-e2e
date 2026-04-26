import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness-dashboard renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness-dashboard')
  await expect(page.getByRole('heading', { name: /Dashboard de Bem-Estar/ }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'wellness-dashboard')
})
