/**
 * Backoffice Workflow 11 — Content Free Toggle
 *
 * Toggle "Gratuito" checkbox on a selfcare, verify DB state.
 * Route: /categorias/selfcare
 * DB table: selfcares (isFree boolean)
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-workflows'

test.describe.configure({ mode: 'serial' })

test.describe('/categorias/selfcare — free toggle workflow', () => {
  let selfcareId: string

  test.beforeAll(async () => {
    // Seed a selfcare with isFree=false
    const result = await dbQuery<Record<string, string>>(
      config.db.url,
      `INSERT INTO selfcares (name, description, "isFree", user_id, "createdAt", "updatedAt")
       VALUES ('FREE TEST ' || floor(random()*1000000)::text, 'Test desc', false, 1, now(), now())
       RETURNING id`,
    )
    selfcareId = result[0]['0']
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate to selfcare list', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
  })

  test('step 2: open edit, toggle free on', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    const editBtn = page.getByRole('button', { name: /editar|edit/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()
    await page.waitForTimeout(800)

    const freeCheckbox = page.locator('input[type="checkbox"][id*="gratuito" i], input[type="checkbox"][name*="free" i]').first()
    if (!(await freeCheckbox.isChecked())) {
      await freeCheckbox.click()
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-01-free-on.png`, fullPage: true })
  })

  test('step 3: save, verify DB isFree=true', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    const editBtn = page.getByRole('button', { name: /editar|edit/i }).first()
    await editBtn.click()
    await page.waitForTimeout(800)

    const freeCheckbox = page.locator('input[type="checkbox"][id*="gratuito" i], input[type="checkbox"][name*="free" i]').first()
    if (!(await freeCheckbox.isChecked())) {
      await freeCheckbox.click()
    }

    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').last()
    await saveBtn.click({ timeout: 10_000 })
    await page.waitForTimeout(1200)

    const rows = await dbAssert<{ isFree: string }>(
      config.db.url,
      `SELECT "isFree" FROM selfcares WHERE id = ${selfcareId} LIMIT 1`,
      ['isFree'],
      (r) => r.isFree === 'true',
    )
    console.log('[db-assert] selfcare isFree=true:', rows[0])
  })

  test('step 4: toggle free off, save, verify DB isFree=false', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    const editBtn = page.getByRole('button', { name: /editar|edit/i }).first()
    await editBtn.click()
    await page.waitForTimeout(800)

    const freeCheckbox = page.locator('input[type="checkbox"][id*="gratuito" i], input[type="checkbox"][name*="free" i]').first()
    if (await freeCheckbox.isChecked()) {
      await freeCheckbox.click()
    }

    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').last()
    await saveBtn.click({ timeout: 10_000 })
    await page.waitForTimeout(1200)

    const rows = await dbAssert<{ isFree: string }>(
      config.db.url,
      `SELECT "isFree" FROM selfcares WHERE id = ${selfcareId} LIMIT 1`,
      ['isFree'],
      (r) => r.isFree === 'false',
    )
    console.log('[db-assert] selfcare isFree=false:', rows[0])
  })
})
