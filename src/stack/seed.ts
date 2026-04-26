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

// ── Deterministic PRNG (mulberry32) ──────────────────────────────────────────
function makePrng(seed: number) {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = makePrng(0xdead_beef)

function randInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

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

    // ── 3b. App user (Maestro flows login with these creds) ────────────────
    if (users.appUser) {
      const appHash = await hashPassword(users.appUser.password)
      await prisma.user.upsert({
        where: { email: users.appUser.email },
        create: {
          ...PLACEHOLDER,
          first_name: 'App',
          last_name: 'User',
          email: users.appUser.email,
          hash: appHash,
          freemium: true,
        },
        update: {
          hash: appHash,
          freemium: true,
        },
      })
    }

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

    // ── 5. HR analytics data ───────────────────────────────────────────────
    const SECTORS = ['TI', 'RH', 'Vendas', 'Suporte']
    const EMPLOYEE_NAMES = [
      ['Ana', 'Costa'], ['Bruno', 'Lima'], ['Carla', 'Mendes'],
      ['Diego', 'Alves'], ['Elena', 'Rocha'], ['Fabio', 'Nunes'],
      ['Gisele', 'Pinto'], ['Henrique', 'Borges'], ['Ines', 'Ferreira'],
      ['Joao', 'Cardoso'],
    ]

    // 5a. Create 10 B2B employees and link to plan
    const employeeIds: number[] = []
    for (let i = 0; i < 10; i++) {
      const [first, last] = EMPLOYEE_NAMES[i]
      const sector = SECTORS[i % SECTORS.length]
      const email = `e2e.emp${i + 1}@corp.test`
      const empHash = await hashPassword('E2eEmp123!')
      const emp = await prisma.user.upsert({
        where: { email },
        create: {
          email, hash: empHash,
          first_name: first, last_name: last,
          birthday: '1992-06-15',
          eula: true,
          freemium: false,
          sector,
          job_title: `${sector} Analyst`,
        },
        update: { sector, job_title: `${sector} Analyst` },
      })
      employeeIds.push(emp.id as number)
      // link to B2B plan (idempotent — no unique constraint on (userId,planId) in UserPlan)
      const existingUserPlan = await prisma.userPlan.findFirst({ where: { userId: emp.id, planId: b2bPlan.id } })
      if (!existingUserPlan) {
        await prisma.userPlan.create({ data: { userId: emp.id, planId: b2bPlan.id, isActive: true } })
      } else if (!existingUserPlan.isActive) {
        await prisma.userPlan.update({ where: { id: existingUserPlan.id }, data: { isActive: true } })
      }
    }

    // 5b. Emotion entries — 14 per employee across last 30 days (deterministic)
    let emotionCount = 0
    const now = new Date()
    for (const uid of employeeIds) {
      // pick 14 distinct days from past 30
      const days = Array.from({ length: 30 }, (_, d) => d)
      const chosen: number[] = []
      while (chosen.length < 14) {
        const d = pick(days)
        if (!chosen.includes(d)) chosen.push(d)
      }
      for (const daysAgo of chosen) {
        const entryDate = new Date(now)
        entryDate.setDate(entryDate.getDate() - daysAgo)
        const dateOnly = entryDate.toISOString().split('T')[0]
        const existing = await prisma.emotionEntry.findFirst({ where: { userId: uid, entryDate: new Date(dateOnly) } })
        if (!existing) {
          // emotionId 1-12, positive IDs: 1,2,3,4,5 (joy), negative: 6-12 (anxiety/stress)
          const emotionId = randInt(1, 12)
          await prisma.emotionEntry.create({ data: { userId: uid, emotionId, entryDate: new Date(dateOnly) } })
          emotionCount++
        }
      }
    }

    // 5c. Points history — 30-50 entries per employee
    const ACTIVITY_TYPES = [
      { type: 'TRACK_COMPLETED', cat: 'selfcare' },
      { type: 'selfcare', cat: 'selfcare' },
      { type: 'mood_entry', cat: 'emotion_diary' },
      { type: 'therapy_completion', cat: 'terapia_guiada' },
      { type: 'challenge_completion', cat: 'challenge' },
    ]
    let pointsCount = 0
    for (const uid of employeeIds) {
      const entries = randInt(30, 50)
      for (let e = 0; e < entries; e++) {
        const act = pick(ACTIVITY_TYPES)
        const pts = randInt(5, 50)
        const daysAgo = randInt(0, 29)
        const createdAt = new Date(now)
        createdAt.setDate(createdAt.getDate() - daysAgo)
        await prisma.userPointsHistory.create({
          data: {
            userId: uid,
            points: pts,
            activity_type: act.type,
            category: act.cat,
            description: `E2E seed — ${act.type}`,
            createdAt,
          },
        })
        pointsCount++
      }
    }

    // 5d. UserGamification totals (upsert = idempotent)
    for (const uid of employeeIds) {
      const agg = await prisma.userPointsHistory.aggregate({
        where: { userId: uid },
        _sum: { points: true },
      })
      const total = (agg._sum.points as number | null) ?? 0
      await prisma.userGamification.upsert({
        where: { userId: uid },
        create: { userId: uid, total_points: total, current_streak_days: randInt(1, 14), longest_streak_days: randInt(5, 30) },
        update: { total_points: total },
      })
    }

    // 5e. Reward + reward_requests — need a reward record first
    const rewardName = 'E2E — Vale Presente R$50'
    let reward = await prisma.reward.findFirst({ where: { name: rewardName, planId: b2bPlan.id } })
    if (!reward) {
      reward = await prisma.reward.create({
        data: {
          planId: b2bPlan.id,
          name: rewardName,
          description: 'Vale presente para colaboradores',
          cost_points: 200,
          category: 'digital',
          stock: 100,
          is_active: true,
        },
      })
    }

    // 5 PENDING + 3 APPROVED + 2 DENIED = 10 requests across employees
    const requestSpecs: Array<{ status: string; idx: number }> = [
      ...Array.from({ length: 5 }, (_, i) => ({ status: 'PENDING', idx: i })),
      ...Array.from({ length: 3 }, (_, i) => ({ status: 'APPROVED', idx: i + 5 })),
      ...Array.from({ length: 2 }, (_, i) => ({ status: 'DENIED', idx: i + 8 })),
    ]
    let rewardReqCount = 0
    for (const spec of requestSpecs) {
      const uid = employeeIds[spec.idx % employeeIds.length]
      const existing = await prisma.rewardRequest.findFirst({ where: { userId: uid, rewardId: reward.id, status: spec.status as any } })
      if (!existing) {
        await prisma.rewardRequest.create({
          data: {
            userId: uid,
            planId: b2bPlan.id,
            rewardId: reward.id,
            status: spec.status as any,
            ...(spec.status === 'DENIED' ? { denial_reason: 'Pontos insuficientes no momento do processamento.' } : {}),
          },
        })
        rewardReqCount++
      }
    }

    // 5f. TrackProgress — 5 selfcares + 3 therapies (some completed, some partial)
    const trackSpecs = [
      ...selfCareIds.slice(0, 3).map((id) => ({ trackId: id, trackType: 'selfcare', overallProgress: randInt(60, 100), isCompleted: true })),
      ...selfCareIds.slice(0, 2).map((id) => ({ trackId: id, trackType: 'selfcare', overallProgress: randInt(20, 59), isCompleted: false })),
      ...therapyIds.slice(0, 2).map((id) => ({ trackId: id, trackType: 'therapy', overallProgress: randInt(50, 100), isCompleted: true })),
      ...therapyIds.slice(0, 1).map((id) => ({ trackId: id, trackType: 'therapy', overallProgress: randInt(10, 49), isCompleted: false })),
    ]
    let trackProgressCount = 0
    for (const uid of employeeIds.slice(0, 5)) {
      for (const spec of trackSpecs) {
        const existing = await prisma.trackProgress.findFirst({ where: { userId: uid, trackId: spec.trackId, trackType: spec.trackType } })
        if (!existing) {
          await prisma.trackProgress.create({
            data: {
              userId: uid,
              trackId: spec.trackId,
              trackType: spec.trackType,
              overallProgress: spec.overallProgress,
              totalContents: 3,
              completedContents: spec.isCompleted ? 3 : randInt(1, 2),
              isCompleted: spec.isCompleted,
              lastContentActivity: new Date(),
            },
          })
          trackProgressCount++
        }
      }
    }

    // 5g. user_favorites — first 4 employees get 2-3 content items favorited
    for (let i = 0; i < 4; i++) {
      const uid = employeeIds[i]
      const scId = selfCareIds[i % selfCareIds.length]
      const thId = therapyIds[i % therapyIds.length]
      const scExists = await prisma.favoriteSelfCare.findFirst({ where: { userId: uid, selfCareId: scId } })
      if (!scExists) await prisma.favoriteSelfCare.create({ data: { userId: uid, selfCareId: scId } })
      const thExists = await prisma.favoriteTherapy.findFirst({ where: { userId: uid, therapyId: thId } })
      if (!thExists) await prisma.favoriteTherapy.create({ data: { userId: uid, therapyId: thId } })
      if (i < 2 && selfCareIds.length > 1) {
        const scId2 = selfCareIds[(i + 1) % selfCareIds.length]
        const sc2Exists = await prisma.favoriteSelfCare.findFirst({ where: { userId: uid, selfCareId: scId2 } })
        if (!sc2Exists) await prisma.favoriteSelfCare.create({ data: { userId: uid, selfCareId: scId2 } })
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
      analytics: {
        employees: employeeIds.length,
        emotion_entries: emotionCount,
        points_history: pointsCount,
        reward_requests: rewardReqCount,
        track_progress: trackProgressCount,
      },
    }
  } finally {
    await prisma.$disconnect()
  }
}
