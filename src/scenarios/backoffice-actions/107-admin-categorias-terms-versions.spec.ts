import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../lib/auth.js'
import { captureFullPage } from '../../lib/screenshot.js'

test('/categorias/terms/versions — primary action: Nova versão', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/categorias/terms/versions')
  await page.locator("button:has-text('Nova versão')").first().click()
  await page.getByLabel(/Versão/i).or(page.getByPlaceholder(/Versão/i)).fill('E2E Versão')
  await page.getByLabel(/URL dos Te/i).or(page.getByPlaceholder(/URL dos Te/i)).fill('E2E URL dos Termos')
  await page.getByLabel(/Data efeti/i).or(page.getByPlaceholder(/Data efeti/i)).fill('E2E Data efetiva')
  await captureFullPage(page, 'categorias-terms-versions-after-novaverso')
  // TODO: assert navigation / toast / DB row per expected_outcome
})
