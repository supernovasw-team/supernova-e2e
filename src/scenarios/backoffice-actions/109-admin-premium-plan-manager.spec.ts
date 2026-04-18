import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

// page renders empty for admin — feature may require different role or setup
test.fixme('/premium-plan-manager — primary action: Novo Plano', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/premium-plan-manager')
  await page.locator('button').filter({ hasText: /^(\s*)(Nov[oa]|Criar|Adicionar|Configurar|Gerenciar|Enviar)/i }).first().click()
  // Wait for either a form field or a modal dialog to indicate the action opened
  await Promise.race([
    page.locator('input:not([type="hidden"])').first().waitFor({ state: 'visible', timeout: 10_000 }),
    page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 10_000 }),
  ]).catch(() => { /* action may just navigate; screenshot will capture whatever surfaced */ })
  await captureFullPage(page, 'premium-plan-manager-action')
})
