/**
 * Boots the stack, logs in as admin + HR, visits each failing route, and
 * dumps the first visible text anchors. Helps us rewrite anchors from
 * reality instead of guessing.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from '../e2e.config.js'
import { boot } from '../src/stack/index.js'
import { seed } from '../src/stack/seed.js'
import { loginAsAdmin, loginAsHr } from '../src/lib/auth.js'

const FAILING_ROUTES = {
  admin: [
    '/premium-plan-manager',
    '/engagement/rewards',
  ],
  hr: [
    '/wellness/ranking',
    '/wellness/reports',
    '/wellness/analytics',
    '/wellness/settings',
  ],
  public: [
    '/rhclub/login',
  ],
}

async function harvest(page: import('@playwright/test').Page, route: string): Promise<{ url: string; title: string; headings: string[]; visibleText: string[] }> {
  try {
    await page.goto(route, { waitUntil: 'networkidle', timeout: 15_000 }).catch(() => {})
  } catch { /* continue to scrape whatever rendered */ }
  await page.waitForTimeout(800)

  const data = await page.evaluate(`(() => {
    const pickText = el => (el.textContent || '').trim().slice(0, 60)
    const isVisible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).filter(isVisible).map(pickText).filter(Boolean).slice(0, 8)
    const buttons = Array.from(document.querySelectorAll('button')).filter(isVisible).map(pickText).filter(Boolean).slice(0, 12)
    return { title: document.title, url: location.pathname, headings, visibleText: buttons }
  })()`) as { url: string; title: string; headings: string[]; visibleText: string[] }
  return data
}

async function main(): Promise<void> {
  const stack = await boot({ freshDb: true, captureLogs: true })
  try {
    await seed(config.db.url, config.testUsers)
    const browser = await chromium.launch()

    const out: Record<string, unknown> = {}

    const publicCtx = await browser.newContext({ baseURL: config.urls.backoffice })
    const publicPage = await publicCtx.newPage()
    for (const r of FAILING_ROUTES.public ?? []) {
      out[r] = await harvest(publicPage, r)
      console.log(r, '→', (out[r] as { headings: string[] }).headings.join(' | '))
    }
    await publicCtx.close()

    const adminCtx = await browser.newContext({ baseURL: config.urls.backoffice })
    const adminPage = await adminCtx.newPage()
    await loginAsAdmin(adminPage)
    for (const r of FAILING_ROUTES.admin) {
      out[r] = await harvest(adminPage, r)
      console.log(r, '→', (out[r] as { headings: string[] }).headings.join(' | '))
      const btns = (out[r] as { visibleText: string[] }).visibleText
      if (btns.length) console.log('   buttons:', btns.slice(0, 6).join(', '))
    }
    await adminCtx.close()

    const hrCtx = await browser.newContext({ baseURL: config.urls.backoffice })
    const hrPage = await hrCtx.newPage()
    await loginAsHr(hrPage)
    for (const r of FAILING_ROUTES.hr) {
      out[r] = await harvest(hrPage, r)
      console.log(r, '→', (out[r] as { headings: string[] }).headings.join(' | '))
      const btns = (out[r] as { visibleText: string[] }).visibleText
      if (btns.length) console.log('   buttons:', btns.slice(0, 6).join(', '))
    }
    await hrCtx.close()
    await browser.close()

    mkdirSync(resolve(process.cwd(), '.artifacts'), { recursive: true })
    writeFileSync(resolve(process.cwd(), '.artifacts/route-probe.json'), JSON.stringify(out, null, 2))
    console.log('\nwrote .artifacts/route-probe.json')
  } finally {
    await stack.teardown()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
