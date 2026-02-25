---
phase: 01-backend-foundation-auth
plan: 02
subsystem: auth
tags: [jwt, supabase, bullmq, redis, upstash, jose, hono, nextjs-middleware, ssr]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Hono API with Drizzle schema, db/adminDb clients, stub routes with adminDb"
provides:
  - "Supabase JWT verification middleware using jose + JWKS (authMiddleware)"
  - "Firm context injection middleware extracting firm_id from JWT app_metadata (firmContextMiddleware)"
  - "Auth-protected API: all /api/* routes require valid JWT, data routes require firm context"
  - "BullMQ ingestion queue with Upstash Redis TLS connection"
  - "Separate worker entry point (src/worker.ts) for background job processing"
  - "Supabase SSR browser and server client utilities for frontend"
  - "Next.js middleware guarding /app/* routes with redirect-back auth flow"
  - "Frontend api.ts with authFetch helper for JWT-authenticated API calls"
affects:
  - 01-03
  - 02-ingestion-pipeline
  - 03-llm-extraction
  - 05-alerts-delivery

# Tech tracking
tech-stack:
  added:
    - "bullmq ^5.70.1 — BullMQ job queue (installed in apps/api)"
    - "@supabase/ssr ^0.8.0 — SSR Supabase client (already in frontend deps)"
    - "jose ^5.10.0 — JWT verification via JWKS (already in api deps)"
  patterns:
    - "JWKS-based RS256 JWT verification at module level (createRemoteJWKSet once per process)"
    - "Two-layer auth: authMiddleware (global) + firmContextMiddleware (data routes only)"
    - "Defense-in-depth: application-level firm_id WHERE clause + RLS safety net"
    - "Worker/Queue separation: Queue in API server, Worker as separate process"
    - "Next.js middleware cookie bridge pattern for Supabase SSR session refresh"
    - "authFetch wrapper: Supabase session -> Bearer token -> API request"

key-files:
  created:
    - apps/api/src/middleware/auth.ts
    - apps/api/src/middleware/firm-context.ts
    - apps/api/src/queues/connection.ts
    - apps/api/src/queues/ingestion.ts
    - apps/api/src/worker.ts
    - apps/api/src/tests/queue.test.ts
    - apps/j16z-frontend/src/lib/supabase/client.ts
    - apps/j16z-frontend/src/lib/supabase/server.ts
    - apps/j16z-frontend/middleware.ts
  modified:
    - apps/api/src/index.ts
    - apps/api/src/routes/deals.ts
    - apps/api/src/routes/events.ts
    - apps/api/src/routes/watchlists.ts
    - apps/api/src/routes/index.ts
    - apps/api/src/package.json
    - apps/j16z-frontend/src/lib/api.ts
    - apps/j16z-frontend/.env.local.example

key-decisions:
  - "firmContextMiddleware is NOT applied to /api/auth/* routes — onboarding endpoints need auth but may not have firm_id yet"
  - "Route handlers use adminDb with explicit firm_id WHERE clauses (defense-in-depth) rather than switching to RLS-scoped db"
  - "BullMQ ingestion queue uses Upstash Fixed plan; TLS enabled with empty tls: {} object"
  - "worker.ts is a separate entry point — never imported by API server (Queue for enqueue, Worker for process)"
  - "testRedisConnection uses BullMQ Queue.getJobCounts() rather than raw ioredis (ioredis not a BullMQ v5 peer dep)"
  - ".env.local.example force-added past .gitignore — .gitignore blocks all .env* but .example files should be tracked"

patterns-established:
  - "AuthEnv type exported from auth.ts — import in route files for type-safe c.get('firmId') access"
  - "All CREATE operations source firmId from JWT — never trust client-provided firm_id"
  - "Supabase middleware uses getUser() not getSession() — getUser() re-validates with server"

requirements-completed:
  - BACK-04
  - BACK-05
  - AUTH-03
  - AUTH-05

# Metrics
duration: 6min
completed: 2026-02-25
---

# Phase 01 Plan 02: Auth Middleware + BullMQ + Frontend API Wiring Summary

**Supabase RS256 JWT verification via JWKS wired into Hono API, BullMQ ingestion queue with Upstash Redis TLS, and Next.js middleware auth guard with JWT-authenticated frontend API calls**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-25T23:33:34Z
- **Completed:** 2026-02-25T23:39:38Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Auth-protected Hono API: JWKS-based JWT verification on all /api/* routes, firm_id context extraction scoped to data routes only
- BullMQ ingestion queue infrastructure with Upstash Redis TLS connection and separate worker entry point — 6 structural tests pass offline
- Frontend auth flow: Supabase SSR browser/server clients, Next.js middleware guarding /app/* with redirect-back pattern, and api.ts authFetch with Bearer token injection

## Task Commits

Each task was committed atomically:

1. **Task 1: Hono auth + firm context middleware, route updates** - `0aedc77` (feat)
2. **Task 2: BullMQ with Upstash Redis, worker entry point, queue tests** - `57b75eb` (feat)
3. **Task 3: Supabase SSR clients, Next.js middleware, frontend API wiring** - `14f9f24` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `apps/api/src/middleware/auth.ts` — JWT verification via createRemoteJWKSet (JWKS, RS256)
- `apps/api/src/middleware/firm-context.ts` — Extracts firm_id/user_id from JWT app_metadata
- `apps/api/src/index.ts` — Updated to wire authMiddleware globally + firmContextMiddleware on data routes
- `apps/api/src/routes/deals.ts` — Updated with AuthEnv type, firm_id WHERE clauses, firmId from JWT on insert
- `apps/api/src/routes/events.ts` — Updated with AuthEnv type, firm_id WHERE clauses
- `apps/api/src/routes/watchlists.ts` — Updated with AuthEnv type, firm_id + createdBy from JWT on insert
- `apps/api/src/routes/index.ts` — Changed from Hono router to named exports for index.ts direct mounting
- `apps/api/src/queues/connection.ts` — Upstash Redis connection config + testRedisConnection utility
- `apps/api/src/queues/ingestion.ts` — BullMQ Queue 'ingestion' with retry/retention settings
- `apps/api/src/worker.ts` — Separate worker process with graceful SIGTERM/SIGINT shutdown
- `apps/api/src/tests/queue.test.ts` — 6 structural tests (offline): queue name, connection shape, job options
- `apps/api/package.json` — Added bullmq dep + worker/worker:dev scripts
- `apps/j16z-frontend/src/lib/supabase/client.ts` — createBrowserClient for Client Components
- `apps/j16z-frontend/src/lib/supabase/server.ts` — createServerClient with cookie bridge for Server Components
- `apps/j16z-frontend/middleware.ts` — Auth guard: /app/* → /login?next=, /login → /app/inbox if authenticated
- `apps/j16z-frontend/src/lib/api.ts` — authFetch helper + all real-mode calls wired to NEXT_PUBLIC_API_URL
- `apps/j16z-frontend/.env.local.example` — Updated with NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, API_URL

## Decisions Made

- `firmContextMiddleware` is NOT applied to `/api/auth/*` — first-time users may not have `firm_id` in JWT yet (Plan 01-03 creates onboard/me endpoints)
- Route handlers use `adminDb` with explicit `firm_id` WHERE clauses rather than switching to RLS-scoped `db` — defense-in-depth at application level with RLS as safety net
- `testRedisConnection` uses `Queue.getJobCounts()` instead of raw `ioredis` — ioredis is not a BullMQ v5 peer dependency (discovered and fixed per Rule 3)
- `.env.local.example` force-added past `.gitignore` — the gitignore blocks `*.env*` patterns but example files should be tracked for team setup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] testRedisConnection used ioredis which is not installed**
- **Found during:** Task 2 (TypeScript check after creating connection.ts)
- **Issue:** Plan said to use `ioredis` for the ping test utility but BullMQ v5 does not list ioredis as a peer dependency — it was not installed
- **Fix:** Rewrote `testRedisConnection` to use `Queue.getJobCounts()` via BullMQ's existing Redis connection instead of raw ioredis
- **Files modified:** `apps/api/src/queues/connection.ts`
- **Verification:** `npx tsc --noEmit` passes cleanly; test still validates connectivity intent
- **Committed in:** `57b75eb` (Task 2 commit)

**2. [Rule 3 - Blocking] .env.local.example blocked by .gitignore**
- **Found during:** Task 3 commit
- **Issue:** `apps/j16z-frontend/.gitignore` contains `.env*` which matches `.env.local.example`
- **Fix:** Used `git add -f` to force-add the example file — example files should be tracked for team setup
- **Files modified:** `apps/j16z-frontend/.env.local.example`
- **Committed in:** `14f9f24` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues)
**Impact on plan:** Both fixes necessary for build correctness and repo usability. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `notifications-inbox.tsx` and `event-timeline.tsx` (`.materiality` field mismatch) — out of scope, logged to `deferred-items.md` in phase directory
- `pnpm test:be` (vitest --project=j16z-backend) fails with "No projects matched" — vitest workspace config has a version incompatibility between the `defineWorkspace` import and vitest v4.0.15; tests run successfully when invoked directly via `npx vitest run <file>`

## User Setup Required

**External services require manual configuration before the API can be started in production mode:**

### Supabase
1. Create Supabase project at https://supabase.com/dashboard
2. Enable Custom Access Token Hook: Authentication → Hooks → Custom Access Token Hook → point to `public.custom_access_token_hook`
3. Set env vars in `apps/api/.env.local` and `apps/j16z-frontend/.env.local`:
   - `SUPABASE_URL` (API server)
   - `SUPABASE_SERVICE_ROLE_KEY` (API server)
   - `DATABASE_URL` (pooled port 6543)
   - `SUPABASE_DB_URL_SERVICE_ROLE` (direct port 5432)
   - `NEXT_PUBLIC_SUPABASE_URL` (frontend)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)

### Upstash Redis
1. Create Upstash Redis database at https://console.upstash.com (use Fixed plan)
2. Set env vars in `apps/api/.env.local`:
   - `UPSTASH_REDIS_HOST` (endpoint without `rediss://` prefix)
   - `UPSTASH_REDIS_PASSWORD`

## Next Phase Readiness

- API is fully auth-protected — ready for Plan 01-03 (onboarding + auth routes)
- BullMQ queue infrastructure ready for Phase 2 ingestion workers
- Frontend can switch from mock data to real API via `NEXT_PUBLIC_USE_MOCK_DATA=false`
- Auth guard in Next.js middleware prevents unauthorized /app/* access

---
*Phase: 01-backend-foundation-auth*
*Completed: 2026-02-25*

## Self-Check: PASSED

All 12 created/modified files verified present on disk.
All 3 task commits verified in git log: `0aedc77`, `57b75eb`, `14f9f24`.
