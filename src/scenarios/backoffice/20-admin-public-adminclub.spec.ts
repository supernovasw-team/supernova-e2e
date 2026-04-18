import { test, expect } from '@playwright/test'
import { captureFullPage } from '../../lib/screenshot.js'

test('/adminclub renders', async ({ page }) => {
  await page.goto('/adminclub')
  for (const text of ['E-mail', 'Senha']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'adminclub')
})
