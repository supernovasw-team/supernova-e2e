import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/terapias — primary action: Novo', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/terapias')
  await page.locator("button:has-text('Novo')").first().click()
  await page.getByLabel(/Nome/i).or(page.getByPlaceholder(/Nome/i)).fill('E2E Nome')
  await page.getByLabel(/Descrição/i).or(page.getByPlaceholder(/Descrição/i)).fill('E2E Auto 1776533341521')
  await captureFullPage(page, 'categorias-terapias-after-novo')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
