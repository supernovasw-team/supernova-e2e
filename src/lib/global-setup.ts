/**
 * Playwright global setup — logs in as admin and HR ONCE, saves
 * localStorage + cookies. Specs reuse via `test.use({ storageState })`
 * so we don't re-trigger 2FA per spec (which would race on the single
 * active code).
 *
 * sessionStorage capture: the backoffice's tokenStorage shim (Wave-2
 * security hardening) routes `access_token` / `hr_access_token` writes
 * from localStorage → sessionStorage. Playwright's `storageState()` does
 * NOT capture sessionStorage, so saved state would be missing the JWT.
 * After login we read the tokens out of sessionStorage and write them
 * into the storageState JSON's localStorage array. On test load, the
 * shim's `readWithMigration` finds them in localStorage, copies them
 * back to sessionStorage, and removes the localStorage copy — the same
 * migration path real users hit during the rollout.
 */
import { chromium, FullConfig } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loginAsAdmin, loginAsHr } from './auth.js'

export const STATE_DIR = resolve(process.cwd(), '.artifacts/state')
export const ADMIN_STATE = resolve(STATE_DIR, 'admin.json')
export const HR_STATE = resolve(STATE_DIR, 'hr.json')

const TOKEN_KEYS = ['access_token', 'hr_access_token'] as const

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

    // Capture sessionStorage tokens before they vanish on context teardown.
    const sessionTokens = await page.evaluate((keys) => {
      const out: Record<string, string> = {}
      for (const k of keys) {
        const v = window.sessionStorage.getItem(k)
        if (v) out[k] = v
      }
      return out
    }, TOKEN_KEYS as unknown as string[])

    const state = await ctx.storageState()
    // Inject sessionStorage tokens into the storageState's localStorage list
    // for the backoffice origin. The shim migrates them back on first read.
    const originUrl = new URL(baseURL).origin
    let origin = state.origins.find((o) => o.origin === originUrl)
    if (!origin) {
      origin = { origin: originUrl, localStorage: [] }
      state.origins.push(origin)
    }
    for (const [k, v] of Object.entries(sessionTokens)) {
      // Drop any existing entry for the same key, then push fresh.
      origin.localStorage = origin.localStorage.filter((e) => e.name !== k)
      origin.localStorage.push({ name: k, value: v })
    }
    writeFileSync(statePath, JSON.stringify(state, null, 2))

    await browser.close()
    // Tiny wait lets the 2FA code for the next login be distinct.
    await new Promise((r) => setTimeout(r, 1500))
    console.log(`[global-setup] ${name} state saved → ${statePath}`)
  }
}
