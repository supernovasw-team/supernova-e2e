import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/ranking renders', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/ranking')
  for (const text of ['Ranking', 'Metas']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'wellness-ranking')
})
