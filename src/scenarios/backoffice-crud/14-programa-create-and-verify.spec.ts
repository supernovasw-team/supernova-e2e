/**
 * Backoffice CRUD 14 — Programas: create, verify list, verify DB.
 *
 * Route: /categorias/programas
 * DB table: programas (@@map in Prisma schema)
 * Extra field vs other content types: Sequencial (checkbox)
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-crud'
const UNIQUE = `E2E CRUD — Programa ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('/categorias/programas CRUD — create, verify list, verify DB', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate + open create modal', async ({ page }) => {
    await page.goto('/categorias/programas')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-01-programa-list.png`, fullPage: true })

    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()

    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-02-programa-modal-open.png`, fullPage: true })

    await expect(page.locator('#name, [name="name"], input[placeholder*="nome" i]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('step 2: fill all required fields', async ({ page }) => {
    await page.goto('/categorias/programas')
    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    // Nome
    const nomeField = page.locator('#name').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    // Descrição — react-quill
    const descEditor = page.locator('.ql-editor').first()
    await descEditor.scrollIntoViewIfNeeded()
    await descEditor.click()
    await page.keyboard.type('Programa criado automaticamente pelo E2E CRUD.')

    // Sequencial checkbox — optional, tick it for completeness
    try {
      const sequencialCb = page.locator('input[type="checkbox"][name*="sequencial" i], label:has-text("Sequencial") input[type="checkbox"]').first()
      if (await sequencialCb.isVisible({ timeout: 2_000 })) {
        await sequencialCb.check()
      }
    } catch {
      // Non-blocking
    }

    // Autores — react-select, best-effort
    try {
      const authorsInput = page.locator('[class*="autores" i] input, [id*="autores" i], [placeholder*="autor" i]').first()
      if (await authorsInput.isVisible({ timeout: 2_000 })) {
        await authorsInput.click()
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
      }
    } catch {
      // Non-blocking
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-03-programa-form-filled.png`, fullPage: true })
  })

  test('step 3: submit and wait for list to show new item', async ({ page }) => {
    await page.goto('/categorias/programas')
    const novoBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novoBtn).toBeVisible({ timeout: 15_000 })
    await novoBtn.click()
    await page.waitForTimeout(800)

    const nomeField = page.locator('#name').first()
    await nomeField.scrollIntoViewIfNeeded()
    await nomeField.fill(UNIQUE)

    const descEditor = page.locator('.ql-editor').first()
    await descEditor.scrollIntoViewIfNeeded()
    await descEditor.click()
    await page.keyboard.type('Programa criado automaticamente pelo E2E CRUD.')

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    await expect(page.locator(`text=${UNIQUE}`).first()).toBeVisible({ timeout: 20_000 })
    // FE updates list optimistically; POST is still in flight. Wait for the
    // network to settle so the row commits before we tear down the page —
    // otherwise the in-flight fetch is aborted and step 4 finds no DB row.
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-04-programa-created.png`, fullPage: true })
  })

  test('step 4: DB row exists in programas', async () => {
    const rows = await dbAssert<{ id: string; name: string }>(
      config.db.url,
      `SELECT id, name FROM programas WHERE name = '${UNIQUE}' ORDER BY id DESC LIMIT 1`,
      ['id', 'name'],
      (r) => r.name === UNIQUE,
    )
    console.log('[db-assert] programas row:', rows[0])
  })
})
