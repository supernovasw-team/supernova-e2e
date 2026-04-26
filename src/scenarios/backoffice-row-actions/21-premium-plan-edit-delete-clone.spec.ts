/**
 * Row-action specs — Premium Plan Manager  (/premium-plan-manager)
 * DB table: premium_plans (Prisma @@map may vary — adjust if needed)
 * Covers: edit, delete (+ confirm), clone
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const SEED_NAME = 'E2E Seed — Premium Plan'
const EDIT_SUFFIX = ' EDITED'
const THROWAWAY = `E2E DELETE — Premium Plan ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('/premium-plan-manager row-actions', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page) })

  test('step 1: edit seeded plan and DB-assert name updated', async ({ page }) => {
    await page.goto('/premium-plan-manager')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    const row = page.locator(`tr:has-text("${SEED_NAME}"), [data-testid*="row"]:has-text("${SEED_NAME}"), .plan-card:has-text("${SEED_NAME}")`).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: /editar/i }).click()
    await page.waitForTimeout(600)
    const nomeField = page.locator('[name="name"], #name, input[placeholder*="nome" i]').first()
    await nomeField.fill(SEED_NAME + EDIT_SUFFIX)
    await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
    await page.waitForTimeout(1_000)
    await dbAssert(config.db.url,
      `SELECT name FROM premium_plans WHERE name = '${SEED_NAME}${EDIT_SUFFIX}' LIMIT 1`,
      ['name'], (r) => r.name === SEED_NAME + EDIT_SUFFIX)
    await dbQuery(config.db.url,
      `UPDATE premium_plans SET name = '${SEED_NAME}' WHERE name = '${SEED_NAME}${EDIT_SUFFIX}'`)
  })

  test('step 2: create throwaway plan + delete + DB-assert gone', async ({ page }) => {
    await page.goto('/premium-plan-manager')
    await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
    await page.waitForTimeout(600)
    const nomeField = page.locator('[name="name"], #name, input[placeholder*="nome" i]').first()
    await nomeField.fill(THROWAWAY)
    await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
    await expect(page.locator(`text=${THROWAWAY}`).first()).toBeVisible({ timeout: 20_000 })

    const row = page.locator(`tr:has-text("${THROWAWAY}"), [data-testid*="row"]:has-text("${THROWAWAY}"), .plan-card:has-text("${THROWAWAY}")`).first()
    await row.getByRole('button', { name: /deletar/i }).click()
    await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
    await expect(page.locator(`text=${THROWAWAY}`)).toHaveCount(0, { timeout: 10_000 })

    const rows = await dbQuery(config.db.url,
      `SELECT id FROM premium_plans WHERE name = '${THROWAWAY}' LIMIT 1`)
    expect(rows).toHaveLength(0)
  })

  test('step 3: clone seeded plan and DB-assert new row exists', async ({ page }) => {
    await page.goto('/premium-plan-manager')
    const row = page.locator(`tr:has-text("${SEED_NAME}"), [data-testid*="row"]:has-text("${SEED_NAME}"), .plan-card:has-text("${SEED_NAME}")`).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    const countBefore = await dbQuery(config.db.url,
      `SELECT COUNT(*) FROM premium_plans`)
    await row.getByRole('button', { name: /clonar/i }).click()
    await page.waitForTimeout(1_500)
    const countAfter = await dbQuery(config.db.url,
      `SELECT COUNT(*) FROM premium_plans`)
    expect(Number(countAfter[0]?.['0'])).toBeGreaterThan(Number(countBefore[0]?.['0']))
    // cleanup clone
    await dbQuery(config.db.url,
      `DELETE FROM premium_plans WHERE name ILIKE '%${SEED_NAME}%' AND name != '${SEED_NAME}' AND created_at > NOW() - INTERVAL '5 minutes'`)
  })
})
