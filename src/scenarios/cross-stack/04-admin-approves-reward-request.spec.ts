/**
 * Cross-stack scenario 04 — Admin approves a reward request.
 *
 * Steps:
 *  1. DB seed — insert a PENDING reward_request row for the appUser
 *  2. Playwright (admin storageState) → /engagement/rewards → pending tab → approve
 *  3. DB-assert reward_requests.status = 'APPROVED'
 *  4. Maestro → open Shop / notifications → assert approval visible (best-effort)
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'
import { runMaestroFlow, isEmulatorReady } from '../../lib/maestro-runner.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/cross-stack'

test.describe.configure({ mode: 'serial' })

let seededRequestId: string

test.describe('04 — admin approves reward request', () => {
  test('step 1: seed pending reward_request via DB', async () => {
    // Resolve appUser id
    const userRows = await dbAssert<{ id: string }>(
      config.db.url,
      `SELECT id FROM users WHERE email='${config.testUsers.appUser.email}' LIMIT 1;`,
      ['id'],
    )
    const userId = userRows[0].id

    // Find any active reward. Prisma maps planId → plan_id in the DB.
    // dbQuery returns positional keys '0', '1', … in tuples-only mode.
    type RewardRow = Record<string, string>
    const rewardRows = await dbQuery<RewardRow>(
      config.db.url,
      `SELECT id, plan_id FROM rewards WHERE is_active = true ORDER BY id LIMIT 1;`,
    )

    if (rewardRows.length === 0) {
      test.fixme(true, 'No active rewards in DB — seed a reward first')
      return
    }

    const rewardId = rewardRows[0]['0']
    const planId = rewardRows[0]['1']

    // Insert pending request (ignore conflict if already exists from prior run)
    await dbQuery(
      config.db.url,
      `INSERT INTO reward_requests (user_id, plan_id, reward_id, status, created_at, updated_at)
       VALUES (${userId}, ${planId}, ${rewardId}, 'PENDING', NOW(), NOW())
       RETURNING id;`,
    )

    // Fetch the latest pending request for this user
    const reqRows = await dbAssert<{ id: string }>(
      config.db.url,
      `SELECT id FROM reward_requests WHERE user_id = ${userId} AND status = 'PENDING' ORDER BY id DESC LIMIT 1;`,
      ['id'],
    )
    seededRequestId = reqRows[0].id
    console.log('[seed] reward_request id:', seededRequestId)
  })

  test('step 2: Playwright — approve request in /engagement/rewards', async ({ page }) => {
    await page.goto('/engagement/rewards')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-01-rewards-page.png`, fullPage: true })

    // Navigate to Pendentes / Pending tab
    const pendingTab = page
      .locator('[role="tab"]:has-text("Pendente"), button:has-text("Pendentes"), a:has-text("Pendentes")')
      .first()
    const tabVisible = await pendingTab.isVisible({ timeout: 8_000 }).catch(() => false)
    if (tabVisible) {
      await pendingTab.click()
      await page.waitForTimeout(600)
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-02-rewards-pending-tab.png`, fullPage: true })

    // Click the first "Aprovar" action in the list
    const approveBtn = page
      .locator('button:has-text("Aprovar"), [aria-label*="Aprovar" i]')
      .first()
    await expect(approveBtn).toBeVisible({ timeout: 15_000 })
    await approveBtn.click()

    // Confirm dialog if present
    await page.waitForTimeout(500)
    const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Sim")').first()
    const confirmVisible = await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    if (confirmVisible) await confirmBtn.click()

    await page.waitForTimeout(1_500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-03-reward-approved.png`, fullPage: true })
  })

  test('step 3: DB-assert reward_requests.status = APPROVED', async () => {
    const rows = await dbAssert<{ id: string; status: string }>(
      config.db.url,
      `SELECT id, status FROM reward_requests WHERE id = ${seededRequestId} LIMIT 1;`,
      ['id', 'status'],
      (r) => r.status === 'APPROVED',
    )
    console.log('[db-assert] reward_request:', rows[0])
  })

  test('step 4: Maestro — shop / notification shows approval (best-effort)', async () => {
    const emulatorReady = await isEmulatorReady()
    if (!emulatorReady) {
      test.fixme(true, 'Android emulator not running — skipping Maestro step')
      return
    }

    // FIXME: flow X-cross-stack-reward-approved.yaml not yet created in the app repo.
    // When wired: open Shop, tap Histórico tab, assert "Aprovado" text visible.
    const flowPath = resolve(
      config.repos.app,
      '.maestro/flows/X-cross-stack-reward-approved.yaml',
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
