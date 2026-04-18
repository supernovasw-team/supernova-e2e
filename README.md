# supernova-e2e

Full-stack E2E regression suite for SaudeMental.club+.

Runs backoffice (Playwright), app (Maestro), and backend (Prisma + API) in lockstep against a local stack so **one command** exercises every layer and catches cross-stack regressions before a PR merges.

## Coverage

| Layer | Tool | What it hits |
|-------|------|--------------|
| Backoffice (admin) | Playwright | Every admin + HR route, full-page screenshot per page |
| App (Android) | Maestro | Flows already in `saude_mental_app/.maestro/` |
| Backend API | fetch helpers | Auth, CRUD, gamification endpoints |
| Database | Prisma | Row-level assertions after writes |

## Quick start

```bash
# One-time setup
npm install
npx e2e doctor        # verifies: sibling repos, postgres, emulator, maestro CLI

# Full run — boot stack → seed → all scenarios → teardown → report
npx e2e run

# Options
npx e2e run --only=premium-toggle
npx e2e run --screenshots-only         # navigate + capture, no assertions
npx e2e run --visual-regression        # compare with baseline, fail if diff > threshold
npx e2e ocr-index                      # extract text from all PNGs (tesseract)
npx e2e baseline update                # promote latest run to baseline
npx e2e report --open                  # open HTML report
```

## Layout

```
supernova-e2e/
├── src/
│   ├── cli/              # commander CLI: run, doctor, report, baseline, ocr-index
│   ├── stack/            # boot/teardown backend + backoffice + DB
│   ├── lib/              # db.ts (prisma), api.ts, auth.ts (2FA capture), app.ts (maestro runner)
│   └── scenarios/
│       ├── backoffice/   # Playwright *.spec.ts — one per route + cross-stack
│       └── cross-stack/  # multi-tool scenarios (admin creates → app sees)
├── fixtures/             # seed data, SQL snapshots
├── runs/history/          # per-run artifacts (gitignored)
├── .artifacts/
│   ├── screenshots/
│   │   ├── backoffice/   # captured every run (gitignored)
│   │   ├── app/          # captured every run (gitignored)
│   │   └── _baseline/    # golden master (committed)
│   ├── ocr/              # text extracted from screenshots (gitignored)
│   └── visual-diff/      # pixelmatch diffs (gitignored)
├── e2e.config.ts
├── playwright.config.ts
└── package.json
```

## 2FA

Admin and HR logins both require a 2FA code. The test runner captures the real code from the dev backend (not bypassed) and submits it — so the full auth flow is exercised. See `src/lib/auth.ts`.

## Cross-stack scenarios

See `src/scenarios/cross-stack/`:
- `admin-publishes-content.ts` — admin creates Self-Care → DB assert → Maestro opens list, asserts title visible.
- `user-logs-mood.ts` — Maestro registers mood → DB assert → Playwright backoffice analytics shows it.
- `premium-toggle.ts` — Playwright toggles premium → DB assert → Maestro verifies "Premium" in Minha Assinatura.
- `gamification-completes.ts` — Maestro completes trilha → `track_progress` row → backoffice HR dashboard.

## CI

Not wired yet — `doctor` is designed to fail loudly on any missing prerequisite, making it easy to add as a GitHub Action with services (Postgres) + emulator runner.
