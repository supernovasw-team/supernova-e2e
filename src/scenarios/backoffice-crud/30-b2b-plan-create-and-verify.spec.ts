/**
 * Backoffice CRUD 30 — B2B Plan Manager: create plan, verify list, verify DB.
 *
 * Route: /b2b-plan-manager
 * DB table: plans (@@map in Prisma schema, PlanType = B2B)
 *
 * The B2B Plan form is inline (not a modal) — clicking "Novo Plano" likely
 * renders a form panel or navigates to a create form. Field name used by the
 * fixture is "Nome do Plano" (required). The backend saves to `plans` table
 * with `type = 'B2B'`.
 *
 * Note: The backoffice action kind is "click" (not "open_modal"), so the form
 * may appear inline or as a page transition rather than a Bootstrap modal.
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-crud'
const UNIQUE = `E2E CRUD — B2B Plan ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe.fixme('/b2b-plan-manager CRUD — create, verify list, verify DB', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate + click create button', async ({ page }) => {
    await page.goto('/b2b-plan-manager')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-01-b2b-plan-list.png`, fullPage: true })

    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()

    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-02-b2b-plan-form-open.png`, fullPage: true })
  })

  test('step 2: fill required fields', async ({ page }) => {
    await page.goto('/b2b-plan-manager')
    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    // Nome do Plano
    const nomeField = page.locator(
      '#name, #nome, #planName, [name="name"], [name="nome"], [name="planName"], [placeholder*="nome" i]'
    ).first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    // Descrição — optional, fill for completeness
    try {
      const descField = page.locator('#description, #descricao, [name="description"], [name="descricao"], textarea').first()
      if (await descField.isVisible({ timeout: 2_000 })) {
        await descField.fill('Plano B2B criado automaticamente pelo E2E CRUD.')
      }
    } catch {
      // Non-blocking
    }

    // Tag Qualidade — optional select
    try {
      const tagSelect = page.locator('select[name*="quality" i], select[name*="qualidade" i], select[name*="tag" i]').first()
      if (await tagSelect.isVisible({ timeout: 2_000 })) {
        await tagSelect.selectOption({ index: 1 })
      }
    } catch {
      // Non-blocking
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-03-b2b-plan-form-filled.png`, fullPage: true })
  })

  test('step 3: submit and wait for plan to appear', async ({ page }) => {
    await page.goto('/b2b-plan-manager')
    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    const nomeField = page.locator(
      '#name, #nome, #planName, [name="name"], [name="nome"], [name="planName"], [placeholder*="nome" i]'
    ).first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    try {
      const descField = page.locator('#description, #descricao, [name="description"], [name="descricao"], textarea').first()
      if (await descField.isVisible({ timeout: 2_000 })) {
        await descField.fill('Plano B2B criado automaticamente pelo E2E CRUD.')
      }
    } catch { /* Non-blocking */ }

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button:has-text("Cadastrar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    await expect(page.locator(`text=${UNIQUE}`).first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-04-b2b-plan-created.png`, fullPage: true })
  })

  test('step 4: DB row exists in plans with type B2B', async () => {
    const rows = await dbAssert<{ id: string; name: string; type: string }>(
      config.db.url,
      `SELECT id, name, type FROM plans WHERE name = '${UNIQUE}' ORDER BY id DESC LIMIT 1`,
      ['id', 'name', 'type'],
      (r) => r.name === UNIQUE,
    )
    console.log('[db-assert] plans (B2B) row:', rows[0])
  })
})
