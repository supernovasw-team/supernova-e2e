/**
 * Row-action specs — Selfcare  (/categorias/selfcare)
 * DB table: selfcares
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const SEED_NAME = 'E2E Seed — Selfcare'
const EDIT_SUFFIX = ' EDITED'
const THROWAWAY = `E2E DELETE — Selfcare ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('/categorias/selfcare row-actions', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page) })

  test('step 1: filter by partial name', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    const search = page.locator('input[placeholder*="nome" i], input[placeholder*="filtrar" i], input[type="search"]').first()
    await expect(search).toBeVisible({ timeout: 10_000 })
    await search.fill(SEED_NAME.slice(0, 8))
    await page.waitForTimeout(600)
    await expect(page.locator(`text=${SEED_NAME}`).first()).toBeVisible({ timeout: 10_000 })
  })

  test('step 2: edit seeded row and DB-assert', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    const row = page.locator(`tr:has-text("${SEED_NAME}"), [data-testid*="row"]:has-text("${SEED_NAME}")`).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: /editar/i }).click()
    await page.waitForURL(/\/selfcare\/\d+|edit/, { timeout: 10_000 })
    const nomeField = page.locator('#name, [name="name"]').first()
    await nomeField.fill(SEED_NAME + EDIT_SUFFIX)
    await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
    await page.waitForTimeout(1_000)
    await dbAssert(config.db.url,
      `SELECT name FROM selfcares WHERE name = '${SEED_NAME}${EDIT_SUFFIX}' LIMIT 1`,
      ['name'], (r) => r.name === SEED_NAME + EDIT_SUFFIX)
    // restore
    await dbQuery(config.db.url,
      `UPDATE selfcares SET name = '${SEED_NAME}' WHERE name = '${SEED_NAME}${EDIT_SUFFIX}'`)
  })

  test('step 3: create throwaway + delete + DB-assert gone', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first().click()
    await page.waitForTimeout(600)
    await page.locator('#name').first().fill(THROWAWAY)
    await page.locator('.ql-editor').first().click()
    await page.keyboard.type('temp')
    await page.locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]').last().click()
    await expect(page.locator(`text=${THROWAWAY}`).first()).toBeVisible({ timeout: 20_000 })

    const row = page.locator(`tr:has-text("${THROWAWAY}"), [data-testid*="row"]:has-text("${THROWAWAY}")`).first()
    await row.getByRole('button', { name: /deletar|excluir/i }).click()
    await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).click()
    await expect(page.locator(`text=${THROWAWAY}`)).toHaveCount(0, { timeout: 10_000 })

    const rows = await dbQuery(config.db.url,
      `SELECT id FROM selfcares WHERE name = '${THROWAWAY}' LIMIT 1`)
    expect(rows).toHaveLength(0)
  })

  test('step 4: reorder top two rows and DB-assert order changed', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    const handles = page.locator('[data-rbd-drag-handle-draggable-id], [draggable="true"]')
    await expect(handles.first()).toBeVisible({ timeout: 15_000 })
    const first = handles.nth(0)
    const second = handles.nth(1)
    const before = await dbQuery(config.db.url,
      `SELECT id, "order" FROM selfcares ORDER BY "order" ASC NULLS LAST LIMIT 2`)
    await first.dragTo(second)
    await page.waitForTimeout(1_000)
    const after = await dbQuery(config.db.url,
      `SELECT id, "order" FROM selfcares ORDER BY "order" ASC NULLS LAST LIMIT 2`)
    // at least one order value must differ
    expect(before[0]['1'] !== after[0]['1'] || before[1]['1'] !== after[1]['1']).toBeTruthy()
  })
})
