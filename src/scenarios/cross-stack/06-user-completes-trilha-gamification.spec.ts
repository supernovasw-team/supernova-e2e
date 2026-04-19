/**
 * Cross-stack scenario 06 — App user completes a Self-Care trilha → gamification.
 *
 * Steps:
 *  1. Maestro → login + navigate Trilhas Self-Care + open first content
 *     + tap "Iniciar" + mark complete (or submit progress via back-end call)
 *  2. DB-assert track_progress row exists for appUser (overallProgress > 0)
 *  3. DB-assert user_points_history row exists for appUser (activity_type in
 *     selfcare / selfcare_content) created after scenario start
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { config } from '../../../e2e.config.js'
import { dbAssert, dbQuery } from '../../lib/db-query.js'
import { runMaestroFlow, isEmulatorReady } from '../../lib/maestro-runner.js'

const SCREENSHOT_DIR = '.artifacts/screenshots/cross-stack'
const SCENARIO_START = new Date().toISOString()

test.describe.configure({ mode: 'serial' })

test.describe('06 — user completes trilha gamification', () => {
  test('step 1: Maestro — navigate trilha + complete content', async () => {
    const emulatorReady = await isEmulatorReady()
    if (!emulatorReady) {
      test.fixme(true, 'Android emulator not running — skipping Maestro step')
      return
    }

    // FIXME: flow X-cross-stack-complete-selfcare.yaml not yet created.
    // When wired: login as appUser → open Trilhas Self-Care → tap first trilha
    // → tap first content → tap "Iniciar" / "Marcar como concluído" → confirm.
    const flowPath = resolve(
      config.repos.app,
      '.maestro/flows/X-cross-stack-complete-selfcare.yaml',
    )
    const result = await runMaestroFlow({ flowPath })
    if (!result.ok) {
      console.error('[maestro] stdout:', result.stdout)
      console.error('[maestro] stderr:', result.stderr)
    }
    expect(result.ok, `Maestro flow failed:\n${result.stdout}\n${result.stderr}`).toBe(true)
    expect(result.stdout).not.toContain('FAILED')
  })

  test('step 2: DB-assert track_progress row for appUser', async () => {
    const userRows = await dbAssert<{ id: string }>(
      config.db.url,
      `SELECT id FROM users WHERE email='${config.testUsers.appUser.email}' LIMIT 1;`,
      ['id'],
    )
    const userId = userRows[0].id

    // track_progress: @@map("track_progress")
    // Prisma maps camelCase fields to snake_case: trackType→track_type, etc.
    const rows = await dbAssert<{
      id: string
      user_id: string
      track_type: string
      overall_progress: string
    }>(
      config.db.url,
      `SELECT id, user_id, track_type, overall_progress
       FROM track_progress
       WHERE user_id = ${userId}
         AND track_type = 'selfcare'
         AND overall_progress > 0
       ORDER BY updated_at DESC
       LIMIT 1;`,
      ['id', 'user_id', 'track_type', 'overall_progress'],
      (r) => Number(r.overall_progress) > 0,
    )
    console.log('[db-assert] track_progress:', rows[0])
  })

  test('step 3: DB-assert user_points_history row for appUser', async () => {
    const userRows = await dbAssert<{ id: string }>(
      config.db.url,
      `SELECT id FROM users WHERE email='${config.testUsers.appUser.email}' LIMIT 1;`,
      ['id'],
    )
    const userId = userRows[0].id

    // user_points_history: @@map("user_points_history")
    // Prisma maps userId→user_id, createdAt→created_at
    const rows = await dbAssert<{
      id: string
      activity_type: string
      points: string
    }>(
      config.db.url,
      `SELECT id, activity_type, points
       FROM user_points_history
       WHERE user_id = ${userId}
         AND created_at >= '${SCENARIO_START}'
         AND (activity_type ILIKE '%selfcare%' OR category ILIKE '%selfcare%')
       ORDER BY id DESC
       LIMIT 1;`,
      ['id', 'activity_type', 'points'],
      (r) => Number(r.points) > 0,
    )
    console.log('[db-assert] user_points_history:', rows[0])
  })

  test('step 4: DB-assert user_gamification total_points updated', async () => {
    const userRows = await dbAssert<{ id: string }>(
      config.db.url,
      `SELECT id FROM users WHERE email='${config.testUsers.appUser.email}' LIMIT 1;`,
      ['id'],
    )
    const userId = userRows[0].id

    // user_gamification: @@map("user_gamification"), userId→user_id
    const rows = await dbAssert<{ user_id: string; total_points: string }>(
      config.db.url,
      `SELECT user_id, total_points
       FROM user_gamification
       WHERE user_id = ${userId}
       LIMIT 1;`,
      ['user_id', 'total_points'],
      (r) => Number(r.total_points) > 0,
    )
    console.log('[db-assert] user_gamification:', rows[0])
  })
})
