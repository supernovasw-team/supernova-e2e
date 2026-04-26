/**
 * Interface contract for stack orchestration. Keeps phase-1 (boot), phase-2
 * (seed), and downstream specs decoupled so they can be built in parallel.
 */

export interface StackHandle {
  /** Stop everything started by boot(). Idempotent. */
  teardown(): Promise<void>
  /** Kid process/logs for debugging. */
  status(): Promise<StackStatus>
}

export interface StackStatus {
  db: { up: boolean; url: string }
  backend: { up: boolean; url: string; pid?: number }
  backoffice: { up: boolean; url: string; pid?: number }
}

export interface BootOptions {
  /** Wipe + recreate DB before boot. Default true. */
  freshDb?: boolean
  /** Tail backend/backoffice stdout to files under runs/history/latest/. */
  captureLogs?: boolean
}

export interface SeedResult {
  admin: { id: number; email: string }
  hrAdmin: { id: number; email: string }
  endUser: { id: number; email: string }
  /** Any content fixtures created (therapies, self-cares, etc.) */
  content: Record<string, number[]>
  /** HR analytics population counts */
  analytics: {
    employees: number
    emotion_entries: number
    points_history: number
    reward_requests: number
    track_progress: number
  }
}
