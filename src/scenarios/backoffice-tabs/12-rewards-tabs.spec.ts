import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test.describe('Rewards Tab Navigation', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAsHr(page)
    await page.close()
  })

  test('navigates to Pendentes tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/engagement/rewards')
    await page.locator('button:has-text("Pendentes")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/Pendentes|Aprovações/i, { timeout: 5000 })
    await captureFullPage(page, 'rewards-pendentes')
  })

  test('navigates to Histórico tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/engagement/rewards')
    await page.locator('button:has-text("Histórico")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/Histórico/i, { timeout: 5000 })
    await captureFullPage(page, 'rewards-historico')
  })

  test('navigates to Catálogo tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/engagement/rewards')
    await page.locator('button:has-text("Catálogo")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/Catálogo|Recompensas/i, { timeout: 5000 })
    await captureFullPage(page, 'rewards-catalogo')
  })

  test('navigates to Estoque tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/engagement/rewards')
    await page.locator('button:has-text("Estoque")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/Estoque/i, { timeout: 5000 })
    await captureFullPage(page, 'rewards-estoque')
  })
})
