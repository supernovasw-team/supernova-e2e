import { resolve } from 'node:path'

// Where the sibling repos live. Override via env.
export const config = {
  repos: {
    backend: process.env.E2E_BACKEND_PATH ?? resolve(process.env.HOME!, 'Documents/supernova/saude_mental_backend'),
    backoffice: process.env.E2E_BACKOFFICE_PATH ?? resolve(process.env.HOME!, 'Documents/supernova/saude_mental_backoffice'),
    app: process.env.E2E_APP_PATH ?? resolve(process.env.HOME!, 'Documents/supernova/saude_mental_app'),
  },
  ports: {
    backend: Number(process.env.E2E_BACKEND_PORT ?? 8088),
    backoffice: Number(process.env.E2E_BACKOFFICE_PORT ?? 3000),
    metro: Number(process.env.E2E_METRO_PORT ?? 8081),
  },
  urls: {
    backend: process.env.BACKEND_URL ?? 'http://localhost:8088',
    backoffice: process.env.BACKOFFICE_URL ?? 'http://localhost:3000',
  },
  db: {
    url: process.env.E2E_DATABASE_URL ?? 'postgresql://sabino@localhost:5432/saude_mental_e2e?schema=public',
    snapshotPath: '.artifacts/db/snapshot.sql',
  },
  testUsers: {
    admin: {
      email: process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@supernovasw.com',
      password: process.env.E2E_ADMIN_PASSWORD ?? 'changeme',
    },
    hrAdmin: {
      email: process.env.E2E_HR_EMAIL ?? 'e2e-hr@supernovasw.com',
      password: process.env.E2E_HR_PASSWORD ?? 'changeme',
    },
    endUser: {
      email: process.env.E2E_USER_EMAIL ?? 'e2e-user@supernovasw.com',
      password: process.env.E2E_USER_PASSWORD ?? 'changeme',
    },
  },
  screenshots: {
    dir: '.artifacts/screenshots',
    fullPage: true,
    visualDiffThreshold: 0.02,
  },
  emulator: {
    // If Android emulator not running, CLI will abort in doctor step.
    requireRunning: true,
  },
}

export type E2eConfig = typeof config
