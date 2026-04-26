import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/settings renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/settings')
  await expect(page.getByRole('heading', { name: /Configura[çc][õo]es/ }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'wellness-settings')
})
