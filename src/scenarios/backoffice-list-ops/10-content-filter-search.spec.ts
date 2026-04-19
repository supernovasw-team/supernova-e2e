/**
 * Backoffice List Ops 10 — Content filter/search by name
 * Tests "Filtrar por nome" input on selfcare, therapy, article, course, programa, users
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert } from '../../lib/db-query.js'

test.describe('Content filter/search by name', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAsAdmin(page)
    await context.storageState({ path: '.artifacts/auth.json' })
    await context.close()
  })

  const routes = [
    { name: 'selfcare', table: 'selfcares' },
    { name: 'terapias', table: 'therapies' },
    { name: 'artigos', table: 'articles' },
    { name: 'courses', table: 'courses' },
    { name: 'programas', table: 'programas' },
    { name: 'users', table: 'users' },
  ]

  routes.forEach(({ name, table }) => {
    test(`/categorias/${name} — search by name finds seeded item`, async ({ page }) => {
      const rows = await dbAssert<{ id: string; name: string }>(
        config.db.url,
        `SELECT id, name FROM ${table} ORDER BY RANDOM() LIMIT 1`,
        ['id', 'name'],
      )
      const targetName = rows[0]?.name
      if (!targetName) return

      await page.goto(`/categorias/${name}`)
      await expect(page.locator('body')).toBeVisible({ timeout: 10_000 })

      const filterInput = page.locator(
        '[placeholder*="Filtrar" i], input[placeholder*="nome" i], input[aria-label*="filtrar" i]'
      ).first()
      await filterInput.fill(targetName)
      await page.waitForTimeout(500)

      await expect(page.locator(`text=${targetName}`)).toBeVisible({ timeout: 5_000 })
    })

    test(`/categorias/${name} — search with garbage returns empty state`, async ({ page }) => {
      await page.goto(`/categorias/${name}`)
      await expect(page.locator('body')).toBeVisible({ timeout: 10_000 })

      const filterInput = page.locator(
        '[placeholder*="Filtrar" i], input[placeholder*="nome" i], input[aria-label*="filtrar" i]'
      ).first()
      await filterInput.fill('XYZGARBAGE_NONEXISTENT_12345')
      await page.waitForTimeout(500)

      const emptyState = page.locator(
        'text=/nenhum|sem resultados|não encontrado|no data|no results/i'
      ).first()
      await expect(emptyState).toBeVisible({ timeout: 5_000 })
    })
  })
})
