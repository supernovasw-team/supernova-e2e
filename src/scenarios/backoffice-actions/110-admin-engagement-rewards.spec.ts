import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/rewards — primary action: Nova Recompensa', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/rewards')
  await page.locator("button:has-text('Nova Recompensa')").first().click()
  await page.getByLabel(/Nome/i).or(page.getByPlaceholder(/Nome/i)).fill('E2E Nome')
  await page.getByLabel(/Descrição/i).or(page.getByPlaceholder(/Descrição/i)).fill('E2E Auto 1776533341522')
  await page.getByLabel(/Custo em P/i).or(page.getByPlaceholder(/Custo em P/i)).fill('E2E Custo em Pontos')
  await page.getByLabel(/Categoria/i).or(page.getByPlaceholder(/Categoria/i)).fill('E2E Categoria')
  await captureFullPage(page, 'engagement-rewards-after-novarecompensa')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
