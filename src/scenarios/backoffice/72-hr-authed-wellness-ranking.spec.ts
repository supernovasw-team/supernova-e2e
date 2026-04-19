import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/ranking renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/ranking')
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page.getByRole('heading', { name: /Ranking/ }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'wellness-ranking')
})
