import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test.describe('HR Analytics Tab Navigation', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAsHr(page)
    await page.close()
  })

  test('navigates to Bem-Estar tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/wellness/analytics')
    await page.locator('button:has-text("Bem-Estar")').first().click()
    await expect(page.locator('button:has-text("Bem-Estar")').first()).toBeFocused({ timeout: 5000 })
    await captureFullPage(page, 'hr-analytics-bem-estar')
  })

  test('navigates to Conteúdo tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/wellness/analytics')
    await page.locator('button:has-text("Conteúdo")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/Conteúdo/i, { timeout: 5000 })
    await captureFullPage(page, 'hr-analytics-conteudo')
  })

  test('navigates to ROI tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/wellness/analytics')
    await page.locator('button:has-text("ROI")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/ROI/i, { timeout: 5000 })
    await captureFullPage(page, 'hr-analytics-roi')
  })

  test('navigates to Engajamento tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/wellness/analytics')
    await page.locator('button:has-text("Engajamento")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/Engajamento/i, { timeout: 5000 })
    await captureFullPage(page, 'hr-analytics-engajamento')
  })

  test('navigates to Recompensas tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/wellness/analytics')
    await page.locator('button:has-text("Recompensas")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/Recompensas/i, { timeout: 5000 })
    await captureFullPage(page, 'hr-analytics-recompensas')
  })
})
