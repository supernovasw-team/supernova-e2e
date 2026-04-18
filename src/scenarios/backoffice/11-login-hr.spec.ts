import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { getLatest2faCode } from '../../lib/two-factor.js'

test('HR login — separate flow, separate token', async ({ page }) => {
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
  await page.screenshot({
    path: '.artifacts/screenshots/backoffice/11-login-hr-dashboard.png',
    fullPage: true,
  })
})
