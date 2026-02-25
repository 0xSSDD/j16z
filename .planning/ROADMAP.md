# Roadmap: j16z — Deal Intelligence, Made Faster

## Overview

The frontend shell is built and running on mock data. The entire backend, ingestion pipeline, LLM extraction, alert delivery, and analyst-facing depth features must be built from scratch. Phases follow a strict dependency chain: database + auth before any real data, EDGAR ingestion before extraction, extraction before alerts. Multi-tenant isolation is a hard CI gate before any pilot client sees the system. The roadmap ends with a polished, pilot-ready product that replaces the 5-browser-tab analyst workflow.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Backend Foundation + Auth** - Database schema, Hono API skeleton, Supabase auth, multi-tenant isolation gate (1/3 plans complete) (completed 2026-02-25)
- [ ] **Phase 2: SEC EDGAR Ingestion** - Poll, ingest, and store EDGAR filings; flip frontend to real data
- [ ] **Phase 3: LLM Extraction Pipeline** - Clause extraction with citation verification; real deal cards and scored Inbox
- [ ] **Phase 4: CourtListener, FTC/DOJ, and RSS Ingestion** - All secondary data sources; complete event coverage
- [ ] **Phase 5: Alert Delivery + Market Data** - Email and Slack alerts on scored events; spread display on deal board
- [ ] **Phase 6: Digests + Deal Memo Editor** - Daily/weekly digests; memo editor seeded with live deal terms
- [ ] **Phase 7: Frontend Refinement + Exports** - v1 completeness: deal page tabs, landing page polish, CSV/API exports

## Phase Details

### Phase 1: Backend Foundation + Auth
**Goal**: The backend is running, the database has full schema with firm-scoped tables, users can authenticate, and cross-tenant isolation passes a blocking CI test before any pilot client is onboarded
**Depends on**: Nothing (first phase)
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User can sign up with email and password and receive a confirmation email via Supabase auth
  2. User can log in via magic link (passwordless) and the session persists across browser refresh
  3. User can log out from any page and is redirected to the login screen
  4. A user from Firm A cannot see deals, events, or watchlists belonging to Firm B even with a valid JWT (cross-tenant isolation CI test passes)
  5. The frontend, with `NEXT_PUBLIC_USE_MOCK_DATA=false`, connects to the real backend and returns empty arrays from live database tables rather than mock data
  6. Landing page CTA properly routes to Supabase auth (sign up / login); authenticated users land in `/app/inbox`
**Plans**: 3 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Hono API scaffold + Drizzle schema with all 13+ domain tables, firm_id scoping, RLS policies, soft deletes (Wave 1) — COMPLETE 2026-02-25
- [ ] 01-02-PLAN.md — Supabase JWT auth middleware, BullMQ + Upstash Redis queue setup, frontend api.ts wiring with JWT passthrough, Next.js auth middleware (Wave 2, depends on 01-01)
- [ ] 01-03-PLAN.md — Login page (magic link primary), onboarding flow, seed data, cross-tenant isolation CI gate test, custom access token hook (Wave 3, depends on 01-02)

### Phase 2: SEC EDGAR Ingestion
**Goal**: The system automatically polls EDGAR every 15 minutes, stores raw filings before extraction, and deal board shows real filing metadata even before LLM extraction runs
**Depends on**: Phase 1
**Requirements**: EDGAR-01, EDGAR-02, EDGAR-03, EDGAR-04, EDGAR-05, EDGAR-06
**Success Criteria** (what must be TRUE):
  1. System polls EDGAR on a 15-minute schedule and ingests 8-K, S-4, DEFM14A, and 13D/13G filings without triggering an IP block
  2. Each ingested filing is stored as a raw document in the database before any extraction runs (two-stage ingestion confirmed)
  3. Deal board shows newly ingested filings with source links pointing to the EDGAR document within 15 minutes of SEC publication
  4. Rate limiting enforces fewer than 10 requests/second with the correct `User-Agent` header on every outbound EDGAR request
**Plans**: TBD

Plans:
- [ ] 02-01: EDGAR HTTP client with `User-Agent` enforcement and 10 req/sec token bucket; poller BullMQ cron job
- [ ] 02-02: Raw filing storage (8-K, S-4, DEFM14A, 13D/13G) with deduplication by accession number; extraction job enqueue
- [ ] 02-03: Hono endpoints for filings; frontend deal board connected to real filing data with EDGAR source links

### Phase 3: LLM Extraction Pipeline
**Goal**: Raw EDGAR filings are automatically processed into structured deal terms and clauses with verbatim source citations; deal cards show real extracted data and the Inbox shows real materiality-scored events
**Depends on**: Phase 2
**Requirements**: EXTRACT-01, EXTRACT-02, EXTRACT-03, EXTRACT-04, EXTRACT-05, EXTRACT-06, EXTRACT-07
**Success Criteria** (what must be TRUE):
  1. Deal card shows extracted termination fees, MAE clauses, regulatory covenants, and financing conditions populated from real filings — not mock data
  2. Every extracted clause displays a verbatim quote from the source document; no clause is surfaced without a citation that can be verified against the original filing
  3. Inbox shows real materiality-scored events derived from ingested filings, sortable by score
  4. System handles a 500-page S-4 filing without timing out (chunking and parallel processing confirmed working)
  5. LLM model version is pinned (not aliased); nightly regression test runs against 20 known-good filings and fails CI on any extraction delta
**Plans**: TBD

Plans:
- [ ] 03-01: `apps/langextract/` Python service with Google LangExtract; Zod schemas for `ExtractedClause`; BullMQ extraction worker
- [ ] 03-02: Few-shot M&A extraction prompts; chunking strategy for long filings (S-4, DEFM14A); verbatim citation validator
- [ ] 03-03: Materiality scoring at insertion time (port scoring logic to DB columns); real Inbox events; regression test harness

### Phase 4: CourtListener, FTC/DOJ, and RSS Ingestion
**Goal**: All three secondary data sources are live; the Inbox shows litigation events, agency actions, and news items alongside EDGAR events with full materiality scoring
**Depends on**: Phase 3
**Requirements**: COURT-01, COURT-02, COURT-03, COURT-04, COURT-05, AGENCY-01, AGENCY-02, AGENCY-03, AGENCY-04, RSS-01, RSS-02, RSS-03
**Success Criteria** (what must be TRUE):
  1. Inbox shows merger challenge filings and shareholder suit docket entries from CourtListener with materiality scores within 30 minutes of a docket update
  2. Inbox shows FTC enforcement actions, HSR second requests, and DOJ clearance decisions matched to tracked deals
  3. User can attach RSS feeds (law firm alerts, specialist newsletters) to a watchlist and see relevant news items appear in deal event timelines
  4. Settings > Integrations shows last-sync timestamps for CourtListener and FTC/DOJ sources; PACER credential health visible with expiry warning 30 days in advance
  5. Canary monitor alerts when FTC/DOJ RSS item count drops (feed format change detected)
**Plans**: TBD

Plans:
- [ ] 04-01: CourtListener webhook endpoint + fallback polling; PACER credential health check; docket entries as scored events
- [ ] 04-02: FTC/DOJ RSS poller with canary monitor; agency event matching to tracked deals; HTML scraper for enforcement actions
- [ ] 04-03: RSS/news feed poller; watchlist-attached feeds; news items scored and surfaced in deal event timeline

### Phase 5: Alert Delivery + Market Data
**Goal**: Analysts receive email and Slack notifications on material events within minutes; deal board shows live spread data with a data-age indicator
**Depends on**: Phase 3 (scored events in DB required for alert evaluation); Phase 4 recommended for full event coverage
**Requirements**: ALERT-01, ALERT-02, ALERT-03, ALERT-04, ALERT-05, ALERT-06, MKT-01, MKT-02, MKT-03, MKT-04
**Success Criteria** (what must be TRUE):
  1. User receives an email alert within 5 minutes of a CRITICAL event (score ≥70) being ingested and scored
  2. User receives a Slack alert for WARNING events (score 50-70); INFO events (score <50) appear in Inbox only with no push notification
  3. User can configure alert thresholds and delivery channels (email, Slack, webhook) per deal in Settings > Alert Rules
  4. Deal board shows gross spread and annualized spread for tracked tickers with a color-coded data-age badge (green <5 min, yellow 5-30 min, red >30 min)
  5. Spread history is stored with timestamps enabling spread chart rendering on deal cards
**Plans**: TBD

Plans:
- [ ] 05-01: `alert-worker` BullMQ worker evaluating AlertRules against scored events; Resend email delivery for CRITICAL events
- [ ] 05-02: Slack incoming webhook delivery for WARNING+ events; webhook delivery endpoint; `notification_log` table for dedup/audit
- [ ] 05-03: Market data API poller (spread + price); implied consideration computation; spread display with data-age indicator

### Phase 6: Digests + Deal Memo Editor
**Goal**: Analysts receive a curated morning email summary of overnight deal activity; analysts can create deal memos seeded with live terms and edit them freeform
**Depends on**: Phase 5 (digest builds on alert infrastructure; memo requires real extracted terms from Phase 3)
**Requirements**: DIGEST-01, DIGEST-02, DIGEST-03, DIGEST-04, MEMO-01, MEMO-02, MEMO-03, MEMO-04
**Success Criteria** (what must be TRUE):
  1. Analyst receives a daily email at 8:00 AM ET summarizing overnight HIGH + MEDIUM events in the j16z brand (dark, Aurora palette react-email template)
  2. Analyst receives a weekly email digest Friday at 5:00 PM ET summarizing all deal changes; user can suppress weekend digests in Settings
  3. User can create a deal memo from a template pre-filled with live deal terms, spreads, events, and timeline from the actual deal
  4. User can edit the memo freeform with a rich text editor after template scaffolding, pull in live deal data, and see an edit history trail
**Plans**: TBD

Plans:
- [ ] 06-01: Digest BullMQ cron jobs (daily 07:00 UTC, weekly Friday); react-email templates matching j16z brand
- [ ] 06-02: Memo editor UI — template scaffold with live deal data pull-in; rich text editing; edit history tracking

### Phase 7: Frontend Refinement + Exports
**Goal**: The product is pilot-ready with polished deal page navigation, a landing page that conveys craft, and structured data exports for firms that need to pipe data into internal models
**Depends on**: Phase 3 (real data required for deal page tabs to be meaningful); Phase 5 (spread history for chart)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, EXPORT-01, EXPORT-02, EXPORT-03
**Success Criteria** (what must be TRUE):
  1. Deal page uses tab structure (Terms, Events, Spread History, News/Research, Reg & Litigation) with event detail opening in a CourtListener-style sidebar — no page navigation required
  2. Landing page communicates "deal intelligence, made faster" with Linear x Harvey aesthetic — no AI-generated look; craft is evident
  3. First-time user sees an onboarding flow with orderable sidebar; keyboard shortcuts work for core navigation and actions
  4. User can export deal data as CSV and access structured data via REST API with an API key
  5. OpenAPI spec is generated and accessible at `/docs` for the REST API
**Plans**: TBD

Plans:
- [ ] 07-01: Deal page tab structure (eToro-style) + CourtListener sidebar pattern for event detail
- [ ] 07-02: Landing page polish (Linear x Harvey) + first-time user flow + keyboard shortcut refinement
- [ ] 07-03: CSV export endpoint + REST API with API key auth + OpenAPI spec generation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation + Auth | 3/3 | Complete   | 2026-02-25 |
| 2. SEC EDGAR Ingestion | 0/3 | Not started | - |
| 3. LLM Extraction Pipeline | 0/3 | Not started | - |
| 4. CourtListener, FTC/DOJ, RSS | 0/3 | Not started | - |
| 5. Alert Delivery + Market Data | 0/3 | Not started | - |
| 6. Digests + Deal Memo Editor | 0/2 | Not started | - |
| 7. Frontend Refinement + Exports | 0/3 | Not started | - |
