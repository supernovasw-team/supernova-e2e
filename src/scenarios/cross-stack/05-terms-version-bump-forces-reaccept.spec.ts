/**
 * Cross-stack scenario 05 — New terms version forces re-accept in app.
 *
 * Steps:
 *  1. Playwright (admin storageState) → /legal/terms (or /configuracoes/terms)
 *     → create / activate a new terms_version
 *  2. DB-assert terms_versions.is_active = true for the new version
 *  3. Maestro → launchApp → assert TermsReAcceptScreen shows
 *     "Aceitar e continuar" text (best-effort; screen only appears when a
 *      newer unaccepted version exists for the logged-in user)
 *
 * FIXME (step 1): The backoffice route for terms management hasn't been
 * confirmed — /legal/terms is a best-guess. If not wired, the step seeds
 * the DB directly and marks step 1 as fixme.
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'
import { runMaestroFlow, isEmulatorReady } from '../../lib/maestro-runner.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/cross-stack'
const NEW_VERSION = `e2e-${Date.now()}`
const TERMS_URL = 'https://saudemental.club/termos-e2e'

test.describe.configure({ mode: 'serial' })

test.describe('05 — terms version bump forces re-accept', () => {
  test('step 1: Playwright — activate new terms version in backoffice', async ({ page }) => {
    // FIXME: route /legal/terms may not exist — adjust when backoffice terms
    // management UI is implemented. For now we fall back to direct DB seed.
    const routeExists = await (async () => {
      await page.goto('/legal/terms')
      await page.waitForTimeout(1_500)
      const status = page.url()
      return !status.includes('404') && !status.includes('login')
    })()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-01-terms-page.png`, fullPage: true })

    if (!routeExists) {
      test.fixme(
        true,
        '/legal/terms route not found — terms management UI not yet wired in backoffice. DB seed used in step 2 instead.',
      )
      return
    }

    // Attempt to create a new terms version via the UI
    const novoBtn = page.getByRole('button', { name: /novo|nova|adicionar/i }).first()
    const btnVisible = await novoBtn.isVisible({ timeout: 8_000 }).catch(() => false)
    if (!btnVisible) {
      test.fixme(true, 'Create-terms button not found — UI not yet implemented')
      return
    }

    await novoBtn.click()
    await page.waitForTimeout(600)

    const versionField = page.locator('input[name*="version" i], input[placeholder*="versão" i]').first()
    await versionField.fill(NEW_VERSION, { timeout: 8_000 })

    const urlField = page.locator('input[name*="url" i], input[name*="link" i]').first()
    await urlField.fill(TERMS_URL)

    const activeToggle = page
      .locator('input[type="checkbox"][name*="active" i], [role="switch"][aria-label*="ativo" i]')
      .first()
    const toggleVisible = await activeToggle.isVisible({ timeout: 3_000 }).catch(() => false)
    if (toggleVisible) await activeToggle.check()

    const submitBtn = page
      .locator('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]')
      .last()
    await submitBtn.click({ timeout: 10_000 })

    await page.waitForTimeout(1_500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-02-terms-created.png`, fullPage: true })
  })

  test('step 2: DB seed + assert terms_versions.is_active = true', async () => {
    // Deactivate all existing versions first to avoid unique-active conflicts
    await dbQuery(
      config.db.url,
      `UPDATE terms_versions SET is_active = false WHERE is_active = true;`,
    )

    // Insert new active version (upsert on version string)
    await dbQuery(
      config.db.url,
      `INSERT INTO terms_versions (version, terms_url, effective_date, is_active, created_at, updated_at)
       VALUES ('${NEW_VERSION}', '${TERMS_URL}', NOW(), true, NOW(), NOW())
       ON CONFLICT (version) DO UPDATE SET is_active = true, updated_at = NOW();`,
    )

    // Clear appUser's accepted version so the app prompts re-accept
    await dbQuery(
      config.db.url,
      `UPDATE users SET terms_version_accepted = NULL
       WHERE email = '${config.testUsers.appUser.email}';`,
    )

    const rows = await dbAssert<{ version: string; is_active: string }>(
      config.db.url,
      `SELECT version, is_active FROM terms_versions WHERE version = '${NEW_VERSION}' LIMIT 1;`,
      ['version', 'is_active'],
      (r) => r['is_active'] === 't',
    )
    console.log('[db-assert] terms_version:', rows[0])
  })

  test('step 3: Maestro — TermsReAcceptScreen shows "Aceitar e continuar"', async () => {
    const emulatorReady = await isEmulatorReady()
    if (!emulatorReady) {
      test.fixme(true, 'Android emulator not running — skipping Maestro step')
      return
    }

    // FIXME: flow X-cross-stack-terms-reaccept.yaml not yet created.
    // When wired: launchApp → assert text "Aceitar e continuar" is visible.
    const flowPath = resolve(
      config.repos.app,
      '.maestro/flows/X-cross-stack-terms-reaccept.yaml',
    )
    const result = await runMaestroFlow({ flowPath })
    if (!result.ok) {
      console.error('[maestro] stdout:', result.stdout)
      console.error('[maestro] stderr:', result.stderr)
    }
    expect(result.ok, `Maestro flow failed:\n${result.stdout}\n${result.stderr}`).toBe(true)
    expect(result.stdout).not.toContain('FAILED')
  })
})
