import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test.fixme('/categorias/reports renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/reports')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1500)  // empty/placeholder route — just ensure no crash
  await captureFullPage(page, 'reports')
})
