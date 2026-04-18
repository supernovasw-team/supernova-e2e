import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/scenarios',
  testMatch: ['backoffice/**/*.spec.ts', 'backoffice-actions/**/*.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  globalSetup: './src/lib/global-setup.ts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'runs/history/latest/playwright-report', open: 'never' }],
    ['json', { outputFile: 'runs/history/latest/playwright.json' }],
  ],
  use: {
    baseURL: process.env.BACKOFFICE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'public',
      testMatch: ['**/00-smoke.spec.ts', '**/20-admin-public-*.spec.ts', '**/21-admin-public-*.spec.ts', '**/60-hr-public-*.spec.ts', '**/61-hr-public-*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin',
      testMatch: ['**/10-login-admin.spec.ts', '**/3?-admin-authed-*.spec.ts', '**/4?-admin-authed-*.spec.ts', '**/5?-admin-authed-*.spec.ts', '**/1??-admin-*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: '.artifacts/state/admin.json' },
    },
    {
      name: 'hr',
      testMatch: ['**/11-login-hr.spec.ts', '**/7?-hr-authed-*.spec.ts', '**/11?-hr-*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: '.artifacts/state/hr.json' },
    },
  ],
})
