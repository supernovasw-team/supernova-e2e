/**
 * Backoffice List Ops 20 — Users export XLSX
 * Route: /categorias/users
 * Action: Click "Exportar XLSX" button, assert download
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'

test.describe('/categorias/users — export XLSX', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAsAdmin(page)
    await context.storageState({ path: '.artifacts/auth.json' })
    await context.close()
  })

  test('click "Exportar XLSX" triggers download with valid file', async ({ page }) => {
    await page.goto('/categorias/users')
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 })

    const exportBtn = page.getByRole('button', { name: /exportar|export|xlsx/i }).first()
    await expect(exportBtn).toBeVisible({ timeout: 5_000 })

    const downloadPromise = page.waitForEvent('download')
    await exportBtn.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
    const path = await download.path()
    const { promises: fs } = require('fs')
    const size = (await fs.stat(path)).size
    expect(size).toBeGreaterThan(0)
  })

  test('exported XLSX contains header row + user data', async ({ page }) => {
    await page.goto('/categorias/users')
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 })

    const exportBtn = page.getByRole('button', { name: /exportar|export|xlsx/i }).first()
    const downloadPromise = page.waitForEvent('download')
    await exportBtn.click()
    const download = await downloadPromise

    const path = await download.path()
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(path)
    const worksheet = workbook.worksheets[0]

    expect(worksheet.rowCount).toBeGreaterThan(1)
    const headers = worksheet.getRow(1).values
    expect(headers).toBeDefined()
  })
})
