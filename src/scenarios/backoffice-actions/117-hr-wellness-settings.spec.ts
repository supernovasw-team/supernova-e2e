import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

// Settings is inline form, no primary action button on default Conta tab
test.fixme('/wellness/settings — primary action: Editar', async ({ page }) => {
  await loginAsHr(page)
  await page.goto('/wellness/settings')
  await page.locator('button').filter({ hasText: /^(\s*)(Editar|Nov[oa]|Criar|Adicionar|Configurar|Gerenciar|Salvar|Enviar)/i }).first().click()
  // Wait for either a form field or a modal dialog to indicate the action opened
  await Promise.race([
    page.locator('input:not([type="hidden"])').first().waitFor({ state: 'visible', timeout: 10_000 }),
    page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 10_000 }),
  ]).catch(() => { /* action may just navigate; screenshot will capture whatever surfaced */ })
  await captureFullPage(page, 'wellness-settings-action')
})
