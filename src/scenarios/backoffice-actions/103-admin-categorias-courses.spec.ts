import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/courses — primary action: Novo', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/courses')
  await page.locator("button:has-text('Novo')").first().click()
  await page.getByLabel(/Nome/i).or(page.getByPlaceholder(/Nome/i)).fill('E2E Nome')
  await page.getByLabel(/Descrição/i).or(page.getByPlaceholder(/Descrição/i)).fill('E2E Auto 1776533341522')
  await captureFullPage(page, 'categorias-courses-after-novo')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
