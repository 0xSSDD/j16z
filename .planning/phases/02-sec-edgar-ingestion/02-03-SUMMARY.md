---
phase: 02-sec-edgar-ingestion
plan: "03"
subsystem: api, ui
tags: [hono, drizzle, sec-edgar, filings, react, typescript]

# Dependency graph
requires:
  - phase: 02-01
    provides: filings table schema with rawUrl, dealId, status, accessionNumber
  - phase: 02-02
    provides: ingestion pipeline that populates filings table and creates FILING events

provides:
  - Hono GET /api/filings endpoint (firm-scoped through deal ownership)
  - Hono GET /api/filings/deal/:dealId endpoint (with firm ownership check)
  - Hono GET /api/filings/:id endpoint (single filing lookup)
  - Hono GET /api/filings/unmatched endpoint (global unmatched filings)
  - Filing TypeScript type in frontend (FilingType, FilingStatus, Filing, DealWithFilings)
  - getFilings, getAllFilings, getFilingCount API functions (no mock fallback)
  - Deal board filing count badge column (indigo, real data only)
  - Deal card Recent Filings section with color-coded type badges and EDGAR source links
  - Inbox side panel source link wired to event.sourceUrl (replaces href="#")
  - FILING event metadata display in side panel (filing type badge, SEC EDGAR source label)

affects:
  - 02-04  # LLM extraction will need filings endpoint for input
  - 03-courtlistener  # pattern for API route + frontend wiring established here
  - frontend-inbox  # source link fix affects ALL event types, not just FILING

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filings are global (no firm_id); API endpoint scopes via deal ownership JOIN"
    - "No mock fallback for real-data-only features — return empty array when USE_MOCK_DATA=true"
    - "Filing type badge color coding: amber=high-signal (S-4/DEFM14A), orange=action (SC TO-T), blue=event (8-K), gray=ownership (13D/13G)"
    - "firmContextMiddleware pattern applied to /filings/* matching existing /deals/* /events/* /watchlists/*"

key-files:
  created:
    - apps/api/src/routes/filings.ts
    - .planning/phases/02-sec-edgar-ingestion/02-03-SUMMARY.md
  modified:
    - apps/api/src/routes/index.ts
    - apps/api/src/index.ts
    - apps/j16z-frontend/src/lib/types.ts
    - apps/j16z-frontend/src/lib/api.ts
    - apps/j16z-frontend/src/components/deal-board.tsx
    - apps/j16z-frontend/src/components/deal-card.tsx
    - apps/j16z-frontend/src/components/inbox/inbox-side-panel.tsx

key-decisions:
  - "GET /api/filings/unmatched registered before /:id route to prevent Hono route shadowing"
  - "Filing count fetch wrapped in try/catch per deal — backend may not be running in dev"
  - "Recent Filings section hidden when filings.length === 0 (conditional render, not empty state)"
  - "Inbox source link fix applies to all event types — event.sourceUrl replaces href='#' globally"

patterns-established:
  - "Global table routes scope via firm's deal ownership: get dealIds WHERE firmId = firmId, then filter by inArray(dealId)"
  - "Real-data-only API functions return empty array in mock mode (no throw, no stub)"

requirements-completed:
  - EDGAR-02
  - EDGAR-06

# Metrics
duration: 30min
completed: 2026-03-01
---

# Phase 02 Plan 03: Filings API Endpoint + Frontend Deal Board and Inbox Wiring Summary

**Hono /api/filings endpoint with firm-scoped deal filtering, frontend Filing type, deal board badge, deal card filing rows with EDGAR source links, and inbox side panel source link wiring**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-01T12:43:57Z
- **Completed:** 2026-03-01T13:14:54Z
- **Tasks:** 4
- **Files modified:** 9

## Accomplishments

- Filings API endpoint exposes SEC EDGAR filing data scoped through firm's deal ownership — no direct firm_id on filings table, scoped via deal JOIN
- Frontend Filing type and API functions added with no-mock-fallback policy enforced (returns empty array in mock mode per CONTEXT.md locked decision)
- Deal board gains a Filings column with indigo SEC badge; deal card gains a Recent Filings section with color-coded type badges and clickable "View on EDGAR" links satisfying EDGAR-06
- Inbox side panel source link wired from `href="#"` to `event.sourceUrl` — affects all event types, with FILING events showing "View on SEC EDGAR" and filing type/source metadata

## Task Commits

1. **Task 1: Create Hono filings route and mount in API server** - `0fde48d` (feat)
2. **Task 2: Add Filing type to frontend and wire api.ts filing functions** - `55593ca` (feat)
3. **Task 3: Add filing count badge to deal board and filing rows to deal card** - `98fe1ba` (feat)
4. **Task 4: Wire Inbox side panel source link for FILING events** - `38c5c71` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `apps/api/src/routes/filings.ts` — NEW: Hono route with GET /, /deal/:dealId, /:id, /unmatched
- `apps/api/src/routes/index.ts` — Added filingsRoutes export
- `apps/api/src/index.ts` — Added firmContextMiddleware for /filings/* and route mount
- `apps/j16z-frontend/src/lib/types.ts` — Added FilingType, FilingStatus, Filing, DealWithFilings
- `apps/j16z-frontend/src/lib/api.ts` — Added getFilings, getAllFilings, getFilingCount (no mock fallback)
- `apps/j16z-frontend/src/components/deal-board.tsx` — Added Filings column with count badge
- `apps/j16z-frontend/src/components/deal-card.tsx` — Added Recent Filings section with EDGAR links
- `apps/j16z-frontend/src/components/inbox/inbox-side-panel.tsx` — Wired sourceUrl, FILING metadata

## Decisions Made

- `GET /api/filings/unmatched` registered before `GET /:id` to prevent Hono route shadowing — Hono matches routes in registration order
- Filing count fetch in deal board wrapped in per-deal try/catch so backend being offline doesn't break the UI
- Recent Filings section uses conditional render (`filings.length > 0`) rather than showing an empty state section
- Inbox source link fix is global — `event.sourceUrl` replaces `href="#"` for all event types, not just FILING. This is correct behavior since all events should link to their source.

## Deviations from Plan

None — plan executed exactly as written. Route ordering (unmatched before :id) was noted in the plan's implied constraint and handled proactively.

## Issues Encountered

- gsd-tools commands failed when run from `apps/api` CWD — tools require monorepo root. State/summary updates run from `/Users/arpan/Documents/j16z/`. This is a CWD mismatch between executor spawn location and planning directory location.

## Next Phase Readiness

- Filings API endpoint ready for 02-04 (LLM extraction will query /api/filings to find pending filings)
- Filing type established in frontend — future phases can import and use Filing interface
- EDGAR source link pattern established: `rawUrl` in filing record → `sourceUrl` in event record → displayed in inbox side panel

## Self-Check: PASSED

All files verified present and all task commits verified in git log:
- `apps/api/src/routes/filings.ts` — FOUND
- `apps/j16z-frontend/src/lib/types.ts` — FOUND
- `apps/j16z-frontend/src/components/deal-board.tsx` — FOUND
- `apps/j16z-frontend/src/components/deal-card.tsx` — FOUND
- `apps/j16z-frontend/src/components/inbox/inbox-side-panel.tsx` — FOUND
- Commit `0fde48d` — FOUND
- Commit `55593ca` — FOUND
- Commit `98fe1ba` — FOUND
- Commit `38c5c71` — FOUND

---
*Phase: 02-sec-edgar-ingestion*
*Completed: 2026-03-01*
