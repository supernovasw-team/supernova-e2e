import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/wellness/settings — primary action: Editar', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/settings')
  await page.locator("button:has-text('Editar')").first().click()
  await page.getByLabel(/Razão Soci/i).or(page.getByPlaceholder(/Razão Soci/i)).fill('E2E Razão Social')
  await page.getByLabel(/CNPJ/i).or(page.getByPlaceholder(/CNPJ/i)).fill('E2E CNPJ')
  await page.getByLabel(/Fuso Horár/i).or(page.getByPlaceholder(/Fuso Horár/i)).fill('E2E Fuso Horário')
  await page.getByLabel(/Idioma Pad/i).or(page.getByPlaceholder(/Idioma Pad/i)).fill('E2E Idioma Padrão')
  await captureFullPage(page, 'wellness-settings-after-editar')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
