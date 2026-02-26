# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Analysts spend 3-5 hours/day trolling fragmented sources. j16z turns that into a push-button workflow — live data in, analyst-ready intelligence out.
**Current focus:** Phase 2 — SEC EDGAR Ingestion

## Current Position

Phase: 2 of 7 (SEC EDGAR Ingestion)
Plan: 0 of TBD (phase not yet planned)
Status: Ready to plan — Phase 1 complete and verified
Last activity: 2026-02-26 — Phase 1 verified (6/6 success criteria, 11/11 requirements, cross-tenant test passing)

Progress: [██░░░░░░░░] 14%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 8 min
- Total execution time: 24 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 01-backend-foundation-auth | 3 | 24 min | 8 min | COMPLETE |

**Recent Trend:**
- Last 5 plans: 01-01 (6 min), 01-02 (6 min), 01-03 (12 min)
- Trend: consistent ~8 min/plan average

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3]: Market data vendor (Polygon.io vs IEX Cloud vs Alpha Vantage) needs pricing/quality evaluation before Phase 5 planning — research gap flagged
- [Phase 3]: LLM extraction chunking strategy for 500-page S-4s needs empirical testing on real filings before committing to production design — recommend 5-10 filing experiment sprint during Phase 3 planning
- [Phase 5]: Slack integration UX decision needed: incoming webhook URL (simpler) vs OAuth app (more configurable) — must decide before Phase 5 implementation
- [Deployment]: BullMQ workers require persistent processes — Vercel deployment is incompatible; hosting target must be decided before Phase 1 implementation
- [01-frontend]: Pre-existing TypeScript errors in notifications-inbox.tsx and event-timeline.tsx (`.materiality` field mismatch) — logged in deferred-items.md

## Session Continuity

Last session: 2026-02-26
Stopped at: Phase 1 complete and verified. Ready to plan Phase 2 (SEC EDGAR Ingestion).
Resume file: None — clean phase transition
