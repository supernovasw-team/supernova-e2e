/**
 * Phase-2 DB seeder.
 *
 * Imports Prisma client and argon2 from the backend's node_modules at runtime
 * via createRequire — avoids running `prisma generate` inside this package
 * while still reusing the already-generated client and native binary.
 *
 * Run after the DB has been migrated (phase-1 boot).
 */

import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SeedResult } from './types.js'
import type { E2eConfig } from '../../e2e.config.js'

// ── Resolve backend root ────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = resolve(
  process.env.E2E_BACKEND_PATH ??
    resolve(process.env.HOME!, 'Documents/supernova/saude_mental_backend'),
)
const backendRequire = createRequire(resolve(BACKEND_ROOT, 'node_modules/'))

// ── Runtime imports from backend ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { PrismaClient } = backendRequire('.prisma/client/index.js') as any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { hash: argon2hash, Algorithm } = backendRequire('@node-rs/argon2') as any

// ── Fixture data ─────────────────────────────────────────────────────────────
import seedData from '../../fixtures/seed-data.json' with { type: 'json' }

// ── Helpers ──────────────────────────────────────────────────────────────────
async function hashPassword(plain: string): Promise<string> {
  return argon2hash(plain, { algorithm: Algorithm.Argon2id }) as Promise<string>
}

const PLACEHOLDER = {
  first_name: 'E2E',
  last_name: 'Test',
  birthday: '1990-01-01',
  eula: true,
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function seed(
  dbUrl: string,
  users: E2eConfig['testUsers'],
): Promise<SeedResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } }) as any

  try {
    // ── 1. Admin user ──────────────────────────────────────────────────────
    const adminHash = await hashPassword(users.admin.password)
    const admin = await prisma.user.upsert({
      where: { email: users.admin.email },
      create: {
        ...PLACEHOLDER,
        email: users.admin.email,
        hash: adminHash,
        admin: true,
        can_create_content: true,
        freemium: false,
      },
      update: {
        hash: adminHash,
        admin: true,
        can_create_content: true,
      },
    })

    // ── 2. HR plan admin user + B2B plan ───────────────────────────────────
    const hrHash = await hashPassword(users.hrAdmin.password)
    const hrUser = await prisma.user.upsert({
      where: { email: users.hrAdmin.email },
      create: {
        ...PLACEHOLDER,
        first_name: 'HR',
        last_name: 'Admin',
        email: users.hrAdmin.email,
        hash: hrHash,
        plan_admin: true,
        freemium: false,
      },
      update: {
        hash: hrHash,
        plan_admin: true,
      },
    })

    // Create (or find) the B2B plan
    const existingPlan = await prisma.plan.findFirst({
      where: { name: seedData.b2b_plan.name },
    })

    const b2bPlan = existingPlan ?? (await prisma.plan.create({
      data: {
        name: seedData.b2b_plan.name,
        type: 'B2B',
        articlesIds: [],
        selfcaresIds: [],
        coursesIds: [],
        therapiesIds: [],
        programasIds: [],
      },
    }))

    // Link HR user to plan as plan admin (idempotent)
    await prisma.planAdmin.upsert({
      where: { userId_planId: { userId: hrUser.id, planId: b2bPlan.id } },
      create: { userId: hrUser.id, planId: b2bPlan.id },
      update: {},
    })

    // ── 3. End user ────────────────────────────────────────────────────────
    const endUserHash = await hashPassword(users.endUser.password)
    const endUser = await prisma.user.upsert({
      where: { email: users.endUser.email },
      create: {
        ...PLACEHOLDER,
        first_name: 'End',
        last_name: 'User',
        email: users.endUser.email,
        hash: endUserHash,
        freemium: true,
      },
      update: {
        hash: endUserHash,
        freemium: true,
      },
    })

    // ── 4. Content fixtures (owned by admin) ──────────────────────────────
    const selfCareIds: number[] = []
    for (const sc of seedData.self_care) {
      const existing = await prisma.selfcare.findFirst({ where: { name: sc.name } })
      if (existing) {
        selfCareIds.push(existing.id as number)
      } else {
        const created = await prisma.selfcare.create({
          data: {
            name: sc.name,
            description: sc.description,
            n_audios: sc.n_audios,
            isFree: sc.isFree,
            published: true,
            n_subscriptions: 0,
            userId: admin.id,
          },
        })
        selfCareIds.push(created.id as number)
      }
    }

    const therapyIds: number[] = []
    for (const th of seedData.therapy) {
      const existing = await prisma.terapia.findFirst({ where: { name: th.name } })
      if (existing) {
        therapyIds.push(existing.id as number)
      } else {
        const created = await prisma.terapia.create({
          data: {
            name: th.name,
            description: th.description,
            n_audios: th.n_audios,
            isFree: th.isFree,
            published: true,
            n_subscriptions: 0,
            userId: admin.id,
          },
        })
        therapyIds.push(created.id as number)
      }
    }

    return {
      admin: { id: admin.id as number, email: admin.email as string },
      hrAdmin: { id: hrUser.id as number, email: hrUser.email as string },
      endUser: { id: endUser.id as number, email: endUser.email as string },
      content: {
        self_care: selfCareIds,
        therapy: therapyIds,
      },
    }
  } finally {
    await prisma.$disconnect()
  }
}
