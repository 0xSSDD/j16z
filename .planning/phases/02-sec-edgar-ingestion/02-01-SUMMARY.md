---
phase: 02-sec-edgar-ingestion
plan: 02-01
subsystem: api
tags: [edgar, sec, rate-limiter, bullmq, cron, drizzle, schema-migration, postgres, zod]

# Dependency graph
requires:
  - phase: 01-backend-foundation-auth
    provides: Drizzle schema, BullMQ queue/connection setup, Hono server entry point

provides:
  - EDGAR HTTP client with 9 req/s rate limiter and mandatory User-Agent header
  - Global filings table (no firm_id, no RLS) with status column
  - CIK resolver with 15-minute company_tickers.json cache
  - BullMQ 15-minute cron scheduler registered at server startup
  - deals table with acquirerCik, targetCik, source columns; nullable firmId

affects:
  - 02-02-edgar-poller (uses edgarFetch, TRACKED_FORM_TYPES, filings schema)
  - 02-03-edgar-routes (uses filings global table, status column, timestamps)
  - 03-llm-extraction (uses filings rawContent column via 02-02 download handler)

# Tech tracking
tech-stack:
  added: [limiter, html-to-text, @types/html-to-text]
  patterns:
    - Module-level RateLimiter singleton for shared rate limiting across all EDGAR calls
    - Global ingestion table pattern (filings has no firm_id — shared across all firms)
    - upsertJobScheduler for idempotent cron registration on server restart
    - company_tickers.json batch fetch with 15-min cache (not per-company lookups)

key-files:
  created:
    - apps/api/src/edgar/types.ts
    - apps/api/src/edgar/client.ts
    - apps/api/src/edgar/cik-resolver.ts
    - apps/api/src/queues/scheduler.ts
    - apps/api/src/tests/edgar-client.test.ts
    - apps/api/src/tests/edgar-scheduler.test.ts
    - apps/api/drizzle/0000_lying_jimmy_woo.sql
  modified:
    - apps/api/src/db/schema.ts
    - apps/api/src/index.ts
    - apps/api/src/tests/db-schema.test.ts
    - apps/api/package.json

key-decisions:
  - "SC TO-T / SC TO-T/A and SC TO-I / SC TO-I/A used as EDGAR form codes — SC TO is not a valid EDGAR code (CONTEXT.md shorthand)"
  - "filings table is global (no firm_id, no RLS) — firm-scoped Event records created on deal match"
  - "deals.firmId made nullable to support auto-discovered deals with source='auto_edgar'"
  - "RateLimiter at 9 tokens/sec (not 10) — 10% headroom below SEC 10/sec limit"
  - "registerSchedules called from index.ts NOT worker.ts — prevents duplicate cron jobs on worker restart"

patterns-established:
  - "Pattern: All EDGAR HTTP calls go through edgarFetch() — never call fetch() directly for sec.gov URLs"
  - "Pattern: upsertJobScheduler with idempotent schedulerId for all recurring jobs"
  - "Pattern: Global ingestion tables (no RLS) with firm-scoped Event rows created on match"
  - "Pattern: company_tickers.json fetched once per 15-min cycle and cached in module scope"

requirements-completed: [EDGAR-01, EDGAR-03, EDGAR-04]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 2 Plan 01: EDGAR HTTP Client, Rate Limiter, Schema Migration, and BullMQ Cron Summary

**Rate-limited EDGAR HTTP client with 9 req/s token bucket limiter, global filings schema (no firm_id), CIK auto-resolver with 15-min cache, and BullMQ cron registered at startup for 15-minute polling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T12:16:18Z
- **Completed:** 2026-03-01T12:21:11Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Built the foundational EDGAR infrastructure: rate-limited HTTP client enforcing 9 req/s and `j16z admin@j16z.com` User-Agent on every request
- Migrated filings table to a global/shared table (removed firm_id and all RLS policies), added status column, preserved timestamps spread for 02-03 compatibility
- Registered 15-minute BullMQ cron schedule at server startup using idempotent upsertJobScheduler
- Added CIK resolver with company_tickers.json cache (15-min TTL, fetched once per poll cycle not per-company)
- Added acquirerCik, targetCik, source to deals and made firmId nullable for auto-discovered deals

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and migrate filings schema to global table** - `f524ac6` (feat)
2. **Task 2: Build EDGAR HTTP client, CIK resolver, types, and BullMQ scheduler** - `0c89750` (feat)
3. **Task 3: Write unit tests for EDGAR client and scheduler** - `7227d1e` (test)

## Files Created/Modified

- `apps/api/src/edgar/types.ts` - TRACKED_FORM_TYPES, HIGH_SIGNAL_TYPES sets; Zod schemas for EDGAR API responses
- `apps/api/src/edgar/client.ts` - edgarFetch with RateLimiter singleton, EDGAR_USER_AGENT, buildFilingUrl, buildIndexUrl
- `apps/api/src/edgar/cik-resolver.ts` - resolveCompanyCik, resolveCikByTicker, clearTickerCache with 15-min cache
- `apps/api/src/queues/scheduler.ts` - registerSchedules using upsertJobScheduler with edgar-poll-schedule cron
- `apps/api/src/index.ts` - Added registerSchedules import and call at server startup
- `apps/api/src/db/schema.ts` - Removed firmId/RLS from filings; added status, acquirerCik, targetCik, source; nullable firmId on deals
- `apps/api/src/tests/edgar-client.test.ts` - 9 tests: User-Agent, rate limiter, error handling, URL builders
- `apps/api/src/tests/edgar-scheduler.test.ts` - 5 tests: upsertJobScheduler params, queue close, idempotency
- `apps/api/src/tests/db-schema.test.ts` - Updated firm_id isolation tests to exclude filings (global table)
- `apps/api/drizzle/0000_lying_jimmy_woo.sql` - Initial Drizzle migration with all schema changes

## Decisions Made

- SC TO-T / SC TO-T/A and SC TO-I / SC TO-I/A used as EDGAR form codes — CONTEXT.md shorthand "SC TO" maps to these two valid EDGAR codes
- filings table is global (no firm_id, no RLS per CONTEXT.md locked decision) — firm-scoped Event records created when a filing matches a firm's deals via watchlist
- deals.firmId made nullable — auto-discovered deals have source='auto_edgar' and firmId=null until claimed by a firm adding to watchlist
- RateLimiter at 9 tokens/sec not 10 — 10% headroom below SEC's stated limit
- registerSchedules is called from index.ts (API server) not worker.ts — prevents duplicate cron job registration on worker restarts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated db-schema test to reflect filings as global table**
- **Found during:** Task 1 (schema migration)
- **Issue:** Existing `db-schema.test.ts` had a test asserting `filings` table has `firmId` column. After removing firmId from filings, this test would fail.
- **Fix:** Updated the `firm_id isolation` describe block to exclude `filings` from the list of tables expected to have firmId, and added an explicit test asserting filings does NOT have firmId.
- **Files modified:** `apps/api/src/tests/db-schema.test.ts`
- **Verification:** `pnpm vitest run src/tests/db-schema.test.ts` passes all 31 tests
- **Committed in:** `f524ac6` (part of Task 1 commit)

**2. [Rule 1 - Bug] Fixed BullMQ mock to use class constructor not arrow function**
- **Found during:** Task 3 (writing scheduler tests)
- **Issue:** Initial test used `vi.fn().mockImplementation(() => ({...}))` for the Queue mock — arrow functions are not constructable so `new Queue(...)` threw `TypeError: not a constructor`.
- **Fix:** Rewrote the `vi.mock('bullmq')` factory to use a proper `class MockQueue {}` with instance methods as class properties.
- **Files modified:** `apps/api/src/tests/edgar-scheduler.test.ts`
- **Verification:** All 5 scheduler tests pass
- **Committed in:** `7227d1e` (part of Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs discovered during implementation)
**Impact on plan:** Both auto-fixes necessary for test correctness. No scope creep, no architectural changes.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required for this plan. The migration file is generated but not applied (requires a database connection). Run `pnpm db:migrate` in `apps/api/` when database is available.

## Next Phase Readiness

- EDGAR HTTP client ready for 02-02 (EDGAR poller) to call `edgarFetch()` for submissions and EFTS APIs
- Filings table schema ready for 02-02 inserts and 02-03 query routes
- CIK resolver ready for deal CIK auto-population when new deals are created
- BullMQ cron will fire `edgar_poll` jobs every 15 minutes once 02-02 worker handler is implemented

---
*Phase: 02-sec-edgar-ingestion*
*Completed: 2026-03-01*

## Self-Check: PASSED

- FOUND: `apps/api/src/edgar/client.ts`
- FOUND: `apps/api/src/edgar/types.ts`
- FOUND: `apps/api/src/edgar/cik-resolver.ts`
- FOUND: `apps/api/src/queues/scheduler.ts`
- FOUND: `apps/api/src/tests/edgar-client.test.ts`
- FOUND: `apps/api/src/tests/edgar-scheduler.test.ts`
- FOUND commit f524ac6: feat(02-01): install dependencies and migrate filings schema to global table
- FOUND commit 0c89750: feat(02-01): add EDGAR HTTP client, rate limiter, CIK resolver, and BullMQ scheduler
- FOUND commit 7227d1e: test(02-01): add unit tests for EDGAR client and scheduler
