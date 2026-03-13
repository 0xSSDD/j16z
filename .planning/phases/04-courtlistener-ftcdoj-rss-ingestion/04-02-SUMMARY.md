---
phase: 04-courtlistener-ftcdoj-rss-ingestion
plan: 02
subsystem: api
tags: [rss, canary, monitoring, ftc, doj, pacer, integrations, health]

# Dependency graph
requires:
  - phase: 04-courtlistener-ftcdoj-rss-ingestion
    provides: updateIngestionStatus in agency/event-factory.ts with metadata jsonb column
  - phase: 03-llm-extraction-pipeline
    provides: ingestionStatus schema with metadata jsonb field

provides:
  - Canary monitor in rss-pollers.ts detecting >80% item drop or 2+ consecutive zero-item polls
  - PACER credential health via PACER_PASSWORD_LAST_CHANGED env var (180-day expiry)
  - Source display name mapping (edgar/ftc/doj/courtlistener/rss -> human-readable names) in integrations.ts

affects:
  - 04-courtlistener-ftcdoj-rss-ingestion
  - 05-alerts-notifications
  - frontend integrations settings tab

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Canary pattern: store rolling baseline in ingestion_status.metadata jsonb; compare against threshold
    - Weekend protection: single zero-item poll increments streak only; 2+ consecutive fires alert
    - PACER health: env-var-only rotation tracking (no DB credentials)

key-files:
  created: []
  modified:
    - apps/api/src/agency/rss-pollers.ts
    - apps/api/src/routes/integrations.ts

key-decisions:
  - "Canary baseline stored in ingestion_status.metadata jsonb (no separate table)"
  - "2-consecutive-zero threshold for canary prevents weekend/holiday false positives"
  - "PACER_PASSWORD_LAST_CHANGED env var (not DB) for credential rotation date — no credentials in DB"
  - "SOURCE_DISPLAY_NAMES mapping kept in integrations.ts (not shared constant) — only used in one place"

patterns-established:
  - "Canary pattern: baseline in metadata jsonb, newStreak >= 2 for zero-item alert, baseline * 0.2 for drop alert"
  - "PACER health: compute 180-day expiry at request time from env var, no DB storage"

requirements-completed:
  - AGENCY-01
  - AGENCY-02
  - AGENCY-03
  - AGENCY-04
  - COURT-04

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 4 Plan 02: FTC/DOJ Canary Monitor + Integrations Health Summary

**Canary monitor in rss-pollers.ts detecting RSS format changes via rolling item-count baseline, plus PACER 180-day credential expiry tracking and human-readable source display names in the integrations health endpoint.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T11:03:43Z
- **Completed:** 2026-03-13T11:05:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `checkCanary` function reading/writing canary state from `ingestion_status.metadata` jsonb; fires on 2+ consecutive zero-item polls or >80% item count drop vs rolling baseline
- Extended `GET /api/integrations/health` to include `displayName` for each source and a `pacerCredential` object with `isExpiringSoon`, `daysUntilExpiry`, `expiryDate`, `lastChanged`
- Confirmed AGENCY-01/02/03 (FTC/DOJ RSS polling + event creation) already covered by existing implementation in rss-pollers.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Canary monitor for agency RSS feeds** - `829264d` (feat)
2. **Task 2: PACER credential health and source display name mapping** - `bf7b202` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/api/src/agency/rss-pollers.ts` - Added `CanaryMeta` interface, `checkCanary` async function, and `await checkCanary(config, items.length)` call in `handleAgencyRss`
- `apps/api/src/routes/integrations.ts` - Added `SOURCE_DISPLAY_NAMES` constant, `getPacerCredentialHealth()` function, `displayName` in source mapping, `pacerCredential` in health response

## Decisions Made

- Canary baseline stored in existing `ingestion_status.metadata` jsonb column — no new table required (uses established metadata pattern from 04-01)
- Two-consecutive-zero threshold (`newStreak >= 2`) for zero-item canary fire: single zero poll (weekend/holiday) only updates streak counter without alert
- `>80% drop` canary fires immediately on first occurrence (no streak required) since this indicates structural feed change not a weekend outage
- `PACER_PASSWORD_LAST_CHANGED` env var only — no PACER credentials ever written to DB
- `SOURCE_DISPLAY_NAMES` kept local to `integrations.ts` (not a shared package constant) — only used in one route file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled clean on first pass.

## User Setup Required

To enable PACER credential health warnings, add to environment:
```
PACER_PASSWORD_LAST_CHANGED=YYYY-MM-DD  # ISO date when PACER password was last changed
```
If not set, `daysUntilExpiry` and `expiryDate` will be `null` and `isExpiringSoon` will be `false`.

## Next Phase Readiness

- FTC/DOJ RSS feeds now have canary monitoring — format changes will fire alerts after 2 consecutive zero-item polls
- PACER credential expiry surfaced in integrations health endpoint for operator visibility
- Ready for Phase 4 Plan 03 (RSS feed management)

---
*Phase: 04-courtlistener-ftcdoj-rss-ingestion*
*Completed: 2026-03-13*
