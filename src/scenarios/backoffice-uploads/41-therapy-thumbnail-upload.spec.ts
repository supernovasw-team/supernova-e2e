/**
 * Spec 41 — Therapy edit page: Thumbnail image upload via ContentHeader.
 *
 * Reuses therapy from spec 40 or creates new. Uploads to <input#thumbnail>.
 * DB assertion: terapias.thumbnail starts with 'data:image/'
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const IMG_PATH = resolve('fixtures/uploads/test-image.png')
const SCREENSHOT_BASE = '.artifacts/screenshots/backoffice-uploads'
const UNIQUE_TITLE = `E2E Therapy Thumb ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('41 — therapy thumbnail upload', () => {
  let therapyId: string

  test('step 1: ensure therapy exists, navigate to edit', async ({ page }) => {
    await loginAsAdmin(page)

    const existing = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM terapia WHERE name LIKE 'E2E%Therapy%' ORDER BY id DESC LIMIT 1;`,
    )

    if (existing.length > 0) {
      therapyId = existing[0][0]
    } else {
      await page.goto('/categorias/terapia')
      await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

      await page.locator('button').filter({ hasText: /^\s*(Nov[oa]|Criar|Adicionar)/i }).first().click()
      await page.waitForTimeout(800)

      const nomeField = page.locator('#name').first()
      await nomeField.scrollIntoViewIfNeeded()
      await nomeField.fill(UNIQUE_TITLE)

      const descEditor = page.locator('.ql-editor').first()
      await descEditor.scrollIntoViewIfNeeded()
      await descEditor.click()
      await page.keyboard.type('Thumbnail E2E test.')

      const submitBtn = page
        .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
        .last()
      await submitBtn.click({ timeout: 10_000 })

      await expect(page.locator(`text=${UNIQUE_TITLE}`).first()).toBeVisible({ timeout: 20_000 })

      const rows = await dbQuery<Record<string, string>>(
        config.db.url,
        `SELECT id FROM terapia WHERE name = '${UNIQUE_TITLE}' ORDER BY id DESC LIMIT 1;`,
      )
      therapyId = rows[0][0]
    }

    await page.goto(`/categorias/terapia/edit/${therapyId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)

    await page.screenshot({ path: `${SCREENSHOT_BASE}/41-01-edit-loaded.png`, fullPage: true })
  })

  test('step 2: upload thumbnail + save + assert DB', async ({ page }) => {
    await loginAsAdmin(page)

    const rows = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM terapia WHERE name LIKE 'E2E%Therapy%' ORDER BY id DESC LIMIT 1;`,
    )
    if (rows.length === 0) {
      test.skip(true, 'No E2E therapy found')
      return
    }
    const id = rows[0][0]

    await page.goto(`/categorias/terapia/edit/${id}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2_000)

    await page.locator('#thumbnail').setInputFiles(IMG_PATH)
    await page.waitForTimeout(500)

    const saveBtn = page.locator('button:has-text("Salvar"), button[type="submit"]').first()
    await saveBtn.click({ timeout: 10_000 })

    const toast = page.locator("[role='status'], .Toastify__toast, .react-toastify__toast").first()
    await expect(toast).toBeVisible({ timeout: 20_000 })
    await expect(toast).toContainText(/terapia|atualiz/i)

    await dbAssert<{ thumbnail: string }>(
      config.db.url,
      `SELECT thumbnail FROM terapia WHERE id = ${id};`,
      ['thumbnail'],
      (r) => typeof r.thumbnail === 'string' && r.thumbnail.startsWith('data:image/'),
    )
  })
})
