import { Page } from '@playwright/test'

/**
 * Capture full-page screenshot to `.artifacts/screenshots/backoffice/<name>.png`.
 * Also logs the action for debugging.
 */
export async function captureFullPage(page: Page, name: string): Promise<void> {
  const path = `.artifacts/screenshots/backoffice/${name}.png`
  await page.screenshot({ path, fullPage: true })
  console.log('[shot]', name)
}
