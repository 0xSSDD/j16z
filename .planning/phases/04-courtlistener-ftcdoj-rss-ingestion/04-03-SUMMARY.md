---
phase: 04-courtlistener-ftcdoj-rss-ingestion
plan: 03
subsystem: api
tags: [rss, courtlistener, materiality-scoring, integrations, frontend, unit-tests, pacer]

# Dependency graph
requires:
  - phase: 04-courtlistener-ftcdoj-rss-ingestion
    provides: CourtListener event-factory with getCourtMaterialityScore/getCourtSeverity exports; integrations health endpoint with displayName and pacerCredential shape
  - phase: 04-courtlistener-ftcdoj-rss-ingestion
    provides: RSS poller with hardcoded materialityScore:40 and integrations health endpoint

provides:
  - Frontend IntegrationsTab wired to new backend response shape (sources array + pacerCredential)
  - PacerCredentialHealth interface and IntegrationHealthResponse interface in api.ts
  - PACER credential expiry warning banner in IntegrationsTab (visible when daysUntilExpiry <= 30)
  - scoreRssItem(title, content) function: keyword-based RSS materiality scoring (30-70 range)
  - getRssSeverity(score) helper: derives severity from RSS materiality score
  - CourtListener unit test suite: 21 assertions covering event-factory, types, and rss/poller
affects:
  - Phase 5 alerts (RSS events now have variable materiality; CourtListener logic is regression-safe)
  - Frontend settings page (IntegrationsTab displays all 5 sources with correct icons/colors)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IntegrationHealthResponse wrapper type: { sources, pacerCredential? } returned from getIntegrationHealth()"
    - "Keyword-based RSS scoring: regex haystack over title+content, additive score, capped at 70 (no CRITICAL from RSS alone)"
    - "CourtListener unit tests: pure function testing of event-factory.ts and types.ts exports — no DB or fetch needed"

key-files:
  created:
    - apps/api/src/tests/courtlistener-poller.test.ts
  modified:
    - apps/j16z-frontend/src/lib/api.ts
    - apps/j16z-frontend/src/components/settings/integrations-tab.tsx
    - apps/api/src/rss/poller.ts

key-decisions:
  - "IntegrationHealthResponse wraps existing IntegrationHealth[] — backward-compatible, no change to IntegrationHealth shape"
  - "scoreRssItem capped at 70: RSS news items cannot reach CRITICAL tier alone — requires analyst or COURT/AGENCY event to push over threshold"
  - "Mock data in api.ts already had CourtListener entry (source: 'CourtListener') — no change needed to mock array"

patterns-established:
  - "RSS materiality pattern: scoreRssItem(title, content) → additive keyword scoring → Math.min(score, 70) cap"
  - "Pure function unit test pattern: import functions after vi.mock, assert return values without DB/network"

requirements-completed: [RSS-01, RSS-02, RSS-03]

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 04 Plan 03: Frontend Integrations Wiring + RSS Keyword Scoring + CourtListener Tests Summary

**IntegrationsTab wired to backend displayName/pacerCredential shape, RSS news items scored 30-70 via M&A keyword analysis replacing hardcoded 40, and 21-assertion CourtListener unit test suite added**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T13:10:00Z
- **Completed:** 2026-03-13T13:18:00Z
- **Tasks:** 2
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments

- Frontend IntegrationsTab now uses `{ sources, pacerCredential }` response shape — source names map correctly to SOURCE_ICONS/SOURCE_COLORS via `displayName` from backend
- PACER credential expiry warning banner renders when `isExpiringSoon` is true with days-remaining count and link to pacer.uscourts.gov
- RSS news items scored 30-70 based on M&A keyword relevance (merger/acquisition/deal, antitrust/regulatory/FTC/DOJ, injunction/block/challenge, second request/HSR, termination/break fee/MAE, shareholder suit/litigation) — severity derived from score, never hardcoded
- 21 unit test assertions cover: `getCourtMaterialityScore` (5 sub-types including default fallback), `getCourtSeverity` (4 boundary cases), `scoreRssItem` (5 cases including cap and case-insensitivity), `courtListenerWebhookSchema` (4 cases including passthrough), `COURTLISTENER_IPS` (3 cases including negative)

## Task Commits

Each task was committed atomically:

1. **Task 1: Frontend integrations wiring and PACER credential display** - `e0bc3d7` (feat)
2. **Task 2: RSS keyword scoring and CourtListener unit tests** - `1f2cdb6` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/j16z-frontend/src/lib/api.ts` — Added `PacerCredentialHealth` and `IntegrationHealthResponse` interfaces; updated `getIntegrationHealth()` return type to `Promise<IntegrationHealthResponse>`; maps backend `{ sources, pacerCredential }` shape for both mock and real modes
- `apps/j16z-frontend/src/components/settings/integrations-tab.tsx` — Added `pacerCredential` state; updated `useEffect` + `refreshHealth` to destructure new response shape; added PACER warning banner with amber styling and pacer.uscourts.gov link
- `apps/api/src/rss/poller.ts` — Added exported `scoreRssItem(title, content): number` function; added `getRssSeverity(score)` helper; replaced hardcoded `materialityScore: 40` / `severity: 'INFO'` with `itemScore` / `getRssSeverity(itemScore)`
- `apps/api/src/tests/courtlistener-poller.test.ts` — 21 unit test assertions across 5 describe blocks: getCourtMaterialityScore, getCourtSeverity, scoreRssItem, courtListenerWebhookSchema validation, COURTLISTENER_IPS allowlist

## Decisions Made

- `IntegrationHealthResponse` wraps the existing `IntegrationHealth[]` type — backward-compatible, no change to the shape of individual source records
- `scoreRssItem` cap at 70 enforces that RSS news items cannot reach CRITICAL tier alone; this keeps CRITICAL reserved for COURT/AGENCY events (injunctions, complaints, FTC actions)
- Mock INTEGRATION_HEALTH array already had CourtListener entry (added in a prior session) — no change needed to mock data
- Pre-existing test failures in `edgar-download.test.ts` and `edgar-scheduler.test.ts` are out of scope (pre-existing, unrelated to this plan's changes)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing test failures in `edgar-download.test.ts` and `edgar-scheduler.test.ts` appeared in test run output — these are out-of-scope (not caused by plan 04-03 changes, existed before this session)
- Frontend TypeScript compiled clean on first pass for both tasks

## User Setup Required

None — no new external service configuration required. PACER credential warning requires `PACER_PASSWORD_LAST_CHANGED` env var (documented in 04-02 USER-SETUP).

## Next Phase Readiness

- Phase 04 (CourtListener + FTC/DOJ + RSS ingestion) is complete across all 3 plans
- Phase 05 (alerts/notifications) can consume events table — all event types now have proper materiality scores (COURT 50-90, AGENCY 60-95, RSS 30-70)
- CourtListener integration is regression-safe with 21 unit test assertions
- Frontend settings page fully reflects all 5 data sources with correct icons and colors

---
*Phase: 04-courtlistener-ftcdoj-rss-ingestion*
*Completed: 2026-03-13*

## Self-Check: PASSED

- FOUND: apps/j16z-frontend/src/lib/api.ts
- FOUND: apps/j16z-frontend/src/components/settings/integrations-tab.tsx
- FOUND: apps/api/src/rss/poller.ts
- FOUND: apps/api/src/tests/courtlistener-poller.test.ts
- FOUND: e0bc3d7 (Task 1 commit)
- FOUND: 1f2cdb6 (Task 2 commit)
