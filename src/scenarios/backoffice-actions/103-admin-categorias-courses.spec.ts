import { test } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/courses — primary action: Novo', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/courses')
  // Wait for the page content to actually render — Vite + lazy fetch can
  // leave the screen blank for a second or two on first visit after boot.
  await page.getByRole('heading', { name: /Cursos/i }).waitFor({ timeout: 15_000 })
  await page.locator('button').filter({ hasText: /^(\s*)(Nov[oa]|Criar|Adicionar)/i }).first().click()
  await Promise.race([
    page.locator('input:not([type="hidden"])').first().waitFor({ state: 'visible', timeout: 10_000 }),
    page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 10_000 }),
  ]).catch(() => { /* action may navigate or open modal */ })
  await captureFullPage(page, 'categorias-courses-action')
})
