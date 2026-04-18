import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/slides — primary action: Novo Slide', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/slides')
  await page.locator("button:has-text('Novo Slide')").first().click()
  await page.getByLabel(/Título/i).or(page.getByPlaceholder(/Título/i)).fill('E2E Título')
  await page.getByLabel(/Tipo de Li/i).or(page.getByPlaceholder(/Tipo de Li/i)).fill('E2E Tipo de Link')
  await captureFullPage(page, 'categorias-slides-after-novoslide')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
