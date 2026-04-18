import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/engagement/challenges — primary action: Novo Desafio', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/engagement/challenges')
  await page.locator("button:has-text('Novo')").first().click()
  await page.getByLabel(/Título/i).or(page.getByPlaceholder(/Título/i)).fill('E2E Título')
  await page.getByLabel(/Descrição/i).or(page.getByPlaceholder(/Descrição/i)).fill('E2E Auto 1776533341522')
  await page.getByLabel(/Tipo de De/i).or(page.getByPlaceholder(/Tipo de De/i)).fill('E2E Tipo de Desafio')
  await page.getByLabel(/Data de In/i).or(page.getByPlaceholder(/Data de In/i)).fill('E2E Data de Início')
  await page.getByLabel(/Data de Fi/i).or(page.getByPlaceholder(/Data de Fi/i)).fill('E2E Data de Fim')
  await page.getByLabel(/Pontos de /i).or(page.getByPlaceholder(/Pontos de /i)).fill('E2E Pontos de Recompensa')
  await page.getByLabel(/Valor Alvo/i).or(page.getByPlaceholder(/Valor Alvo/i)).fill('E2E Valor Alvo')
  await captureFullPage(page, 'engagement-challenges-after-novodesafio')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
