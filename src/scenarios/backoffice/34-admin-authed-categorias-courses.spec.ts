import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/courses renders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/courses')
  for (const text of ['Cursos', 'Novo Curso']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  }
  await captureFullPage(page, 'categorias-courses')
})
