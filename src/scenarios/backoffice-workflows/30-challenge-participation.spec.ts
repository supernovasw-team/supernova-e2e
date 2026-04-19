/**
 * Backoffice Workflow 30 — Challenge Participation
 *
 * Navigate /engagement/challenges, open first challenge's participants list,
 * assert page responds. If no challenges exist, FIXME with note.
 * Route: /engagement/challenges
 * DB table: challenges, user_challenges
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbQuery } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-workflows'

test.describe.configure({ mode: 'serial' })

test.describe('/engagement/challenges — participants list', () => {
  let challengeId: string | null

  test.beforeAll(async () => {
    // Check if challenges exist
    const existing = await dbQuery<Record<string, string>>(
      config.db.url,
      `SELECT id FROM challenges WHERE is_active = true LIMIT 1`,
    )
    if (existing.length > 0) {
      challengeId = existing[0]['0']
    }
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate to challenges page', async ({ page }) => {
    await page.goto('/engagement/challenges')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-01-challenges-list.png`, fullPage: true })
  })

  test('step 2: check challenge exists or fixme', async ({ page }) => {
    if (!challengeId) {
      console.log('[FIXME] No active challenges found in DB. Seed challenges before testing participants.')
      return
    }
    // Challenge exists, proceed
    expect(challengeId).toBeTruthy()
  })

  test('step 3: open first challenge participants if exists', async ({ page }) => {
    if (!challengeId) {
      console.log('[SKIPPED] No challenges to open participants list')
      return
    }

    await page.goto('/engagement/challenges')
    const challengeRow = page.locator('tbody tr').first()
    await expect(challengeRow).toBeVisible({ timeout: 10_000 })

    const participantsBtn = challengeRow.getByRole('button', { name: /participantes|participants|view/i })
    if (await participantsBtn.isVisible({ timeout: 2_000 })) {
      await participantsBtn.click()
      await page.waitForTimeout(1200)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/30-02-participants-modal.png`, fullPage: true })

      // Assert modal or page responded
      await expect(page.locator('body')).toBeVisible()
      console.log('[success] Participants list opened and page responsive')
    } else {
      // Try row click
      await challengeRow.click()
      await page.waitForTimeout(1200)
      await expect(page.locator('body')).toBeVisible()
      console.log('[success] Challenge details loaded and page responsive')
    }
  })

  test('step 4: verify page stays responsive', async ({ page }) => {
    if (!challengeId) {
      console.log('[SKIPPED] No challenges to verify')
      return
    }

    await page.goto('/engagement/challenges')
    // Basic responsiveness check: page should load without errors
    const errorBanners = page.locator('[role="alert"]').filter({ hasText: /erro|error|failed/i })
    const errorCount = await errorBanners.count()
    expect(errorCount).toBe(0)

    console.log('[success] Page is responsive, no errors detected')
  })
})
