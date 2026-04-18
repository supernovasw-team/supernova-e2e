import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/badges — primary action: Novo Distintivo', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/badges')
  await page.locator("button:has-text('Novo')").first().click()
  await page.getByLabel(/Nome/i).or(page.getByPlaceholder(/Nome/i)).fill('E2E Nome')
  await page.getByLabel(/Descrição/i).or(page.getByPlaceholder(/Descrição/i)).fill('E2E Auto 1776533341522')
  await page.getByLabel(/Critérios/i).or(page.getByPlaceholder(/Critérios/i)).fill('E2E Critérios')
  await page.getByLabel(/Raridade/i).or(page.getByPlaceholder(/Raridade/i)).fill('E2E Raridade')
  await captureFullPage(page, 'engagement-badges-after-novodistintivo')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
