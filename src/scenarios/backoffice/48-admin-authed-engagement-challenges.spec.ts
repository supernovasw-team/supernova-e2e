import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/challenges renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/challenges')
  await expect(page.getByText('Desafios', { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await captureFullPage(page, 'engagement-challenges')
})
