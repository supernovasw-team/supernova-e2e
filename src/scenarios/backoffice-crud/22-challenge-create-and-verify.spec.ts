/**
 * Backoffice CRUD 22 — Challenges (Desafios): create, verify list, verify DB.
 *
 * Route: /engagement/challenges
 * DB table: challenges (@@map in Prisma schema)
 *
 * Required fields per backoffice-actions.json:
 *   Título (text), Descrição (textarea), Tipo de Desafio (select: DAILY/WEEKLY/MONTHLY/SPECIAL),
 *   Data de Início (date), Data de Fim (date),
 *   Pontos de Recompensa (number), Valor Alvo (number)
 *
 * Note: title field (not name) — DB column is `title`.
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-crud'
const UNIQUE = `E2E CRUD — Challenge ${Date.now()}`

// Static future dates (2030) so they are always valid regardless of when tests run
const START_DATE = '2030-01-01'
const END_DATE = '2030-12-31'

test.describe.configure({ mode: 'serial' })

test.describe('/engagement/challenges CRUD — create, verify list, verify DB', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate + open create modal', async ({ page }) => {
    await page.goto('/engagement/challenges')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/22-01-challenge-list.png`, fullPage: true })

    const novoBtn = page.getByRole('button', { name: /^\s*Novo/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()

    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/22-02-challenge-modal-open.png`, fullPage: true })

    await expect(
      page.locator('#title, #titulo, [name="title"], [name="titulo"], input[placeholder*="título" i]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('step 2: fill all required fields', async ({ page }) => {
    await page.goto('/engagement/challenges')
    const novoBtn = page.getByRole('button', { name: /^\s*Novo/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    // Título
    const titleField = page.locator('#title, #titulo, [name="title"], [name="titulo"]').first()
    await titleField.scrollIntoViewIfNeeded()
    await titleField.fill(UNIQUE)

    // Descrição
    const descField = page.locator('#description, #descricao, [name="description"], [name="descricao"], textarea').first()
    await descField.scrollIntoViewIfNeeded()
    await descField.fill('Desafio criado automaticamente pelo E2E CRUD.')

    // Tipo de Desafio — select (ChallengeType enum: DAILY, WEEKLY, MONTHLY, SPECIAL)
    try {
      const tipoSelect = page.locator('select[name*="type" i], select[name*="tipo" i], select[name*="challenge_type" i]').first()
      if (await tipoSelect.isVisible({ timeout: 2_000 })) {
        await tipoSelect.selectOption('WEEKLY')
      } else {
        const tipoDropdown = page.locator('[class*="type" i] [class*="control"], [placeholder*="tipo" i]').first()
        if (await tipoDropdown.isVisible({ timeout: 2_000 })) {
          await tipoDropdown.click()
          await page.keyboard.press('ArrowDown')
          await page.keyboard.press('Enter')
        }
      }
    } catch {
      // Non-blocking
    }

    // Data de Início
    const startField = page.locator('#start_date, #startDate, [name="start_date"], [name="startDate"], input[type="date"]').first()
    await startField.scrollIntoViewIfNeeded()
    await startField.fill(START_DATE)

    // Data de Fim
    const endField = page.locator('#end_date, #endDate, [name="end_date"], [name="endDate"], input[type="date"]').nth(1)
    await endField.scrollIntoViewIfNeeded()
    await endField.fill(END_DATE)

    // Pontos de Recompensa
    const pontosField = page.locator('#reward_points, #rewardPoints, [name="reward_points"], [name="rewardPoints"], [placeholder*="pontos" i]').first()
    await pontosField.scrollIntoViewIfNeeded()
    await pontosField.fill('50')

    // Valor Alvo
    const targetField = page.locator('#target_value, #targetValue, [name="target_value"], [name="targetValue"], [placeholder*="alvo" i]').first()
    await targetField.scrollIntoViewIfNeeded()
    await targetField.fill('10')

    await page.screenshot({ path: `${SCREENSHOT_DIR}/22-03-challenge-form-filled.png`, fullPage: true })
  })

  test('step 3: submit and wait for list to show new item', async ({ page }) => {
    await page.goto('/engagement/challenges')
    const novoBtn = page.getByRole('button', { name: /^\s*Novo/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    const titleField = page.locator('#title, #titulo, [name="title"], [name="titulo"]').first()
    await titleField.scrollIntoViewIfNeeded()
    await titleField.fill(UNIQUE)

    const descField = page.locator('#description, #descricao, [name="description"], [name="descricao"], textarea').first()
    await descField.scrollIntoViewIfNeeded()
    await descField.fill('Desafio criado automaticamente pelo E2E CRUD.')

    try {
      const tipoSelect = page.locator('select[name*="type" i], select[name*="tipo" i], select[name*="challenge_type" i]').first()
      if (await tipoSelect.isVisible({ timeout: 2_000 })) {
        await tipoSelect.selectOption('WEEKLY')
      }
    } catch { /* Non-blocking */ }

    const startField = page.locator('#start_date, #startDate, [name="start_date"], [name="startDate"], input[type="date"]').first()
    await startField.scrollIntoViewIfNeeded()
    await startField.fill(START_DATE)

    const endField = page.locator('#end_date, #endDate, [name="end_date"], [name="endDate"], input[type="date"]').nth(1)
    await endField.scrollIntoViewIfNeeded()
    await endField.fill(END_DATE)

    const pontosField = page.locator('#reward_points, #rewardPoints, [name="reward_points"], [name="rewardPoints"], [placeholder*="pontos" i]').first()
    await pontosField.scrollIntoViewIfNeeded()
    await pontosField.fill('50')

    const targetField = page.locator('#target_value, #targetValue, [name="target_value"], [name="targetValue"], [placeholder*="alvo" i]').first()
    await targetField.scrollIntoViewIfNeeded()
    await targetField.fill('10')

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    await expect(page.locator(`text=${UNIQUE}`).first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/22-04-challenge-created.png`, fullPage: true })
  })

  test('step 4: DB row exists in challenges', async () => {
    const rows = await dbAssert<{ id: string; title: string }>(
      config.db.url,
      `SELECT id, title FROM challenges WHERE title = '${UNIQUE}' ORDER BY id DESC LIMIT 1`,
      ['id', 'title'],
      (r) => r.title === UNIQUE,
    )
    console.log('[db-assert] challenges row:', rows[0])
  })
})
