import { test, expect } from '@playwright/test'
import { loginAsHr } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test.describe('Wellness Settings Tab Navigation', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAsHr(page)
    await page.close()
  })

  test('navigates to Conta tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/wellness/settings')
    await page.locator('button:has-text("Conta")').first().click()
    await expect(page.locator('label, h3, span')).toContainText(/Conta|company_logo/i, { timeout: 5000 })
    await captureFullPage(page, 'wellness-settings-conta')
  })

  test('navigates to Usuários tab', async ({ page }) => {
    await loginAsHr(page)
    await page.goto('/wellness/settings')
    await page.locator('button:has-text("Usuários")').first().click()
    await expect(page.locator('h2, h3, span')).toContainText(/Usuários|Employees/i, { timeout: 5000 })
    await captureFullPage(page, 'wellness-settings-usuarios')
  })
})
