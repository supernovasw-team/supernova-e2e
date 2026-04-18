import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { getLatest2faCode } from '../../lib/two-factor.js'

test('admin login — email + password + 2FA code from DB', async ({ page }) => {
  const { email, password } = config.testUsers.admin

  await page.goto('/adminclub')
  await page.getByLabel(/e-?mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  // Backend writes code to `tokens` table — grab it after the form submit.
  await expect(page).toHaveURL(/two-factor/)
  const code = await getLatest2faCode({ flow: 'admin' })

  await page.getByLabel(/código/i).fill(code)
  await page.getByRole('button', { name: /verificar|entrar/i }).click()

  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  await page.screenshot({
    path: '.artifacts/screenshots/backoffice/10-login-admin-dashboard.png',
    fullPage: true,
  })
})
