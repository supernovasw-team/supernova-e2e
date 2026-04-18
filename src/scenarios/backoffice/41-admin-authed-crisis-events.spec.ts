import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/crisis/events renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/crisis/events')
  await expect(page.getByText('Crisis Events', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'crisis-events')
})
