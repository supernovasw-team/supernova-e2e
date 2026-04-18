import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/users — primary action: Novo Usuário', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/users')
  await page.locator("button:has-text('Novo')").first().click()
  await page.getByLabel(/Primeiro N/i).or(page.getByPlaceholder(/Primeiro N/i)).fill('E2E Primeiro Nome')
  await page.getByLabel(/Último Nom/i).or(page.getByPlaceholder(/Último Nom/i)).fill('E2E Último Nome')
  await page.getByLabel(/Email/i).or(page.getByPlaceholder(/Email/i)).fill('E2E Email')
  await page.getByLabel(/CPF/i).or(page.getByPlaceholder(/CPF/i)).fill('E2E CPF')
  await page.getByLabel(/Senha/i).or(page.getByPlaceholder(/Senha/i)).fill('E2E Senha')
  await captureFullPage(page, 'categorias-users-after-novousurio')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
