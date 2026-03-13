---
phase: 04-courtlistener-ftcdoj-rss-ingestion
verified: 2026-03-13T13:30:00Z
status: gaps_found
score: 11/12 must-haves verified
gaps:
  - truth: "CourtListener unit tests pass without regressions in the existing scheduler test suite"
    status: failed
    reason: "Phase 04 added courtlistener_poll as the 7th registered scheduler, causing edgar-scheduler.test.ts to fail because it hardcoded toHaveBeenCalledTimes(2) (written when only 1 scheduler existed, expected 1×2=2 calls, now 7×2=14)"
    artifacts:
      - path: "apps/api/src/tests/edgar-scheduler.test.ts"
        issue: "Line 88: expect(mockUpsertJobScheduler).toHaveBeenCalledTimes(2) — should be toHaveBeenCalledTimes(14) or rewritten to not hardcode count"
    missing:
      - "Update edgar-scheduler.test.ts line 88 assertion from toHaveBeenCalledTimes(2) to toHaveBeenCalledTimes(14), or rewrite to use toHaveBeenCalled() / check for any call containing edgar_poll"
human_verification:
  - test: "Verify Inbox displays COURT, AGENCY, and NEWS events alongside FILING events"
    expected: "Events with type COURT (violet Scale icon), AGENCY (amber Shield icon), and NEWS (sky Newspaper icon) appear in the Inbox timeline with materiality badges when seeded via the API"
    why_human: "Requires a running instance with seeded data; the event rendering pipeline exists and is wired but visual display requires live execution"
  - test: "Verify CourtListener webhook route is reachable without authentication"
    expected: "POST /api/webhooks/courtlistener returns 403 from a non-allowlisted IP (not 401) — confirming the route is outside authMiddleware"
    why_human: "Requires a running API server to confirm HTTP routing behavior"
---

# Phase 04: CourtListener + FTC/DOJ + RSS Ingestion Verification Report

**Phase Goal:** All three secondary data sources are live; the Inbox shows litigation events, agency actions, and news items alongside EDGAR events with full materiality scoring
**Verified:** 2026-03-13T13:30:00Z
**Status:** gaps_found — 1 gap (pre-existing-adjacent test regression in edgar-scheduler.test.ts)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CourtListener webhook endpoint receives push notifications and enqueues them for async processing | VERIFIED | `apps/api/src/routes/webhooks.ts` — full IP allowlist, idempotency dedup, BullMQ enqueue; registered at `app.route('/api/webhooks', apiRoutes.webhooks)` in `index.ts` BEFORE `app.basePath('/api')` and `authMiddleware` |
| 2 | Poller discovers merger-related dockets using v4 endpoints exclusively (no v3 references) | VERIFIED | `apps/api/src/courtlistener/poller.ts` — uses `/api/rest/v4/search/`, `/api/rest/v4/docket-alerts/`, `/api/rest/v4/docket-entries/`; only v3 mentions are comment warnings |
| 3 | Docket entries become COURT events with correct materiality scores | VERIFIED | `apps/api/src/courtlistener/event-factory.ts` — INJUNCTION=90, COMPLAINT=85, MOTION=70, CASE_DISCOVERED/DOCKET_ENTRY=50; `getCourtSeverity` thresholds: >=70 CRITICAL, >=50 WARNING |
| 4 | Duplicate docket subscriptions prevented by event metadata check | VERIFIED | `poller.ts` `hasDocketSubscription()` queries `events WHERE type='COURT' AND metadata->>'courtlistenerDocketId' = docketId` |
| 5 | Webhook payloads deduplicated via Idempotency-Key header | VERIFIED | `webhooks.ts` queries `events WHERE metadata->>'idempotencyKey' = key` before enqueue |
| 6 | Canary monitor detects >80% item count drop or 2+ consecutive zero-item polls | VERIFIED | `apps/api/src/agency/rss-pollers.ts` `checkCanary()` — streak >= 2 for zero-item fire; `currentCount < baseline * 0.2` for drop fire; single zero poll only increments streak |
| 7 | PACER credential health shows days until expiry and warns when <=30 days remain | VERIFIED | `apps/api/src/routes/integrations.ts` `getPacerCredentialHealth()` — 180-day expiry from `PACER_PASSWORD_LAST_CHANGED` env var; `daysUntilExpiry <= 30` for `isExpiringSoon` |
| 8 | Integrations health endpoint returns normalized display names for all sources | VERIFIED | `integrations.ts` `SOURCE_DISPLAY_NAMES` maps edgar/ftc/ftc_rss/doj_rss/doj_civil_rss/courtlistener/rss to human-readable names |
| 9 | Frontend IntegrationsTab displays all sources including CourtListener with correct icons and colors | VERIFIED | `integrations-tab.tsx` — `pacerCredential` state, destructures `{ sources, pacerCredential }` from `getIntegrationHealth()`; `SOURCE_ICONS`/`SOURCE_COLORS` keyed on `displayName` from backend |
| 10 | PACER credential expiry warning renders in IntegrationsTab when <=30 days remain | VERIFIED | `integrations-tab.tsx` lines 210-226 — amber banner with `pacerCredential?.isExpiringSoon` guard and pacer.uscourts.gov link |
| 11 | RSS news items scored 30-70 based on M&A keyword relevance (not hardcoded 40) | VERIFIED | `apps/api/src/rss/poller.ts` — `scoreRssItem()` exported; `materialityScore: itemScore` and `severity: getRssSeverity(itemScore)` replace the hardcoded values; grep confirms no `materialityScore: 40` in file |
| 12 | CourtListener tests pass without regressions | FAILED | 21 courtlistener-poller.test.ts assertions all pass. However `edgar-scheduler.test.ts` regresses: it hardcoded `toHaveBeenCalledTimes(2)` (written for 1 scheduler), but phase 04 raised scheduler count to 7, making the idempotency test fail with "expected 2, got 14" |

**Score:** 11/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/courtlistener/types.ts` | Zod schemas + COURTLISTENER_API_BASE + COURTLISTENER_IPS | VERIFIED | All 5 schemas present (docketSearchResult, docketSearchResponse, docketEntry, courtListenerWebhook, docketAlertSubscription); both exports present |
| `apps/api/src/courtlistener/event-factory.ts` | createCourtEvent, getCourtMaterialityScore, getCourtSeverity | VERIFIED | All three exports present; scoring matches spec (INJUNCTION=90, COMPLAINT=85, MOTION=70, default=50) |
| `apps/api/src/courtlistener/poller.ts` | handleCourtListenerPoll | VERIFIED | Exported; searches v4 API, subscribes via v4 docket-alerts, creates CASE_DISCOVERED + DOCKET_ENTRY events with dedup |
| `apps/api/src/courtlistener/webhook.ts` | handleCourtListenerWebhook | VERIFIED | Exported; parses job data, looks up deal by docketId, deduplicates entries, creates COURT events |
| `apps/api/src/routes/webhooks.ts` | POST /api/webhooks/courtlistener | VERIFIED | IP allowlist, idempotency dedup, schema validation, BullMQ enqueue, immediate return |
| `apps/api/src/agency/rss-pollers.ts` | checkCanary function present and called | VERIFIED | `checkCanary` defined at line 66; called at line 214 inside `handleAgencyRss` after items slice, before deal load |
| `apps/api/src/routes/integrations.ts` | SOURCE_DISPLAY_NAMES + pacerCredential in response | VERIFIED | Both present; `getPacerCredentialHealth()` function at line 16; response at line 50 |
| `apps/j16z-frontend/src/lib/api.ts` | PacerCredentialHealth + IntegrationHealthResponse + displayName mapping | VERIFIED | All three present; `getIntegrationHealth()` returns `Promise<IntegrationHealthResponse>` |
| `apps/j16z-frontend/src/components/settings/integrations-tab.tsx` | pacerCredential state + PACER warning banner | VERIFIED | `pacerCredential` state at line 52; warning banner at lines 210-226 |
| `apps/api/src/rss/poller.ts` | scoreRssItem exported, no hardcoded materialityScore: 40 | VERIFIED | `scoreRssItem` exported at line 24; no hardcoded 40 in file |
| `apps/api/src/tests/courtlistener-poller.test.ts` | 21 unit test assertions | VERIFIED | 21 tests across 5 describe blocks; all pass in isolation |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/api/src/routes/webhooks.ts` | `apps/api/src/courtlistener/webhook.ts` | `queue.add('courtlistener_webhook', ...)` | WIRED | Line 85-90 in webhooks.ts enqueues `courtlistener_webhook` job |
| `apps/api/src/courtlistener/poller.ts` | `apps/api/src/courtlistener/event-factory.ts` | `createCourtEvent()` call | WIRED | Lines 173, 229 in poller.ts call `createCourtEvent` |
| `apps/api/src/worker.ts` | `apps/api/src/courtlistener/poller.ts` | handlers registry | WIRED | `courtlistener_poll: handleCourtListenerPoll` at line 44 |
| `apps/api/src/worker.ts` | `apps/api/src/courtlistener/webhook.ts` | handlers registry | WIRED | `courtlistener_webhook: handleCourtListenerWebhook` at line 45 |
| `apps/api/src/index.ts` | `apps/api/src/routes/webhooks.ts` | `app.route('/api/webhooks', ...)` before `basePath` | WIRED | Line 38 in index.ts registers route before `app.basePath('/api')` at line 57 — authMiddleware cannot block it |
| `apps/api/src/agency/rss-pollers.ts` | `apps/api/src/agency/event-factory.ts` | `updateIngestionStatus` with canary message | WIRED | Lines 103, 121 fire canary via `updateIngestionStatus` with "Canary alert:" prefix |
| `apps/api/src/routes/integrations.ts` | `apps/api/src/db/schema.ts` | `ingestionStatus` query with `SOURCE_DISPLAY_NAMES` | WIRED | Line 38 queries `schema.ingestionStatus`; line 43 maps `SOURCE_DISPLAY_NAMES[row.sourceName]` |
| `apps/j16z-frontend/src/components/settings/integrations-tab.tsx` | `apps/j16z-frontend/src/lib/api.ts` | `getIntegrationHealth()` returns `{ sources, pacerCredential }` | WIRED | Lines 70, 90 destructure `{ sources, pacerCredential }` from `getIntegrationHealth()` |
| `apps/api/src/rss/poller.ts` | `scoreRssItem` function | `scoreRssItem(title, content)` replaces hardcoded 40 | WIRED | Line 72: `const itemScore = scoreRssItem(...)`; line 83: `materialityScore: itemScore`; line 84: `severity: getRssSeverity(itemScore)` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COURT-01 | 04-01 | System receives CourtListener webhook notifications for docket updates | SATISFIED | `POST /api/webhooks/courtlistener` receives and enqueues webhook payloads with IP allowlist and idempotency |
| COURT-02 | 04-01 | System polls CourtListener API for initial case discovery on new deals | SATISFIED | `handleCourtListenerPoll` searches v4 API by deal target/acquirer, subscribes via v4 docket-alerts |
| COURT-03 | 04-01 | System ingests merger challenges, shareholder suits, and antitrust cases | SATISFIED | Webhook and poller both infer subType (INJUNCTION, COMPLAINT, MOTION, DOCKET_ENTRY) from description keywords and create COURT events |
| COURT-04 | 04-02 | System monitors PACER credential health and alerts on expiry (180-day rotation) | SATISFIED | `getPacerCredentialHealth()` in integrations.ts computes 180-day expiry from env var; `isExpiringSoon` fires at <=30 days; displayed in frontend PACER warning banner |
| COURT-05 | 04-01 | Docket entries create events with appropriate materiality scores | SATISFIED | INJUNCTION=90, COMPLAINT=85, MOTION=70, CASE_DISCOVERED/DOCKET_ENTRY=50; severity derived from score |
| AGENCY-01 | 04-02 | System monitors FTC and DOJ RSS feeds for antitrust actions and press releases | SATISFIED | Confirmed covered by existing implementation: `handleFtcCompetitionRss`, `handleDojAntitrustRss`, `handleDojCivilRss` in rss-pollers.ts |
| AGENCY-02 | 04-02 | System detects HSR second requests, enforcement actions, and clearance decisions | SATISFIED | MA_KEYWORDS array in rss-pollers.ts includes 'hart-scott-rodino', 'hsr', 'second request', 'consent decree', 'divestiture'; FTC/DOJ scores 75-80 (CRITICAL) |
| AGENCY-03 | 04-02 | System matches agency events to tracked deals by company/deal reference | SATISFIED | `findMatchingDeals()` in rss-pollers.ts uses fuzzy company name matching with ranked scoring |
| AGENCY-04 | 04-02 | System includes canary monitoring for RSS feed format changes | SATISFIED | `checkCanary()` detects >80% drop or 2+ consecutive zero-item polls; baseline stored in ingestion_status.metadata |
| RSS-01 | 04-03 | System ingests curated RSS feeds (law firm alerts, specialist newsletters) | SATISFIED | `handleRssPoll` in rss/poller.ts reads from rssFeeds table, polls URLs, creates NEWS/RSS_ARTICLE events |
| RSS-02 | 04-03 | RSS feeds attachable to watchlists for targeted intelligence | SATISFIED | `getDealsForFeed()` in rss/poller.ts joins watchlistDeals when `feed.watchlistId` is set |
| RSS-03 | 04-03 | News items scored for relevance and surfaced in deal event timeline | SATISFIED | `scoreRssItem()` provides 30-70 keyword-based scoring; events stored with `materialityScore` and `severity`; frontend inbox-timeline renders NEWS type with sky Newspaper icon |

No orphaned requirements — all 12 phase IDs are accounted for across the 3 plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/api/src/tests/edgar-scheduler.test.ts` | 88 | `toHaveBeenCalledTimes(2)` hardcodes count for a single scheduler, fails now that 7 are registered | BLOCKER | `pnpm test` reports 5 failed tests (2 from edgar-download.test.ts + this); CI would fail on this assertion |

**Note on edgar-download.test.ts:** 3 of the 5 total test failures are in edgar-download.test.ts and appear unrelated to phase 04 (they involve Redis ECONNREFUSED, a test environment issue predating this phase per 04-03 SUMMARY). Only the edgar-scheduler.test.ts failure at line 88 is directly caused by phase 04 adding `courtlistener_poll`.

### Human Verification Required

#### 1. Inbox Renders COURT / AGENCY / NEWS Events with Materiality Badges

**Test:** With `NEXT_PUBLIC_USE_MOCK_DATA=true`, open the Inbox page. Verify events with `type: 'COURT'` show a violet Scale icon, `type: 'AGENCY'` show an amber Shield icon, and `type: 'NEWS'` show a sky Newspaper icon. Verify materiality badges (red/orange/yellow dots) are visible for CRITICAL/WARNING/INFO events.
**Expected:** All three non-EDGAR event types render correctly in the inbox timeline alongside FILING events; severity badges are present and color-coded.
**Why human:** Requires running Next.js dev server; visual rendering cannot be verified by grep.

#### 2. Webhook Route is Unauthenticated

**Test:** Send `POST /api/webhooks/courtlistener` from a non-allowlisted IP to a running API instance.
**Expected:** HTTP 403 Forbidden (not 401 Unauthorized) — confirms the route bypasses authMiddleware.
**Why human:** Requires a running API server to verify HTTP routing behavior at runtime.

### Gaps Summary

One gap blocks full test suite completion: `edgar-scheduler.test.ts` line 88 hardcodes `toHaveBeenCalledTimes(2)`, written when the scheduler had only 1 registered job. Phase 04 added `courtlistener_poll` as the 7th registered scheduler, making the "idempotency" test expect 14 calls but assert 2. The fix is a one-line change: update the assertion to `toHaveBeenCalledTimes(14)` or rewrite it to `expect(mockUpsertJobScheduler.mock.calls.some(call => call[0] === 'edgar-poll-schedule')).toBe(true)` which is more robust to future scheduler additions.

All other phase 04 artifacts are substantive, correctly wired, and all 21 CourtListener-specific tests pass. TypeScript compiles clean for both API and frontend.

---

_Verified: 2026-03-13T13:30:00Z_
_Verifier: Claude (gsd-verifier)_
