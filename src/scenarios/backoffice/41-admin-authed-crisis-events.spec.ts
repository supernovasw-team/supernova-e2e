import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/crisis/events renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/crisis/events')
  for (const text of ['Crisis Events']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'crisis-events')
})
