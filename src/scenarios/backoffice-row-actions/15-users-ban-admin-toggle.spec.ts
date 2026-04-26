/**
 * Row-action specs — Users  (/categorias/users)
 * DB table: users
 * Covers: ban/unban, toggle admin, toggle can_create_content, filter by name
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const SEED_EMAIL = 'e2e-seed-user@test.com'

test.describe.configure({ mode: 'serial' })

test.describe('/categorias/users row-actions', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page) })

  test('step 1: filter by partial name', async ({ page }) => {
    await page.goto('/categorias/users')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    const search = page.locator('input[placeholder*="nome" i], input[placeholder*="filtrar" i], input[type="search"]').first()
    await expect(search).toBeVisible({ timeout: 10_000 })
    await search.fill('E2E Seed')
    await page.waitForTimeout(600)
    await expect(page.locator(`text=${SEED_EMAIL}`).first()).toBeVisible({ timeout: 10_000 })
  })

  test('step 2: ban seed user then DB-assert banned=true', async ({ page }) => {
    await page.goto('/categorias/users')
    const row = page.locator(`tr:has-text("${SEED_EMAIL}"), [data-testid*="row"]:has-text("${SEED_EMAIL}")`).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: /banir/i }).click()
    await page.waitForTimeout(800)
    // DB: users table uses `banned` boolean column
    await dbAssert(config.db.url,
      `SELECT banned FROM users WHERE email = '${SEED_EMAIL}' LIMIT 1`,
      ['banned'], (r) => r.banned === 'true' || r.banned === 't')
  })

  test('step 3: unban seed user then DB-assert banned=false', async ({ page }) => {
    await page.goto('/categorias/users')
    const row = page.locator(`tr:has-text("${SEED_EMAIL}"), [data-testid*="row"]:has-text("${SEED_EMAIL}")`).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: /desbanir/i }).click()
    await page.waitForTimeout(800)
    await dbAssert(config.db.url,
      `SELECT banned FROM users WHERE email = '${SEED_EMAIL}' LIMIT 1`,
      ['banned'], (r) => r.banned === 'false' || r.banned === 'f')
  })

  test('step 4: toggle admin checkbox and DB-assert flipped', async ({ page }) => {
    await page.goto('/categorias/users')
    const row = page.locator(`tr:has-text("${SEED_EMAIL}"), [data-testid*="row"]:has-text("${SEED_EMAIL}")`).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    const before = await dbQuery(config.db.url,
      `SELECT admin FROM users WHERE email = '${SEED_EMAIL}' LIMIT 1`)
    const wasBefore = before[0]?.['0']
    await row.locator('input[type="checkbox"][name*="admin" i], [data-field="admin"] input').click()
    await page.waitForTimeout(800)
    const after = await dbQuery(config.db.url,
      `SELECT admin FROM users WHERE email = '${SEED_EMAIL}' LIMIT 1`)
    expect(after[0]?.['0']).not.toEqual(wasBefore)
    // restore
    await row.locator('input[type="checkbox"][name*="admin" i], [data-field="admin"] input').click()
  })

  test('step 5: toggle can_create_content and DB-assert flipped', async ({ page }) => {
    await page.goto('/categorias/users')
    const row = page.locator(`tr:has-text("${SEED_EMAIL}"), [data-testid*="row"]:has-text("${SEED_EMAIL}")`).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    const before = await dbQuery(config.db.url,
      `SELECT can_create_content FROM users WHERE email = '${SEED_EMAIL}' LIMIT 1`)
    const wasBefore = before[0]?.['0']
    await row.locator('input[type="checkbox"][name*="create" i], [data-field="can_create_content"] input').click()
    await page.waitForTimeout(800)
    const after = await dbQuery(config.db.url,
      `SELECT can_create_content FROM users WHERE email = '${SEED_EMAIL}' LIMIT 1`)
    expect(after[0]?.['0']).not.toEqual(wasBefore)
    // restore
    await row.locator('input[type="checkbox"][name*="create" i], [data-field="can_create_content"] input').click()
  })
})
