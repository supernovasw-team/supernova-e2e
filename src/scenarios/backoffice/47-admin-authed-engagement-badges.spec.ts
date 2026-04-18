import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/badges renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/badges')
  for (const text of ['Distintivos', 'Novo Distintivo']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'engagement-badges')
})
