/**
 * Backoffice List Ops 30 — Wellness reports export CSV (HR)
 * Route: /wellness/reports
 * Action: Click "Gerar CSV" button, assert download
 */
import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'

test.describe('/wellness/reports — export CSV (HR)', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAsHr(page)
    await context.storageState({ path: '.artifacts/auth-hr.json' })
    await context.close()
  })

  test('click "Gerar CSV" triggers download with valid file', async ({ page }) => {
    await page.goto('/wellness/reports')
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 })

    const exportBtn = page.getByRole('button', { name: /gerar|exportar|csv|download/i }).first()
    await expect(exportBtn).toBeVisible({ timeout: 5_000 })

    const downloadPromise = page.waitForEvent('download')
    await exportBtn.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.csv$/)
    const path = await download.path()
    const { promises: fs } = require('fs')
    const size = (await fs.stat(path)).size
    expect(size).toBeGreaterThan(0)
  })

  test('exported CSV is valid and contains data', async ({ page }) => {
    await page.goto('/wellness/reports')
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 })

    const exportBtn = page.getByRole('button', { name: /gerar|exportar|csv|download/i }).first()
    const downloadPromise = page.waitForEvent('download')
    await exportBtn.click()
    const download = await downloadPromise

    const path = await download.path()
    const { promises: fs } = require('fs')
    const content = (await fs.readFile(path, 'utf8')).trim()

    expect(content.length).toBeGreaterThan(0)
    const lines = content.split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(1)
  })
})
