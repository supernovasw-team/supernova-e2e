/**
 * Backoffice Workflow 10 — Content Publish Toggle
 *
 * Toggle "Publicar" checkbox on a selfcare, verify DB state.
 * Route: /categorias/selfcare
 * DB table: selfcares (published boolean)
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-workflows'

test.describe.configure({ mode: 'serial' })

test.describe('/categorias/selfcare — publish toggle workflow', () => {
  let selfcareId: string

  test.beforeAll(async () => {
    // Seed a selfcare with published=false
    const result = await dbQuery<Record<string, string>>(
      config.db.url,
      `INSERT INTO selfcares (name, description, published, user_id, "createdAt", "updatedAt")
       VALUES ('TOGGLE TEST ' || floor(random()*1000000)::text, 'Test desc', false, 1, now(), now())
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
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-01-list.png`, fullPage: true })
  })

  test('step 2: open edit modal, toggle publish off', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    const editBtn = page.getByRole('button', { name: /editar|edit/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()
    await page.waitForTimeout(800)

    const publishCheckbox = page.locator('input[type="checkbox"][id*="publicar" i], input[type="checkbox"][name*="published" i]').first()
    const isChecked = await publishCheckbox.isChecked()
    if (isChecked) {
      await publishCheckbox.click()
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-02-toggle-off.png`, fullPage: true })
  })

  test('step 3: save and verify DB published=false', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    const editBtn = page.getByRole('button', { name: /editar|edit/i }).first()
    await editBtn.click()
    await page.waitForTimeout(800)

    const publishCheckbox = page.locator('input[type="checkbox"][id*="publicar" i], input[type="checkbox"][name*="published" i]').first()
    if (await publishCheckbox.isChecked()) {
      await publishCheckbox.click()
    }

    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').last()
    await saveBtn.click({ timeout: 10_000 })
    await page.waitForTimeout(1200)

    const rows = await dbAssert<{ published: string }>(
      config.db.url,
      `SELECT published FROM selfcares WHERE id = ${selfcareId} LIMIT 1`,
      ['published'],
      (r) => r.published === 'false',
    )
    console.log('[db-assert] selfcare published=false:', rows[0])
  })

  test('step 4: toggle back on, save, verify DB published=true', async ({ page }) => {
    await page.goto('/categorias/selfcare')
    const editBtn = page.getByRole('button', { name: /editar|edit/i }).first()
    await editBtn.click()
    await page.waitForTimeout(800)

    const publishCheckbox = page.locator('input[type="checkbox"][id*="publicar" i], input[type="checkbox"][name*="published" i]').first()
    if (!(await publishCheckbox.isChecked())) {
      await publishCheckbox.click()
    }

    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').last()
    await saveBtn.click({ timeout: 10_000 })
    await page.waitForTimeout(1200)

    const rows = await dbAssert<{ published: string }>(
      config.db.url,
      `SELECT published FROM selfcares WHERE id = ${selfcareId} LIMIT 1`,
      ['published'],
      (r) => r.published === 'true',
    )
    console.log('[db-assert] selfcare published=true:', rows[0])
  })
})
