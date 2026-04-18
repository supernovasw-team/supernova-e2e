import { test, expect } from '@playwright/test'

test('backoffice is reachable', async ({ page }) => {
  await page.goto('/adminclub')
  await expect(page).toHaveTitle(/.+/)
  await page.screenshot({
    path: '.artifacts/screenshots/backoffice/00-smoke-login.png',
    fullPage: true,
  })
})
