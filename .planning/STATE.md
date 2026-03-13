---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-13T21:54:00Z"
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 16
  completed_plans: 16
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Analysts spend 3-5 hours/day trolling fragmented sources. j16z turns that into a push-button workflow — live data in, analyst-ready intelligence out.
**Current focus:** Phase 6 — Digests + Deal Memo Editor

## Current Position

Phase: 6 of 7 (Digests + Deal Memo Editor) — IN PROGRESS
Plan: 2 of 3 (06-02 complete — tiptap memo editor, CRUD API, deal card Memo tab)
Status: Phase 6 Plan 2 COMPLETE — memo editor with scaffold generator live; ready for Plan 3 (snapshot panel + export)
Last activity: 2026-03-13 — Plan 06-02 complete (memos schema, CRUD API, tiptap editor, MemoList, deal card tab)

Progress: [████████████████████] 100% (16/16 plans complete across 5 complete phases + phase 6 started)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~7 min
- Total execution time: ~54 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 01-backend-foundation-auth | 3 | 24 min | 8 min | COMPLETE |
| 02-sec-edgar-ingestion | 3 | 52 min | 17 min | COMPLETE |
| 03-llm-extraction-pipeline | 3 | 21 min | 7 min | COMPLETE |
| 04-courtlistener-ftcdoj-rss | 3 | 14 min | 5 min | COMPLETE |
| 05-alert-delivery-market-data | 3/3 | 17 min | 6 min | COMPLETE |
| 06-digests-deal-memo-editor | 2/3 | 21 min | 10.5 min | IN PROGRESS |

**Recent Trend:**
- Last 5 plans: 04-03 (5 min), 05-01 (5 min), 05-02 (4 min), 05-03 (8 min), 06-01 (8 min)
- Trend: consistent ~4-8 min/plan; full-stack plans trending 8 min

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
- [03-01]: Python mock patching target is db.fetch_filing_content (not worker.fetch_filing_content) because worker.py uses lazy local imports inside process(); patch at source module
- [03-01]: Raw content excluded from llm_extract job payload — Python worker fetches from DB via filingId to avoid 400-800KB Redis payloads
- [03-01]: psycopg3 chosen over supabase-py for Python DB writes — consistent with adminDb service-role pattern; direct Postgres on DATABASE_URL
- [03-02]: AlignmentStatus enum in langextract 1.1.1 uses MATCH_EXACT/MATCH_GREATER/MATCH_LESSER/MATCH_FUZZY — RESEARCH.md incorrectly documented ALIGNED/APPROXIMATE/FAILED; confidence ladder: EXACT=0.9, GREATER/LESSER=0.7, FUZZY=0.6, null=0.3
- [03-02]: lx.extract() returns AnnotatedDocument (single text) or list[AnnotatedDocument] (multiple); pipeline normalises to list before iterating
- [03-02]: google.generativeai package is deprecated (FutureWarning); google.genai is the replacement — flagged for future migration, not blocking since pyproject.toml pins google-generativeai>=0.8.0
- [Phase 03-03]: Severity threshold for CRITICAL is >= 70 (not strictly > 70) — matches CLAUDE.md materiality scoring spec and TypeScript severity-scoring.ts behavior
- [Phase 03-03]: ClauseCard falls back to legacy value field for mock data compatibility; verbatim quote collapsed by default per locked decision
- [04-01]: Webhook route registered on root Hono app before api.basePath('/api') — CourtListener auto-disables webhooks that return 401 after 7 retries
- [04-01]: v4 endpoints exclusively: /api/rest/v4/search/, /api/rest/v4/docket-alerts/, /api/rest/v4/docket-entries/ — v3 deprecated
- [04-01]: CASE_DISCOVERED events store courtlistenerDocketId in metadata for webhook→deal lookup (no separate subscription table)
- [04-01]: updateIngestionStatus reused from agency/event-factory.ts — not duplicated in courtlistener/
- [04-02]: Canary baseline stored in ingestion_status.metadata jsonb (no separate table); 2-consecutive-zero threshold prevents weekend/holiday false positives
- [04-02]: PACER_PASSWORD_LAST_CHANGED env var only for credential rotation date — no PACER credentials in DB
- [04-02]: SOURCE_DISPLAY_NAMES mapping kept local to integrations.ts (not shared constant) — only used in one place
- [04-03]: IntegrationHealthResponse wraps existing IntegrationHealth[] — backward-compatible, no change to individual source record shape
- [04-03]: scoreRssItem capped at 70 — RSS news items cannot reach CRITICAL tier alone; CRITICAL reserved for COURT/AGENCY events
- [04-03]: Mock INTEGRATION_HEALTH already had CourtListener entry — no change needed to mock array
- [05-01]: Resend SDK for email delivery — ESM-native, simple API, good DX for transactional alerts
- [05-01]: @slack/webhook IncomingWebhook pattern (not OAuth app) for Slack delivery — simpler setup, matches RESEARCH.md recommendation
- [05-01]: Notification dedup via notification_log table (eventId+userId+channel unique check) — prevents alert storms on retry
- [05-01]: CRITICAL events get email+slack; WARNING gets slack-only; INFO gets no push — matches CLAUDE.md materiality spec
- [05-02]: RateLimiter at 4 tokens/min for Alpha Vantage free tier safety (25 req/day, 5/min burst)
- [05-02]: acquirerPrice placeholder uses target quote price — separate acquirer ticker quote deferred
- [05-02]: Deals with null firmId (auto-discovered) skip marketSnapshot insert but still get deal price column updates
- [05-02]: Market hours uses Intl.DateTimeFormat for timezone-safe ET detection without external library
- [05-03]: Alert rule CRUD uses adminDb with explicit firmId WHERE clauses (defense-in-depth, consistent with other routes)
- [05-03]: webhookSecret returned only on POST creation response, never on GET/PATCH — one-time visibility
- [05-03]: All event factories use .returning({ id }) to get event ID for alert_evaluate enqueue
- [05-03]: DataAgeBadge uses Intl.DateTimeFormat for timezone-safe ET market hours (same pattern as backend)
- [05-03]: getLatestMarketSnapshot maps backend grossSpread to frontend spread field name
- [06-01]: react-email installed in apps/api (not frontend) — server-side render() for email HTML, not browser rendering
- [06-01]: Digest cron schedules use tz: 'America/New_York' in BullMQ upsertJobScheduler — explicit timezone, not UTC arithmetic
- [06-01]: Digest preferences GET returns defaults (all enabled) if no row exists — avoids ghost row creation on first load
- [06-01]: Weekend suppression uses Intl.DateTimeFormat weekday check in ET — consistent with market-poller.ts timezone pattern
- [06-02]: JSONContent type imported from @tiptap/react (re-exports @tiptap/core) — @tiptap/core is a transitive dep not directly installed in frontend workspace
- [06-02]: Memo auto-save uses 3s debounce with monotonic version counter; PATCH returns 409 if incoming version <= stored version
- [06-02]: immediatelyRender: false on useEditor for Next.js SSR hydration compatibility
- [06-02]: Deal card tab navigation wraps existing sections in React fragment (Overview tab); Memo tab renders MemoList alongside

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3]: Market data vendor (Polygon.io vs IEX Cloud vs Alpha Vantage) needs pricing/quality evaluation before Phase 5 planning — research gap flagged
- [Phase 3]: LLM extraction chunking strategy for 500-page S-4s needs empirical testing on real filings before committing to production design — recommend 5-10 filing experiment sprint during Phase 3 planning
- [Phase 5]: Slack integration UX decision RESOLVED: incoming webhook URL chosen (simpler setup, no OAuth complexity) — implemented in 05-01
- [Deployment]: BullMQ workers require persistent processes — Vercel deployment is incompatible; hosting target must be decided before Phase 1 implementation
- [01-frontend]: Pre-existing TypeScript errors in notifications-inbox.tsx and event-timeline.tsx (`.materiality` field mismatch) — logged in deferred-items.md

## Session Continuity

Last session: 2026-03-13
Stopped at: Completed 06-02-PLAN.md — tiptap memo editor, CRUD API with optimistic concurrency, deal card Memo tab
Resume file: .planning/phases/06-digests-deal-memo-editor/06-03-PLAN.md (Phase 6 Plan 3: Snapshot Panel + Export)
