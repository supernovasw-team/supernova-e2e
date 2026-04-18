/**
 * Playwright global setup — logs in as admin and HR ONCE, saves
 * localStorage + cookies. Specs reuse via `test.use({ storageState })`
 * so we don't re-trigger 2FA per spec (which would race on the single
 * active code).
 */
import { chromium, FullConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { loginAsAdmin, loginAsHr } from './auth.js'

export const STATE_DIR = resolve(process.cwd(), '.artifacts/state')
export const ADMIN_STATE = resolve(STATE_DIR, 'admin.json')
export const HR_STATE = resolve(STATE_DIR, 'hr.json')

export default async function globalSetup(config: FullConfig): Promise<void> {
  mkdirSync(STATE_DIR, { recursive: true })
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'

  for (const [name, statePath, loginFn] of [
    ['admin', ADMIN_STATE, loginAsAdmin],
    ['hr', HR_STATE, loginAsHr],
  ] as const) {
    const browser = await chromium.launch()
    const ctx = await browser.newContext({ baseURL })
    const page = await ctx.newPage()
    await loginFn(page)
    await ctx.storageState({ path: statePath })
    await browser.close()
    // Tiny wait lets the 2FA code for the next login be distinct.
    await new Promise((r) => setTimeout(r, 1500))
    console.log(`[global-setup] ${name} state saved → ${statePath}`)
  }
}
