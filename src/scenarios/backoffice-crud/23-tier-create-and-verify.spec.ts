/**
 * Backoffice CRUD 23 — Tiers (Níveis): create, verify list, verify DB.
 *
 * Route: /engagement/tiers
 * DB table: tiers (@@map in Prisma schema)
 *
 * Required fields per backoffice-actions.json:
 *   Nome (text), Nível (number), Pontos Mínimos (number)
 * Optional: Cor (color)
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-crud'
const UNIQUE = `E2E CRUD — Tier ${Date.now()}`
// Use a large level/points value to avoid collisions with seeded data
const LEVEL_VALUE = 999
const MIN_POINTS = 99999

test.describe.configure({ mode: 'serial' })

test.describe('/engagement/tiers CRUD — create, verify list, verify DB', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate + open create modal', async ({ page }) => {
    await page.goto('/engagement/tiers')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-01-tier-list.png`, fullPage: true })

    const novoBtn = page.getByRole('button', { name: /^\s*Novo/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()

    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-02-tier-modal-open.png`, fullPage: true })

    await expect(
      page.locator('#name, #nome, [name="name"], [name="nome"], input[placeholder*="nome" i]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('step 2: fill all required fields', async ({ page }) => {
    await page.goto('/engagement/tiers')
    const novoBtn = page.getByRole('button', { name: /^\s*Novo/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    // Nome
    const nomeField = page.locator('#name, #nome, [name="name"], [name="nome"]').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    // Nível (level number)
    const levelField = page.locator('#level, #nivel, [name="level"], [name="nivel"], input[type="number"]').first()
    await levelField.scrollIntoViewIfNeeded()
    await levelField.fill(String(LEVEL_VALUE))

    // Pontos Mínimos
    const pontosField = page.locator('#min_points, #minPoints, [name="min_points"], [name="minPoints"], input[type="number"]').nth(1)
    await pontosField.scrollIntoViewIfNeeded()
    await pontosField.fill(String(MIN_POINTS))

    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-03-tier-form-filled.png`, fullPage: true })
  })

  test('step 3: submit and wait for list to show new item', async ({ page }) => {
    await page.goto('/engagement/tiers')
    const novoBtn = page.getByRole('button', { name: /^\s*Novo/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    const nomeField = page.locator('#name, #nome, [name="name"], [name="nome"]').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    const levelField = page.locator('#level, #nivel, [name="level"], [name="nivel"], input[type="number"]').first()
    await levelField.scrollIntoViewIfNeeded()
    await levelField.fill(String(LEVEL_VALUE))

    const pontosField = page.locator('#min_points, #minPoints, [name="min_points"], [name="minPoints"], input[type="number"]').nth(1)
    await pontosField.scrollIntoViewIfNeeded()
    await pontosField.fill(String(MIN_POINTS))

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    await expect(page.locator(`text=${UNIQUE}`).first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-04-tier-created.png`, fullPage: true })
  })

  test('step 4: DB row exists in tiers', async () => {
    const rows = await dbAssert<{ id: string; name: string }>(
      config.db.url,
      `SELECT id, name FROM tiers WHERE name = '${UNIQUE}' ORDER BY id DESC LIMIT 1`,
      ['id', 'name'],
      (r) => r.name === UNIQUE,
    )
    console.log('[db-assert] tiers row:', rows[0])
  })
})
