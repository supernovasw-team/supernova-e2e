import { Page, expect } from '@playwright/test'
import { config } from '../../e2e.config.js'
import { getLatest2faCode } from './two-factor.js'

/**
 * Login as admin: email + password + 2FA code from DB.
 * Waits for dashboard URL before returning.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const { email, password } = config.testUsers.admin

  await page.goto('/adminclub')
  await page.getByLabel(/e-?mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  await expect(page).toHaveURL(/two-factor/)
  const code = await getLatest2faCode({ flow: 'admin' })

  await page.getByLabel(/código/i).fill(code)
  await page.getByRole('button', { name: /verificar|entrar/i }).click()

  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
}

/**
 * Login as HR admin: email + password + 2FA code from DB.
 * Waits for wellness URL before returning.
 */
export async function loginAsHr(page: Page): Promise<void> {
  const { email, password } = config.testUsers.hrAdmin

  await page.goto('/rhclub/login')
  await page.getByLabel(/e-?mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  await expect(page).toHaveURL(/two-factor/)
  const code = await getLatest2faCode({ flow: 'hr' })

  await page.getByLabel(/código/i).fill(code)
  await page.getByRole('button', { name: /verificar|entrar/i }).click()

  await expect(page).toHaveURL(/wellness/, { timeout: 15_000 })
}
