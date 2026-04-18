import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/badges renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/badges')
  await expect(page.getByText('Gerenciamento de Badges', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'engagement-badges')
})
