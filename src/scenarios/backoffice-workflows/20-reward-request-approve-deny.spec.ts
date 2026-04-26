/**
 * Backoffice Workflow 20 — Reward Request Approve/Deny
 *
 * Seed reward_request rows, navigate /engagement/rewards Pendentes tab,
 * approve/deny, verify DB status changes.
 * Route: /engagement/rewards
 * DB table: reward_requests (status enum: PENDING, APPROVED, DENIED, DELIVERED, CANCELLED)
 */
import { test, expect } from '@playwright/test'
import { config } from '../../../e2e.config.js'
import { loginAsAdmin } from '../../lib/auth.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/backoffice-workflows'

test.describe.configure({ mode: 'serial' })

test.describe('/engagement/rewards — approve/deny workflow', () => {
  let requestId1: string
  let requestId2: string

  test.beforeAll(async () => {
    // Seed two reward_requests with status=PENDING
    // First: to approve
    const r1 = await dbQuery<Record<string, string>>(
      config.db.url,
      `INSERT INTO reward_requests (user_id, plan_id, reward_id, status, created_at, updated_at)
       VALUES (1, 1, 1, 'PENDING', now(), now())
       RETURNING id`,
    )
    requestId1 = r1[0]['0']

    // Second: to deny
    const r2 = await dbQuery<Record<string, string>>(
      config.db.url,
      `INSERT INTO reward_requests (user_id, plan_id, reward_id, status, created_at, updated_at)
       VALUES (1, 1, 1, 'PENDING', now(), now())
       RETURNING id`,
    )
    requestId2 = r2[0]['0']
  })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('step 1: navigate to rewards, Pendentes tab', async ({ page }) => {
    await page.goto('/engagement/rewards')
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })

    const pendenteTab = page.getByRole('tab', { name: /pendente/i })
    if (await pendenteTab.isVisible({ timeout: 5_000 })) {
      await pendenteTab.click()
      await page.waitForTimeout(800)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-01-pendentes-tab.png`, fullPage: true })
  })

  test('step 2: approve first request', async ({ page }) => {
    await page.goto('/engagement/rewards')
    const pendenteTab = page.getByRole('tab', { name: /pendente/i })
    if (await pendenteTab.isVisible({ timeout: 5_000 })) {
      await pendenteTab.click()
      await page.waitForTimeout(800)
    }

    const approveBtn = page.getByRole('button', { name: /aprovar|approve/i }).first()
    await expect(approveBtn).toBeVisible({ timeout: 10_000 })
    await approveBtn.click()
    await page.waitForTimeout(1200)

    const rows = await dbAssert<{ status: string }>(
      config.db.url,
      `SELECT status FROM reward_requests WHERE id = ${requestId1} LIMIT 1`,
      ['status'],
      (r) => r.status === 'APPROVED',
    )
    console.log('[db-assert] reward_request approved:', rows[0])
  })

  test('step 3: deny second request', async ({ page }) => {
    await page.goto('/engagement/rewards')
    const pendenteTab = page.getByRole('tab', { name: /pendente/i })
    if (await pendenteTab.isVisible({ timeout: 5_000 })) {
      await pendenteTab.click()
      await page.waitForTimeout(800)
    }

    const denyBtn = page.getByRole('button', { name: /negar|deny|recusar/i }).first()
    await expect(denyBtn).toBeVisible({ timeout: 10_000 })
    await denyBtn.click()

    // Handle denial reason modal if present
    const reasonInput = page.locator('input[placeholder*="motivo" i], textarea[placeholder*="motivo" i]').first()
    if (await reasonInput.isVisible({ timeout: 2_000 })) {
      await reasonInput.fill('Test denial reason')
    }

    const confirmBtn = page.getByRole('button', { name: /confirmar|confirm|enviar/i }).last()
    await confirmBtn.click()
    await page.waitForTimeout(1200)

    const rows = await dbAssert<{ status: string }>(
      config.db.url,
      `SELECT status FROM reward_requests WHERE id = ${requestId2} LIMIT 1`,
      ['status'],
      (r) => r.status === 'DENIED',
    )
    console.log('[db-assert] reward_request denied:', rows[0])
  })

  test('step 4: verify final states in DB', async () => {
    const approved = await dbAssert<{ status: string }>(
      config.db.url,
      `SELECT status FROM reward_requests WHERE id = ${requestId1}`,
      ['status'],
      (r) => r.status === 'APPROVED',
    )
    const denied = await dbAssert<{ status: string }>(
      config.db.url,
      `SELECT status FROM reward_requests WHERE id = ${requestId2}`,
      ['status'],
      (r) => r.status === 'DENIED',
    )
    console.log('[final] approved:', approved[0], 'denied:', denied[0])
  })
})
