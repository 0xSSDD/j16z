---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-01T13:25:53.163Z"
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Analysts spend 3-5 hours/day trolling fragmented sources. j16z turns that into a push-button workflow — live data in, analyst-ready intelligence out.
**Current focus:** Phase 2 — SEC EDGAR Ingestion

## Current Position

Phase: 2 of 7 (SEC EDGAR Ingestion)
Plan: 3 of 4 (02-03 complete)
Status: In progress — plan 02-03 complete, ready for 02-04
Last activity: 2026-03-01 — Plan 02-03 complete (filings API endpoint, frontend Filing type, deal board badge, deal card filing rows, inbox source link wiring)

Progress: [█████░░░░░] 38%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~8 min
- Total execution time: ~42 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 01-backend-foundation-auth | 3 | 24 min | 8 min | COMPLETE |
| 02-sec-edgar-ingestion | 3 | 52 min | 17 min | IN PROGRESS |

**Recent Trend:**
- Last 5 plans: 01-02 (6 min), 01-03 (12 min), 02-01 (4 min), 02-02 (18 min), 02-03 (30 min)
- Trend: consistent ~14 min/plan average

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Multi-tenant isolation (AUTH-06) is a hard CI gate — must pass before any pilot client is onboarded, regardless of other phase completion status
- [Roadmap]: Requirements.md stated 52 requirements but enumeration totals 62; all 62 are mapped — the stated count was an error
- [01-01]: Use postgres.js driver (not pg) per Drizzle's Supabase recommendation; prepare: false required for PgBouncer Transaction mode
- [01-01]: firmIdFromJwt wraps auth.jwt() in a subquery to prevent per-row evaluation in RLS policies (performance)
- [01-01]: Two Drizzle clients: db (RLS pooled port 6543) and adminDb (service-role direct port 5432)
- [01-01]: Seed deals are per-firm copies so each firm can independently soft-delete/restore starter content
- [01-02]: firmContextMiddleware NOT applied to /api/auth/* — onboarding endpoints called by users without firm_id yet
- [01-02]: Route handlers use adminDb with explicit firm_id WHERE clauses (defense-in-depth) not RLS-scoped db
- [01-02]: testRedisConnection uses Queue.getJobCounts() not ioredis — ioredis is not a BullMQ v5 peer dep
- [01-02]: Worker entry point is fully separate from API server — Queue in API, Worker in separate process
- [01-03]: Onboarding is idempotent — checks for existing firm_member before creating firm, returns 409 if already onboarded
- [01-03]: seed.ts accepts userId param: watchlist.createdBy and watchlistDeal.addedBy use real user ID (system UUID placeholder removed)
- [01-03]: Cross-tenant test uses SUPABASE_ANON_KEY with SERVICE_ROLE_KEY fallback for signInWithPassword — anon key is correct for user-facing auth
- [01-03]: Health test uses dynamic import with null-check guard — passes in CI without a live server
- [02-01]: filings table is global (no firm_id, no RLS) — firm-scoped Event records created when filing matches a firm's deals
- [02-01]: SC TO-T/SC TO-I used as EDGAR form codes — SC TO is not valid; CONTEXT.md shorthand maps to these two codes
- [02-01]: deals.firmId made nullable — auto-discovered deals have source='auto_edgar' and firmId=null until claimed
- [02-01]: RateLimiter at 9 tokens/sec (not 10) — 10% headroom below SEC's stated 10/sec limit
- [02-01]: registerSchedules called from index.ts NOT worker.ts — prevents duplicate cron job registration on worker restarts
- [02-02]: Columnar zip-transpose: Submissions API returns arrays indexed by position; must loop by index (not treat as row objects)
- [02-02]: Test date sensitivity: poll handler filters by sinceDate (30 days ago); test fixtures must use recent dates
- [02-02]: resetMockChains() pattern: vi.clearAllMocks() removes implementations; must re-establish Drizzle mock chains in each beforeEach
- [02-02]: Dual-shape mockFrom: getLastPollDate uses .from().orderBy().limit(), pollTrackedCiks uses .from().where() — mockFrom returns {where, orderBy} to support both
- [02-03]: GET /api/filings/unmatched registered before /:id route — Hono matches routes in registration order; unmatched would otherwise be treated as an ID lookup
- [02-03]: Global table routes (filings) scope via firm's deal ownership: get dealIds WHERE firmId, then inArray(filings.dealId, dealIds)
- [02-03]: No mock fallback for filing API functions — return empty array when USE_MOCK_DATA=true (CONTEXT.md locked decision)
- [02-03]: Inbox source link fix is global — event.sourceUrl replaces href="#" for all event types; FILING shows "View on SEC EDGAR" text

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3]: Market data vendor (Polygon.io vs IEX Cloud vs Alpha Vantage) needs pricing/quality evaluation before Phase 5 planning — research gap flagged
- [Phase 3]: LLM extraction chunking strategy for 500-page S-4s needs empirical testing on real filings before committing to production design — recommend 5-10 filing experiment sprint during Phase 3 planning
- [Phase 5]: Slack integration UX decision needed: incoming webhook URL (simpler) vs OAuth app (more configurable) — must decide before Phase 5 implementation
- [Deployment]: BullMQ workers require persistent processes — Vercel deployment is incompatible; hosting target must be decided before Phase 1 implementation
- [01-frontend]: Pre-existing TypeScript errors in notifications-inbox.tsx and event-timeline.tsx (`.materiality` field mismatch) — logged in deferred-items.md

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 02-03-PLAN.md (filings API endpoint, frontend Filing type, deal board badge, deal card filing rows, inbox source link wiring)
Resume file: None — continue with 02-04-PLAN.md
