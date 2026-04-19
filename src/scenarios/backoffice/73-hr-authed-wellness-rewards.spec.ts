import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/rewards renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/rewards')
  await expect(page.getByRole('heading', { name: /Gestao de Recompensas/ }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'wellness-rewards')
})
