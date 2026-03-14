---
phase: 02-sec-edgar-ingestion
verified: 2026-03-01T00:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 2: SEC EDGAR Ingestion Verification Report

**Phase Goal:** The system automatically polls EDGAR every 15 minutes, stores raw filings before extraction, and deal board shows real filing metadata even before LLM extraction runs
**Verified:** 2026-03-01
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | System polls EDGAR on a 15-minute schedule (EDGAR-01) | VERIFIED | `scheduler.ts` calls `upsertJobScheduler('edgar-poll-schedule', { pattern: '*/15 * * * *' }, { name: 'edgar_poll' })`. `index.ts` calls `registerSchedules()` at startup. Worker dispatches `edgar_poll` jobs to `handleEdgarPoll`. |
| 2 | System ingests 8-K, S-4, DEFM14A, 13D/13G and other M&A filing types (EDGAR-02) | VERIFIED | `TRACKED_FORM_TYPES` in `types.ts` covers all 16 form types. `poll.ts` filters by `TRACKED_FORM_TYPES` in both CIK-based scan and EFTS scan. `filings.ts` API route exposes ingested filings. `deal-board.tsx` and `deal-card.tsx` display filing counts and rows. |
| 3 | Every EDGAR request carries the correct User-Agent header (EDGAR-03) | VERIFIED | `client.ts` exports `EDGAR_USER_AGENT = 'j16z admin@j16z.com'` and sets it on every `edgarFetch` call. All EDGAR HTTP calls route through `edgarFetch`. Test `edgar-client.test.ts` verifies the exact string. |
| 4 | Requests are rate-limited to under 10/sec (EDGAR-04) | VERIFIED | `client.ts` uses `RateLimiter({ tokensPerInterval: 9, interval: 'second' })` (module-level singleton). `edgarFetch` calls `await edgarLimiter.removeTokens(1)` before every fetch. Test verifies `removeTokens` is called. |
| 5 | Raw filing content is stored before LLM extraction runs — two-stage ingestion (EDGAR-05) | VERIFIED | Stage 1: `poll.ts` inserts filings with `rawContent: null`, `extracted: false`. Stage 2: `download.ts` fetches HTML, converts via `html-to-text`, and updates `rawContent`. The filing row is visible on the deal board as soon as Stage 1 completes, before Stage 2 runs. |
| 6 | User can view source filing via link to EDGAR document (EDGAR-06) | VERIFIED | `filings.ts` API returns `rawUrl` (EDGAR URL). `deal-card.tsx` renders "View on EDGAR" anchor with `href={filing.rawUrl}` and `target="_blank"`. `inbox-side-panel.tsx` uses `href={event.sourceUrl}` (set by `event-factory.ts` to the EDGAR URL) with conditional text "View on SEC EDGAR" for FILING events. |
| 7 | Deal board shows real filing metadata before LLM extraction | VERIFIED | `deal-board.tsx` fetches filing counts via `getFilings(deal.id)` and renders a Filings column badge. `deal-card.tsx` fetches and renders a "Recent Filings" section with filing type, filer name, date, and EDGAR link. Both work with `rawContent: null` (content pending state is handled). |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/edgar/client.ts` | Rate-limited EDGAR HTTP client | VERIFIED | Exports `edgarFetch`, `EDGAR_USER_AGENT`, `buildFilingUrl`, `buildIndexUrl`. RateLimiter singleton at 9 req/s. User-Agent on every call. |
| `apps/api/src/edgar/types.ts` | EDGAR type definitions and Zod schemas | VERIFIED | Exports `TRACKED_FORM_TYPES` (16 types), `HIGH_SIGNAL_TYPES`, `FilingMetadata`, `submissionsResponseSchema`, `eftsResponseSchema`. SC TO-T/SC TO-I correctly used (not invalid "SC TO"). |
| `apps/api/src/edgar/cik-resolver.ts` | CIK resolver with 15-min cache | VERIFIED | Exports `resolveCompanyCik`, `resolveCikByTicker`, `clearTickerCache`. Cache TTL is 15 minutes, fetches `company_tickers.json` once per cycle (not per-company). |
| `apps/api/src/queues/scheduler.ts` | BullMQ 15-min cron registration | VERIFIED | Exports `registerSchedules`. Calls `upsertJobScheduler` with schedulerId `'edgar-poll-schedule'`, cron `'*/15 * * * *'`, job name `'edgar_poll'`. Uses `finally` to close queue. |
| `apps/api/src/edgar/poll.ts` | Stage 1 poll handler | VERIFIED | Exports `handleEdgarPoll`. Performs CIK-based poll (Submissions API) and EFTS broad scan. Zip-transposes columnar arrays. Inserts with `onConflictDoNothing`. Sets `rawContent: null`. Calls `matchFilingToDeal` and `createFilingEvents` after each insert. Enqueues `edgar_download` jobs. |
| `apps/api/src/edgar/download.ts` | Stage 2 download handler | VERIFIED | Exports `handleEdgarDownload`. Uses `edgarFetch` for rate-limited download. Converts HTML to plain text via `html-to-text`. Updates `rawContent`, `rawUrl`, `updatedAt` on filing row. Resolves primaryDocument via index endpoint for EFTS results. |
| `apps/api/src/edgar/deal-matcher.ts` | Deal matching and auto-deal creation | VERIFIED | Exports `matchFilingToDeal`. CIK-based match against `acquirerCik`/`targetCik`. Auto-creates deals for high-signal filings with `status: 'ANNOUNCED'`, `source: 'auto_edgar'`, `firmId: null`. Duplicate guard prevents double-creation. Low-signal filings return `dealId: null`. |
| `apps/api/src/edgar/event-factory.ts` | Firm-scoped event creation | VERIFIED | Exports `createFilingEvents`. Creates one Event per firm with `type: 'FILING'`, `source: 'SEC_EDGAR'`, `sourceUrl` pointing to EDGAR. Materiality scores correct (S-4: 80, 8-K: 60, SC 13G: 40). Severity derived correctly (CRITICAL >= 70). Returns early when `firmIds` is empty. |
| `apps/api/src/worker.ts` | Worker dispatching edgar_poll and edgar_download | VERIFIED | Handler registry maps `edgar_poll` → `handleEdgarPoll`, `edgar_download` → `handleEdgarDownload`. Concurrency 5. Does NOT import `registerSchedules` (correct anti-pattern avoidance). |
| `apps/api/src/routes/filings.ts` | Hono filings API route | VERIFIED | Four endpoints: GET /, /unmatched (before /:id to avoid route shadowing), /deal/:dealId, /:id. Scopes through firm's deal ownership. Returns `rawUrl` in JSON. |
| `apps/api/src/routes/index.ts` | Route registry includes filings | VERIFIED | `filingsRoutes` imported and exported as `filings`. |
| `apps/api/src/index.ts` | Server startup wires filings route and scheduler | VERIFIED | `api.use('/filings/*', firmContextMiddleware)`, `api.route('/filings', apiRoutes.filings)`, `registerSchedules()` called after `serve()`. |
| `apps/api/src/db/schema.ts` | Global filings table (no firm_id, no RLS) | VERIFIED | `filings` table has no `firmId` column, no `firmIsolationPolicies()` call. Has `status`, `...timestamps` (createdAt, updatedAt, deletedAt). `deals` table has `acquirerCik`, `targetCik`, `source`, nullable `firmId`. |
| `apps/api/drizzle/0000_lying_jimmy_woo.sql` | Migration SQL reflecting schema changes | VERIFIED | Migration shows `filings` table with no `firm_id`, has `status` default 'active', has `created_at`/`updated_at`/`deleted_at`. No `firm_isolation_*` policies on filings. `deals` has `acquirer_cik`, `target_cik`, `source`, nullable `firm_id`. |
| `apps/j16z-frontend/src/lib/types.ts` | Frontend Filing type | VERIFIED | `FilingType` union (16 types), `FilingStatus` type, `Filing` interface, `DealWithFilings` extension all present. Types match backend schema. |
| `apps/j16z-frontend/src/lib/api.ts` | Filing API functions with no mock fallback | VERIFIED | `getFilings`, `getAllFilings`, `getFilingCount` all return empty array when `USE_MOCK_DATA=true` (no mock data — real data only per CONTEXT.md). Call `authFetch` with correct paths. |
| `apps/j16z-frontend/src/components/deal-board.tsx` | Filing count badge column | VERIFIED | Imports `getFilings`. State `filingCounts`. `useEffect` fetches counts per deal (try/catch for offline backend). Filings column renders indigo badge with count or "--". |
| `apps/j16z-frontend/src/components/deal-card.tsx` | Recent Filings section with EDGAR links | VERIFIED | Imports `getFilings` and `Filing`. Fetches filings in `useEffect`. Conditionally renders "Recent Filings" section (hidden when empty). Each row: color-coded filing type badge, filer name/CIK, date, "Pending" label when `rawContent === null`, "View on EDGAR" link with `href={filing.rawUrl}` and `target="_blank"`. |
| `apps/j16z-frontend/src/components/inbox/inbox-side-panel.tsx` | Inbox side panel with EDGAR source link | VERIFIED | Source link uses `href={event.sourceUrl}` (not hardcoded `href="#"`). Conditional text: "View on SEC EDGAR" for FILING events. FILING-specific metadata block shows filing type badge and "SEC EDGAR" source label. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `index.ts` | `scheduler.ts` | `registerSchedules()` import + call after `serve()` | WIRED | Import at line 8, call at line 76 |
| `worker.ts` | `poll.ts` | `handlers['edgar_poll'] = handleEdgarPoll` | WIRED | Handler registry at lines 27-30 |
| `worker.ts` | `download.ts` | `handlers['edgar_download'] = handleEdgarDownload` | WIRED | Handler registry at lines 27-30 |
| `poll.ts` | `deal-matcher.ts` | `matchFilingToDeal(filing)` called after each insert | WIRED | Lines 59, 62-70 — result used to update filing dealId and call createFilingEvents |
| `poll.ts` | `event-factory.ts` | `createFilingEvents(id, dealId, filing, firmIds)` | WIRED | Line 69 — called with firm IDs from deal matcher result |
| `poll.ts` | `ingestion queue` | `ingestionQueue.add('edgar_download', {...})` | WIRED | Lines 48-53 — enqueues download job with filingId, accessionNumber, cik, primaryDocument |
| `download.ts` | `filings table` | `adminDb.update(schema.filings).set({rawContent, rawUrl, updatedAt})` | WIRED | Lines 61-67 — updates filing row after HTML-to-text conversion |
| `filings.ts route` | `deals table` | JOIN via `inArray(filings.dealId, dealIds)` | WIRED | GET / scopes filings through firm's deal IDs |
| `deal-board.tsx` | `getFilings()` | `useEffect` → `getFilings(deal.id)` → sets `filingCounts` state | WIRED | Lines 8, 42-45 — count rendered in Filings column |
| `deal-card.tsx` | `getFilings()` | `useEffect` → `getFilings(dealId)` → sets `filings` state → renders Recent Filings section | WIRED | Lines 13-14, 38-47, 357-392 |
| `inbox-side-panel.tsx` | `event.sourceUrl` | `href={event.sourceUrl}` replacing former `href="#"` | WIRED | Line 156 — live EDGAR URL displayed and clickable |
| `event-factory.ts` | `events table` | `adminDb.insert(schema.events).values(eventValues)` | WIRED | Line 83 — firm-scoped events inserted per filing |
| `worker.ts` | NOT `registerSchedules` | (absent) | WIRED | Confirmed: no import or call to `registerSchedules` in worker.ts. Comment at line 10 explicitly documents the anti-pattern. |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EDGAR-01 | 02-01, 02-02 | System polls SEC EDGAR on schedule (every 15 min) | SATISFIED | `scheduler.ts` registers `'*/15 * * * *'` cron via BullMQ `upsertJobScheduler`. `index.ts` calls it at startup. Worker dispatches `edgar_poll` jobs. 5 scheduler tests pass. |
| EDGAR-02 | 02-02, 02-03 | System ingests and stores 8-K, S-4, DEFM14A, and 13D/13G filings | SATISFIED | `TRACKED_FORM_TYPES` covers all 16 M&A form types. Poll handler filters and inserts them. API route exposes them. Frontend displays them. |
| EDGAR-03 | 02-01 | System includes proper User-Agent header to avoid EDGAR IP blocks | SATISFIED | `edgarFetch` sets `'User-Agent': 'j16z admin@j16z.com'` on every request. Test verifies exact string. All EDGAR calls go through `edgarFetch`. |
| EDGAR-04 | 02-01, 02-02 | System rate-limits requests to <10/sec per SEC policy | SATISFIED | `RateLimiter({ tokensPerInterval: 9, interval: 'second' })` enforced via `removeTokens(1)` in `edgarFetch`. All EDGAR calls (poll, download, CIK resolver) go through `edgarFetch`. |
| EDGAR-05 | 02-02 | Raw filing content stored before extraction (two-stage ingestion) | SATISFIED | Stage 1: `poll.ts` inserts with `rawContent: null`, `extracted: false`. Stage 2: `download.ts` updates `rawContent` after HTML-to-text conversion. Filing appears on deal board before content arrives. |
| EDGAR-06 | 02-03 | User can view source filing via link to EDGAR document | SATISFIED | `deal-card.tsx` renders "View on EDGAR" anchor with `href={filing.rawUrl}`. `inbox-side-panel.tsx` renders "View on SEC EDGAR" with `href={event.sourceUrl}`. Both open in new tab. |

All 6 requirements fully satisfied. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `inbox-timeline.tsx` | 68-77 | Three TODO comments: hardcoded `daysToOutsideDate: 45`, `spreadMoveBps: 0`, `isRead: false` | Info | These are pre-existing carry-forward items unrelated to Phase 2. Severity scoring still works correctly. Read state is tracked in localStorage in the parent page component. Does not affect EDGAR ingestion goal. |

No blockers or warnings. The TODOs in `inbox-timeline.tsx` are pre-Phase 2 items in the severity enrichment layer and do not affect FILING event rendering, source links, or any Phase 2 requirement.

---

### Human Verification Required

The following items cannot be verified programmatically and require a running backend with real EDGAR data:

#### 1. End-to-end poll cycle

**Test:** Start the API server and worker with a database connected. Wait up to 15 minutes (or trigger `edgar_poll` manually via BullMQ dashboard). Confirm a new filing row appears in the database with `rawContent: null` and an `edgar_download` job is enqueued.
**Expected:** Filing row inserted within seconds of poll running. `rawContent` is null. Download job appears in queue.
**Why human:** Requires live database, live Redis, live SEC EDGAR connectivity.

#### 2. HTML-to-text content stored correctly

**Test:** After the download handler processes an `edgar_download` job for a real filing, inspect the `raw_content` column in the database.
**Expected:** Plain text content (no HTML tags), length > 100 characters. `extracted` remains false.
**Why human:** Requires live infrastructure to generate real filings.

#### 3. Deal board shows filing count badge with real data

**Test:** Open the deal board with `NEXT_PUBLIC_USE_MOCK_DATA=false` and a backend running. Confirm deals that have filings show an indigo badge with a count number. Deals without filings show "--".
**Expected:** Filing count badge appears in the Filings column for deals with ingested filings.
**Why human:** Requires real backend data. Mock mode returns 0/empty by design.

#### 4. "View on EDGAR" link opens correct document

**Test:** In deal card, click "View on EDGAR" on a filing row. Confirm it opens the actual SEC EDGAR document at the correct URL.
**Expected:** SEC EDGAR document opens in new tab at the correct accession-number-derived URL.
**Why human:** Requires real filings with real accession numbers.

---

### Gaps Summary

No gaps. All 7 observable truths verified, all 19 required artifacts substantive and wired, all 6 requirements satisfied. Phase goal is achieved.

The phase delivers: automated 15-minute EDGAR polling with rate limiting and proper User-Agent, two-stage ingestion (metadata first, content second), global filings table with no firm isolation, high-signal auto-deal creation, firm-scoped event bridging from global filings to per-firm Inbox, a filings API endpoint, and frontend integration showing real filing metadata on deal board and deal card with clickable EDGAR source links.

---

_Verified: 2026-03-01_
_Verifier: Claude (gsd-verifier)_
