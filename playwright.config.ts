import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/scenarios/backoffice',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
