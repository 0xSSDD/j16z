---
phase: 01-backend-foundation-auth
plan: 01
subsystem: api
tags: [hono, drizzle-orm, postgres, supabase, rls, multi-tenant, typescript]

requires: []
provides:
  - Hono API service at apps/api/ running on port 3001 with /health endpoint
  - Complete Drizzle ORM schema for all 13 j16z domain tables with firm_id, deleted_at, RLS policies
  - Stub CRUD routes for deals, events, and watchlists querying real database (empty array response)
  - Seed scaffold with seedFirm() function and 4 starter deals (US Steel, Broadcom/VMware, MSFT/Activision, ServiceNow/Procore)
  - Two Drizzle clients: db (RLS-respecting pooled) and adminDb (service-role direct connection)
  - vitest.workspace.ts at monorepo root with j16z-frontend, j16z-backend, and isolation test projects
affects:
  - 01-02-auth-middleware (depends on this for route structure and db clients)
  - 01-03-seed-data (depends on this for schema and seedFirm skeleton)
  - 02-sec-edgar-ingestion (uses deals/filings/events schema)
  - 03-court-listener (uses events/clauses schema)
  - All future plans that query the database

tech-stack:
  added:
    - hono@^4.7.4 (HTTP routing framework)
    - "@hono/node-server@^1.13.7" (Node.js adapter for Hono)
    - "@hono/zod-validator@^0.4.3" (request body validation)
    - drizzle-orm@^0.44.2 (type-safe SQL ORM)
    - drizzle-kit@^0.30.5 (migration generation CLI)
    - postgres@^3.4.5 (postgres.js driver, Supabase recommended)
    - jose@^5.10.0 (JWT verification, Web Crypto API)
    - dotenv@^16.4.7 (env variable loading)
  patterns:
    - Two Drizzle clients pattern (db for RLS user queries, adminDb for service-role admin)
    - firmIsolationPolicies() helper generates SELECT/INSERT/UPDATE/DELETE pgPolicy for each table
    - firmIdFromJwt subquery pattern: wraps auth.jwt() in (select ...) to evaluate once per statement
    - Soft delete pattern: isNull(schema.deals.deletedAt) in every WHERE clause
    - prepare: false on all postgres() connections for Supabase connection pooler compatibility

key-files:
  created:
    - apps/api/package.json
    - apps/api/tsconfig.json
    - apps/api/drizzle.config.ts
    - apps/api/.env.example
    - apps/api/src/index.ts
    - apps/api/src/db/schema.ts
    - apps/api/src/db/index.ts
    - apps/api/src/db/seed.ts
    - apps/api/src/routes/index.ts
    - apps/api/src/routes/deals.ts
    - apps/api/src/routes/events.ts
    - apps/api/src/routes/watchlists.ts
    - vitest.workspace.ts
  modified:
    - pnpm-lock.yaml (new workspace package dependencies)

key-decisions:
  - "Use postgres.js driver (not pg/node-postgres) per Drizzle's Supabase recommendation"
  - "prepare: false required for all postgres() connections when using Supabase connection pooler in Transaction mode"
  - "firmIdFromJwt wraps auth.jwt() in a subquery to prevent per-row evaluation in RLS policies"
  - "adminDb uses direct connection (port 5432, no pooler) for service-role bypass of RLS"
  - "db uses pooled connection (port 6543) for user-facing RLS-respecting queries"
  - "Routes temporarily use adminDb - Plan 01-02 adds JWT auth middleware to switch to RLS-scoped db"
  - "Seed deals are per-firm copies (not shared global records) so each firm can independently soft-delete/restore"
  - "vitest isolation project is the CI gate for AUTH-06 cross-tenant test"

patterns-established:
  - "Soft delete: always use isNull(schema.table.deletedAt) in WHERE clauses - never hard delete"
  - "All entity tables get firm_id FK + deleted_at + firmIsolationPolicies() RLS"
  - "firmIsolationPolicies() helper for consistent SELECT/INSERT/UPDATE/DELETE RLS on all tables"
  - "Global Hono error handler returns structured JSON {error, message} instead of plain text"

requirements-completed:
  - BACK-01
  - BACK-02
  - BACK-03

duration: 6min
completed: 2026-02-25
---

# Phase 1 Plan 01: Backend Foundation + Schema Summary

**Hono API server at apps/api/ with 13-table Drizzle ORM schema covering all j16z domain entities, firm_id multi-tenant RLS policies via pgPolicy, and stub CRUD routes for deals/events/watchlists**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-25T23:23:44Z
- **Completed:** 2026-02-25T23:29:09Z
- **Tasks:** 3 of 3
- **Files modified:** 13 created, 1 modified (pnpm-lock.yaml)

## Accomplishments

- Hono API server starts on port 3001 with GET /health returning `{ status: "ok", timestamp }` verified
- Complete Drizzle schema with all 13 domain tables: firms, firm_members, invites, deals, events, filings, clauses, market_snapshots, news_items, watchlists, watchlist_deals, alert_rules, audit_log
- Every entity table includes firm_id FK, created_at, updated_at, deleted_at (soft delete); audit_log is immutable with no deleted_at
- RLS policies via pgPolicy on all entity tables using app_metadata.firm_id from custom access token hook JWT
- Stub routes for deals (GET/POST/PATCH/DELETE), events (GET, GET/:id), watchlists (GET, GET/:id, POST) all querying real database
- Seed scaffold with seedFirm() function inserting 4 starter deals and a "Top Active Deals" watchlist

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold apps/api/ package with Hono + Drizzle dependencies** - `3e4b88b` (feat)
2. **Task 2: Define complete Drizzle schema with all domain tables, RLS policies** - `e4578b9` (feat)
3. **Task 3: Create Hono server entry point with health check and stub CRUD routes** - `200649f` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `apps/api/package.json` - @j16z/api workspace package, all runtime + dev dependencies
- `apps/api/tsconfig.json` - TypeScript config extending monorepo base, NodeNext module resolution
- `apps/api/drizzle.config.ts` - Drizzle Kit config: schema path, drizzle/ output, postgresql dialect, RLS entities
- `apps/api/.env.example` - All required environment variables with placeholder values
- `apps/api/src/index.ts` - Hono server entry: logger, CORS, global error handler, /health, /api routes
- `apps/api/src/db/schema.ts` - All 13 domain tables with timestamps, firm_id, deleted_at, pgPolicy RLS
- `apps/api/src/db/index.ts` - Two Drizzle clients: db (RLS pooled) and adminDb (service-role direct)
- `apps/api/src/db/seed.ts` - seedFirm() with 4 starter deals + Top Active Deals watchlist
- `apps/api/src/routes/index.ts` - Route aggregation mounting deals/events/watchlists at /api
- `apps/api/src/routes/deals.ts` - CRUD routes with Zod validation and soft delete
- `apps/api/src/routes/events.ts` - GET all (with ?dealId filter) and GET by id
- `apps/api/src/routes/watchlists.ts` - GET all, GET/:id with joined deals, POST create
- `vitest.workspace.ts` - Monorepo vitest workspace: j16z-frontend, j16z-backend, isolation (CI gate) projects
- `pnpm-lock.yaml` - Updated with new @j16z/api workspace package dependencies

## Decisions Made

- Used `postgres` (postgres.js) driver not `pg` (node-postgres) — Drizzle's official Supabase recommendation
- `prepare: false` on all postgres() connections — required for Supabase PgBouncer Transaction mode
- `firmIdFromJwt` SQL helper wraps `auth.jwt()` in a subquery to evaluate once per statement (not per-row), preventing a known Postgres RLS performance pitfall
- `adminDb` uses direct connection (port 5432, no pooler) for service-role bypass; `db` uses pooled connection (port 6543) for user-facing RLS queries
- Routes temporarily use `adminDb` — Plan 01-02 adds JWT auth middleware to switch to RLS-scoped `db` client with JWT context
- Seed deals are per-firm copies (not shared global records) so each firm can independently soft-delete/restore their starter content
- `vitest isolation` project is a dedicated CI gate for AUTH-06 cross-tenant isolation test (separate from regular j16z-backend tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added global JSON error handler to Hono app**
- **Found during:** Task 3 verification
- **Issue:** Without an error handler, Drizzle DB connection errors returned plain text "Internal Server Error" from Hono's default handler
- **Fix:** Added `app.onError()` handler returning structured JSON `{ error, message }` with 500 status
- **Files modified:** apps/api/src/index.ts
- **Verification:** Server returns JSON error response for DB connection failures
- **Committed in:** 200649f (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for API usability — prevents opaque text errors. No scope creep.

## Issues Encountered

- `.env.example` matched `.gitignore`'s `.env*` pattern — added with `git add -f` since example files contain no secrets and must be committed for developer onboarding
- Verification command `npx tsx -e "import * as s from './src/db/schema.js'"` failed in inline eval mode due to tsx CJS module resolution — verified schema instead via `grep -c "pgTable"` and `grep "^export const"` which confirmed all 13 tables present

## User Setup Required

External services require manual configuration before the database layer will function:

1. **Supabase project** — Create a Supabase project and get DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
2. **Copy .env.example** — `cp apps/api/.env.example apps/api/.env` and fill in values
3. **Run migrations** — `cd apps/api && pnpm db:generate && pnpm db:migrate` (requires direct DB connection at port 5432)
4. **Custom Access Token Hook** — Register the Postgres hook in Supabase Dashboard (Authentication > Hooks) to inject `firm_id` into JWT `app_metadata` — required for RLS policies to function
5. **Test health** — `curl http://localhost:3001/health` should return `{ "status": "ok" }`

## Next Phase Readiness

- Plan 01-02 (auth middleware) can now add Supabase JWT verification middleware to the Hono routes in `src/index.ts` and switch route handlers from `adminDb` to RLS-scoped `db` with JWT context
- Plan 01-03 (seed data) can now implement the full `seedFirm()` body with complete deal data, events, filings, and market snapshots — the schema and function skeleton are in place
- The `firmIsolationPolicies()` pattern is established — all future entity tables should follow it

## Self-Check: PASSED

All created files verified as present on disk. All task commits verified in git history.

| Check | Result |
|-------|--------|
| apps/api/package.json | FOUND |
| apps/api/tsconfig.json | FOUND |
| apps/api/drizzle.config.ts | FOUND |
| apps/api/.env.example | FOUND |
| apps/api/src/index.ts | FOUND |
| apps/api/src/db/schema.ts | FOUND |
| apps/api/src/db/index.ts | FOUND |
| apps/api/src/db/seed.ts | FOUND |
| apps/api/src/routes/index.ts | FOUND |
| apps/api/src/routes/deals.ts | FOUND |
| apps/api/src/routes/events.ts | FOUND |
| apps/api/src/routes/watchlists.ts | FOUND |
| vitest.workspace.ts | FOUND |
| Commit 3e4b88b (Task 1) | FOUND |
| Commit e4578b9 (Task 2) | FOUND |
| Commit 200649f (Task 3) | FOUND |

---
*Phase: 01-backend-foundation-auth*
*Completed: 2026-02-25*
