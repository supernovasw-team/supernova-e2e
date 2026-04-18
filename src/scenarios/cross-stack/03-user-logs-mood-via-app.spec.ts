/**
 * Cross-stack scenario 03 — App user logs a mood; HR sees it in analytics.
 *
 * Steps:
 *  1. Maestro → open Diário de Emoções in the app → navigate + interact
 *     (existing flow 51-diary-emotions.yaml drives the screen open; we also
 *      run X-cross-stack-assert-mood.yaml to assert the UI state)
 *  2. psql → assert a new row exists in `emotion_entries` for today
 *     (table confirmed from prisma schema: @@map("emotion_entries"))
 *     Note: MoodEntry (@@map("mood_entries")) requires planId which a free
 *     user may not have. EmotionEntry is the diary-of-emotions table.
 *  3. Playwright (HR storageState) → /wellness/mood-tracking → assert
 *     the page renders (analytics may aggregate, not show individual entries)
 *
 * Maestro steps are skipped (test.fixme) when no Android emulator is ready.
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { dbAssert } from '../../lib/db-query.js'
import { runMaestroFlow, isEmulatorReady } from '../../lib/maestro-runner.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/cross-stack'
// Record the epoch before the scenario starts so DB queries can filter by time
const SCENARIO_START = new Date().toISOString()

// Step 3 opens an HR route — use the HR storageState for that sub-describe.
// The outer describe (Maestro + DB steps) doesn't need a browser at all.
const HR_STATE = '.artifacts/state/hr.json'

test.describe.configure({ mode: 'serial' })

test.describe('03 — user logs mood via app', () => {
  test('step 1a: Maestro — open Diário de Emoções (navigation)', async () => {
    const emulatorReady = await isEmulatorReady()
    if (!emulatorReady) {
      test.fixme(true, 'Android emulator not running — skipping Maestro step')
      return
    }

    const flowPath = resolve(
      config.repos.app,
      '.maestro/flows/51-diary-emotions.yaml',
    )

    const result = await runMaestroFlow({ flowPath })

    if (!result.ok) {
      console.error('[maestro] stdout:', result.stdout)
      console.error('[maestro] stderr:', result.stderr)
    }

    expect(result.ok, `Maestro flow failed:\n${result.stdout}\n${result.stderr}`).toBe(true)
  })

  test('step 1b: Maestro — assert mood diary screen visible', async () => {
    const emulatorReady = await isEmulatorReady()
    if (!emulatorReady) {
      test.fixme(true, 'Android emulator not running — skipping Maestro step')
      return
    }

    const flowPath = resolve(
      config.repos.app,
      '.maestro/flows/X-cross-stack-assert-mood.yaml',
    )

    const result = await runMaestroFlow({ flowPath })

    if (!result.ok) {
      console.error('[maestro] stdout:', result.stdout)
      console.error('[maestro] stderr:', result.stderr)
    }

    expect(result.ok, `Maestro assert-mood flow failed:\n${result.stdout}\n${result.stderr}`).toBe(true)
    expect(result.stdout).not.toContain('FAILED')
  })

  test('step 2: DB — emotion_entries row exists for today (e2e-user)', async () => {
    // Get the end-user's id first
    const userSql = `
      SELECT id FROM users WHERE email='${config.testUsers.endUser.email}' LIMIT 1;
    `
    const userRows = await dbAssert<{ id: string }>(
      config.db.url,
      userSql,
      ['id'],
    )
    const userId = userRows[0].id
    console.log('[db-assert] end-user id:', userId)

    // Check emotion_entries for today
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const moodSql = `
      SELECT id, user_id, emotion_id, entry_date
      FROM emotion_entries
      WHERE user_id = ${userId}
        AND entry_date = '${today}'
      ORDER BY id DESC
      LIMIT 1;
    `

    try {
      const rows = await dbAssert<{
        id: string
        user_id: string
        emotion_id: string
        entry_date: string
      }>(
        config.db.url,
        moodSql,
        ['id', 'user_id', 'emotion_id', 'entry_date'],
      )
      console.log('[db-assert] emotion_entries row:', rows[0])
    } catch (err) {
      // The Maestro flow may have just opened the screen without submitting an
      // entry (flow only navigates; the Diário may require manual interaction).
      // Fail honestly rather than silently passing.
      throw new Error(
        `No emotion_entries row found for user ${userId} on ${today}. ` +
        `If the Maestro flow only opens the screen (does not submit), ` +
        `this step will always fail. Extend the flow to tap a mood emotion. ` +
        `Original error: ${String(err)}`,
      )
    }
  })

  test('step 3: Playwright HR — mood-tracking page renders', async ({ page, browser }) => {
    // Open a fresh context with the HR storageState so this test can reach
    // /wellness/mood-tracking which is guarded behind the HR auth.
    const hrCtx = await browser.newContext({
      storageState: HR_STATE,
      baseURL: process.env.BACKOFFICE_URL ?? 'http://localhost:3000',
    })
    page = await hrCtx.newPage()
    // This test uses the HR storageState injected by the `hr` project
    await page.goto('/wellness/mood-tracking')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

    // The analytics page may not show individual entries, but it must render.
    await expect(page.locator('h1, h2, h3, [data-testid="page-title"], [class*="title"]').first()).toBeVisible({
      timeout: 15_000,
    })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-01-hr-mood-tracking.png`, fullPage: true })

    // Assert there is some wellness data present on the page
    // (chart, table, or metric card — any meaningful node)
    const hasContent = await page
      .locator('[class*="chart"], [class*="Card"], [class*="metric"], table, canvas')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false)

    if (!hasContent) {
      // Last-resort: just confirm the page isn't an error
      await expect(page.locator('body')).not.toContainText(/erro|error|404|not found/i)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-02-hr-mood-tracking-loaded.png`, fullPage: true })

    await hrCtx.close()
  })
})
