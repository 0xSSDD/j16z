---
phase: 05-alert-delivery-market-data
plan: 03
subsystem: api, ui
tags: [alert-rules, crud, bullmq, data-age-badge, market-data, hono, react]

requires:
  - phase: 05-01
    provides: alert worker, alert types, notification_log dedup
  - phase: 05-02
    provides: market data poller, spread calculator, market-snapshots API

provides:
  - Alert rule CRUD API at /api/alert-rules
  - alert_evaluate enqueue wired into all 4 event pipelines (agency, edgar, courtlistener, rss)
  - AlertRulesTab wired to real API (no more localStorage)
  - DataAgeBadge component for market data freshness display
  - Deal board spread column with live market snapshot data

affects: [06-frontend-polish, 07-deployment]

tech-stack:
  added: []
  patterns: [alert_evaluate enqueue after every event insert, .returning() pattern for event IDs]

key-files:
  created:
    - apps/api/src/routes/alert-rules.ts
    - apps/api/src/tests/alert-rules.test.ts
    - apps/j16z-frontend/src/components/ui/data-age-badge.tsx
  modified:
    - apps/api/src/index.ts
    - apps/api/src/routes/index.ts
    - apps/api/src/agency/event-factory.ts
    - apps/api/src/courtlistener/event-factory.ts
    - apps/api/src/edgar/event-factory.ts
    - apps/api/src/rss/poller.ts
    - apps/j16z-frontend/src/lib/api.ts
    - apps/j16z-frontend/src/lib/types.ts
    - apps/j16z-frontend/src/components/settings/alert-rules-tab.tsx
    - apps/j16z-frontend/src/components/deal-board.tsx

key-decisions:
  - "Alert rule CRUD uses adminDb with explicit firmId WHERE clauses (defense-in-depth, consistent with other routes)"
  - "webhookSecret returned only on POST creation response, never on GET/PATCH"
  - "All event factories now use .returning({ id }) to get event ID for alert_evaluate enqueue"
  - "DataAgeBadge uses Intl.DateTimeFormat for timezone-safe ET market hours (same pattern as backend)"
  - "getLatestMarketSnapshot maps backend grossSpread to frontend spread field name"

patterns-established:
  - "alert_evaluate enqueue pattern: every event insert must add ingestionQueue.add('alert_evaluate', {...}, { delay: 5000 })"
  - "DataAgeBadge freshness: green <5min, yellow 5-30min, red >30min"

requirements-completed: [ALERT-04, ALERT-05, MKT-04]

duration: 8min
completed: 2026-03-13
---

# Phase 5 Plan 3: Alert Rules + Frontend Wiring Summary

**Alert rule CRUD API with per-deal overrides, alert_evaluate enqueue across all 4 event pipelines, AlertRulesTab wired to real API, deal board spread display with DataAgeBadge freshness indicator**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T21:03:45Z
- **Completed:** 2026-03-13T21:11:40Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Alert rule CRUD API with zod validation, webhook secret generation, test endpoint, and soft delete
- All 4 event pipelines (agency, courtlistener, edgar, rss) now enqueue alert_evaluate after event insertion
- AlertRulesTab fully rewritten from localStorage to real API with create modal, threshold slider, test button, and webhook secret display
- DataAgeBadge component with green/yellow/red freshness and market-closed variant
- Deal board spread column shows live market snapshot data with freshness indicator

## Task Commits

Each task was committed atomically:

1. **Task 1: Alert rule CRUD API + event-factory wiring** - `0ca8cdd` (feat)
2. **Task 2: Frontend wiring - AlertRulesTab + spread display + data-age badge** - `867abd8` (feat)

## Files Created/Modified
- `apps/api/src/routes/alert-rules.ts` - CRUD routes for alert rules (GET/POST/PATCH/DELETE/test)
- `apps/api/src/routes/index.ts` - Added alertRulesRoutes export
- `apps/api/src/index.ts` - Mounted /api/alert-rules with firmContextMiddleware
- `apps/api/src/agency/event-factory.ts` - Added alert_evaluate enqueue after AGENCY event insert
- `apps/api/src/courtlistener/event-factory.ts` - Added alert_evaluate enqueue after COURT event insert
- `apps/api/src/edgar/event-factory.ts` - Added alert_evaluate enqueue after FILING event inserts
- `apps/api/src/rss/poller.ts` - Added alert_evaluate enqueue after NEWS event insert
- `apps/api/src/tests/alert-rules.test.ts` - Unit tests for routes and event-factory wiring
- `apps/j16z-frontend/src/lib/types.ts` - Added AlertRule, AlertChannel, CreateAlertRuleInput types
- `apps/j16z-frontend/src/lib/api.ts` - Added alert rule CRUD + getLatestMarketSnapshot API functions
- `apps/j16z-frontend/src/components/settings/alert-rules-tab.tsx` - Rewritten from localStorage to real API
- `apps/j16z-frontend/src/components/ui/data-age-badge.tsx` - New data freshness indicator component
- `apps/j16z-frontend/src/components/deal-board.tsx` - Spread column with market snapshot and DataAgeBadge

## Decisions Made
- Alert rule CRUD uses adminDb with firmId WHERE clauses (defense-in-depth, consistent with other routes)
- webhookSecret is only returned on POST creation, never exposed on GET/PATCH
- All event factories now use `.returning({ id })` to get the event ID for alert_evaluate job
- DataAgeBadge uses Intl.DateTimeFormat for timezone-safe ET market hours detection (matching backend pattern)
- getLatestMarketSnapshot maps backend field names (grossSpread -> spread) to frontend MarketSnapshot type

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing Next.js build error on /login page (useSearchParams not in Suspense boundary) prevents `pnpm build` from passing -- not related to this plan's changes. TypeScript type-checking passes cleanly for both backend and frontend.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 5 complete: alert worker (01), market data (02), and wiring (03) all done
- End-to-end flow: event created -> alert_evaluate queued -> rules evaluated -> notification delivered
- Ready for Phase 6 (frontend polish) or Phase 7 (deployment)

---
*Phase: 05-alert-delivery-market-data*
*Completed: 2026-03-13*
