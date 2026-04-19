/**
 * Backoffice CRUD 20 — Rewards (Recompensas): create, verify list, verify DB.
 *
 * Route: /engagement/rewards
 * DB table: rewards (@@map in Prisma schema)
 *
 * Required fields per backoffice-actions.json:
 *   Nome (text), Descrição (textarea), Custo em Pontos (number), Categoria (select)
 *
 * Note: Reward model has planId FK — the modal likely infers planId from admin session.
 * The DB assert uses a broad name match since we cannot predict planId here.
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-crud'
const UNIQUE = `E2E CRUD — Reward ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('/engagement/rewards CRUD — create, verify list, verify DB', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate + open create modal', async ({ page }) => {
    await page.goto('/engagement/rewards')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-01-reward-list.png`, fullPage: true })

    const novaBtn = page.getByRole('button', { name: /Nova Recompensa/i }).first()
    await expect(novaBtn).toBeVisible({ timeout: 15_000 })
    await novaBtn.click()

    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-02-reward-modal-open.png`, fullPage: true })

    await expect(
      page.locator('#name, #nome, [name="name"], [name="nome"], input[placeholder*="nome" i]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('step 2: fill all required fields', async ({ page }) => {
    await page.goto('/engagement/rewards')
    const novaBtn = page.getByRole('button', { name: /Nova Recompensa/i }).first()
    await expect(novaBtn).toBeVisible({ timeout: 15_000 })
    await novaBtn.click()
    await page.waitForTimeout(800)

    // Nome
    const nomeField = page.locator('#name, #nome, [name="name"], [name="nome"]').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    // Descrição
    const descField = page.locator('#description, #descricao, [name="description"], [name="descricao"], textarea').first()
    await descField.scrollIntoViewIfNeeded()
    await descField.fill('Recompensa criada automaticamente pelo E2E CRUD.')

    // Custo em Pontos
    const pontosField = page.locator('#cost_points, #costPoints, [name="cost_points"], [name="costPoints"], [placeholder*="pontos" i]').first()
    await pontosField.scrollIntoViewIfNeeded()
    await pontosField.fill('100')

    // Categoria — native select or custom dropdown
    try {
      const catSelect = page.locator('select[name*="category" i], select[name*="categoria" i]').first()
      if (await catSelect.isVisible({ timeout: 2_000 })) {
        await catSelect.selectOption({ index: 1 })
      } else {
        // Try custom dropdown
        const catDropdown = page.locator('[class*="category" i] [class*="control"], [placeholder*="categoria" i]').first()
        if (await catDropdown.isVisible({ timeout: 2_000 })) {
          await catDropdown.click()
          await page.keyboard.press('ArrowDown')
          await page.keyboard.press('Enter')
        }
      }
    } catch {
      // Non-blocking
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-03-reward-form-filled.png`, fullPage: true })
  })

  test('step 3: submit and wait for list to show new item', async ({ page }) => {
    await page.goto('/engagement/rewards')
    const novaBtn = page.getByRole('button', { name: /Nova Recompensa/i }).first()
    await expect(novaBtn).toBeVisible({ timeout: 15_000 })
    await novaBtn.click()
    await page.waitForTimeout(800)

    const nomeField = page.locator('#name, #nome, [name="name"], [name="nome"]').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    const descField = page.locator('#description, #descricao, [name="description"], [name="descricao"], textarea').first()
    await descField.scrollIntoViewIfNeeded()
    await descField.fill('Recompensa criada automaticamente pelo E2E CRUD.')

    const pontosField = page.locator('#cost_points, #costPoints, [name="cost_points"], [name="costPoints"], [placeholder*="pontos" i]').first()
    await pontosField.scrollIntoViewIfNeeded()
    await pontosField.fill('100')

    // Categoria — pick first available
    try {
      const catSelect = page.locator('select[name*="category" i], select[name*="categoria" i]').first()
      if (await catSelect.isVisible({ timeout: 2_000 })) {
        await catSelect.selectOption({ index: 1 })
      } else {
        const catDropdown = page.locator('[class*="category" i] [class*="control"], [placeholder*="categoria" i]').first()
        if (await catDropdown.isVisible({ timeout: 2_000 })) {
          await catDropdown.click()
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
    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-04-reward-created.png`, fullPage: true })
  })

  test('step 4: DB row exists in rewards', async () => {
    const rows = await dbAssert<{ id: string; name: string }>(
      config.db.url,
      `SELECT id, name FROM rewards WHERE name = '${UNIQUE}' ORDER BY id DESC LIMIT 1`,
      ['id', 'name'],
      (r) => r.name === UNIQUE,
    )
    console.log('[db-assert] rewards row:', rows[0])
  })
})
