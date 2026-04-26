/**
 * Backoffice CRUD 21 — Badges (Distintivos): create, verify list, verify DB.
 *
 * Route: /engagement/badges
 * DB table: badges (@@map in Prisma schema)
 *
 * Required fields per backoffice-actions.json:
 *   Nome (text), Descrição (textarea), Critérios (text), Raridade (select)
 *
 * rarity values per schema comment: common | rare | epic | legendary
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-crud'
const UNIQUE = `E2E CRUD — Badge ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe.fixme('/engagement/badges CRUD — create, verify list, verify DB', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate + open create modal', async ({ page }) => {
    await page.goto('/engagement/badges')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/21-01-badge-list.png`, fullPage: true })

    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()

    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/21-02-badge-modal-open.png`, fullPage: true })

    await expect(
      page.locator('#name, #nome, [name="name"], [name="nome"], input[placeholder*="nome" i]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('step 2: fill all required fields', async ({ page }) => {
    await page.goto('/engagement/badges')
    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    // Nome
    const nomeField = page.locator('#name, #nome, [name="name"], [name="nome"]').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    // Descrição
    const descField = page.locator('#description, #descricao, [name="description"], [name="descricao"], textarea').first()
    await descField.scrollIntoViewIfNeeded()
    await descField.fill('Badge criado automaticamente pelo E2E CRUD.')

    // Critérios
    const criteriosField = page.locator('#criteria, #criterios, [name="criteria"], [name="criterios"]').first()
    await criteriosField.scrollIntoViewIfNeeded()
    await criteriosField.fill('Completar 5 atividades')

    // Raridade — native select or custom dropdown
    try {
      const rarSelect = page.locator('select[name*="rarity" i], select[name*="raridade" i]').first()
      if (await rarSelect.isVisible({ timeout: 2_000 })) {
        await rarSelect.selectOption({ index: 1 })
      } else {
        const rarDropdown = page.locator('[class*="rarity" i] [class*="control"], [placeholder*="raridade" i]').first()
        if (await rarDropdown.isVisible({ timeout: 2_000 })) {
          await rarDropdown.click()
          await page.keyboard.press('ArrowDown')
          await page.keyboard.press('Enter')
        }
      }
    } catch {
      // Non-blocking
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/21-03-badge-form-filled.png`, fullPage: true })
  })

  test('step 3: submit and wait for list to show new item', async ({ page }) => {
    await page.goto('/engagement/badges')
    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    const nomeField = page.locator('#name, #nome, [name="name"], [name="nome"]').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    const descField = page.locator('#description, #descricao, [name="description"], [name="descricao"], textarea').first()
    await descField.scrollIntoViewIfNeeded()
    await descField.fill('Badge criado automaticamente pelo E2E CRUD.')

    const criteriosField = page.locator('#criteria, #criterios, [name="criteria"], [name="criterios"]').first()
    await criteriosField.scrollIntoViewIfNeeded()
    await criteriosField.fill('Completar 5 atividades')

    // Raridade
    try {
      const rarSelect = page.locator('select[name*="rarity" i], select[name*="raridade" i]').first()
      if (await rarSelect.isVisible({ timeout: 2_000 })) {
        await rarSelect.selectOption({ index: 1 })
      } else {
        const rarDropdown = page.locator('[class*="rarity" i] [class*="control"], [placeholder*="raridade" i]').first()
        if (await rarDropdown.isVisible({ timeout: 2_000 })) {
          await rarDropdown.click()
          await page.keyboard.press('ArrowDown')
          await page.keyboard.press('Enter')
        }
      }
    } catch {
      // Non-blocking
    }

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    await expect(page.locator(`text=${UNIQUE}`).first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/21-04-badge-created.png`, fullPage: true })
  })

  test('step 4: DB row exists in badges', async () => {
    const rows = await dbAssert<{ id: string; name: string }>(
      config.db.url,
      `SELECT id, name FROM badges WHERE name = '${UNIQUE}' ORDER BY id DESC LIMIT 1`,
      ['id', 'name'],
      (r) => r.name === UNIQUE,
    )
    console.log('[db-assert] badges row:', rows[0])
  })
})
