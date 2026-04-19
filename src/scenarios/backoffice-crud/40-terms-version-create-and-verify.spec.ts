/**
 * Backoffice CRUD 40 — Terms Versions: create, verify list, verify DB.
 *
 * Route: /categorias/terms/versions
 * DB table: terms_versions (@@map in Prisma schema)
 *
 * Required fields per backoffice-actions.json:
 *   Versão (text, unique), URL dos Termos (url), Data efetiva (datetime_local)
 *
 * version field is UNIQUE in DB — we embed Date.now() to guarantee freshness.
 * effectiveDate maps to effective_date (DateTime) in the schema.
 * We do NOT tick "Ativar imediatamente" to avoid disturbing production-like
 * state in the test DB.
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-crud'
const TS = Date.now()
const UNIQUE_VERSION = `e2e-${TS}`
const TERMS_URL = `https://example.com/terms/${TS}`
// datetime-local format expected by <input type="datetime-local">
const EFFECTIVE_DATE = '2030-06-01T00:00'

test.describe.configure({ mode: 'serial' })

test.describe('/categorias/terms/versions CRUD — create, verify list, verify DB', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate + open create modal', async ({ page }) => {
    await page.goto('/categorias/terms/versions')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/40-01-terms-list.png`, fullPage: true })

    const novaBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novaBtn).toBeVisible({ timeout: 15_000 })
    await novaBtn.click()

    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/40-02-terms-modal-open.png`, fullPage: true })

    await expect(
      page.locator('#version, #versao, [name="version"], [name="versao"], input[placeholder*="versão" i]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('step 2: fill all required fields', async ({ page }) => {
    await page.goto('/categorias/terms/versions')
    const novaBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novaBtn).toBeVisible({ timeout: 15_000 })
    await novaBtn.click()
    await page.waitForTimeout(800)

    // Versão (unique string)
    const versionField = page.locator('#version, #versao, [name="version"], [name="versao"]').first()
    await versionField.scrollIntoViewIfNeeded()
    await versionField.fill(UNIQUE_VERSION)

    // URL dos Termos
    const termsUrlField = page.locator(
      '#termsUrl, #terms_url, [name="termsUrl"], [name="terms_url"], input[type="url"], input[placeholder*="url" i]'
    ).first()
    await termsUrlField.scrollIntoViewIfNeeded()
    await termsUrlField.fill(TERMS_URL)

    // Data efetiva (datetime-local)
    const effectiveDateField = page.locator(
      '#effectiveDate, #effective_date, [name="effectiveDate"], [name="effective_date"], input[type="datetime-local"]'
    ).first()
    await effectiveDateField.scrollIntoViewIfNeeded()
    await effectiveDateField.fill(EFFECTIVE_DATE)

    // Resumo das mudanças — optional textarea
    try {
      const summaryField = page.locator('#changeSummary, #change_summary, [name="changeSummary"], [name="change_summary"], textarea').first()
      if (await summaryField.isVisible({ timeout: 2_000 })) {
        await summaryField.fill('Atualização criada automaticamente pelo E2E CRUD.')
      }
    } catch {
      // Non-blocking
    }

    // Do NOT tick "Ativar imediatamente" — avoids disrupting test DB state

    await page.screenshot({ path: `${SCREENSHOT_DIR}/40-03-terms-form-filled.png`, fullPage: true })
  })

  test('step 3: submit and wait for list to show new version', async ({ page }) => {
    await page.goto('/categorias/terms/versions')
    const novaBtn = page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first()
    await expect(novaBtn).toBeVisible({ timeout: 15_000 })
    await novaBtn.click()
    await page.waitForTimeout(800)

    const versionField = page.locator('#version, #versao, [name="version"], [name="versao"]').first()
    await versionField.scrollIntoViewIfNeeded()
    await versionField.fill(UNIQUE_VERSION)

    const termsUrlField = page.locator(
      '#termsUrl, #terms_url, [name="termsUrl"], [name="terms_url"], input[type="url"], input[placeholder*="url" i]'
    ).first()
    await termsUrlField.scrollIntoViewIfNeeded()
    await termsUrlField.fill(TERMS_URL)

    const effectiveDateField = page.locator(
      '#effectiveDate, #effective_date, [name="effectiveDate"], [name="effective_date"], input[type="datetime-local"]'
    ).first()
    await effectiveDateField.scrollIntoViewIfNeeded()
    await effectiveDateField.fill(EFFECTIVE_DATE)

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    await expect(page.locator(`text=${UNIQUE_VERSION}`).first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/40-04-terms-created.png`, fullPage: true })
  })

  test('step 4: DB row exists in terms_versions', async () => {
    const rows = await dbAssert<{ id: string; version: string }>(
      config.db.url,
      `SELECT id, version FROM terms_versions WHERE version = '${UNIQUE_VERSION}' ORDER BY id DESC LIMIT 1`,
      ['id', 'version'],
      (r) => r.version === UNIQUE_VERSION,
    )
    console.log('[db-assert] terms_versions row:', rows[0])
  })
})
