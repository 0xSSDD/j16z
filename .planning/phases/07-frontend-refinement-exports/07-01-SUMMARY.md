---
phase: 07-frontend-refinement-exports
plan: 01
subsystem: ui
tags: [radix-ui, react, tabs, keyboard-navigation, side-panel, deal-card]

# Dependency graph
requires:
  - phase: 06-digests-deal-memo-editor
    provides: MemoList component and memo integration

provides:
  - Radix Tabs deal card with 5 horizontal tabs (Terms, Events, Spread History, News/Research, Reg & Litigation)
  - Sticky DealCardHeader with metrics, export, and alert controls
  - EventsTab with j/k keyboard navigation and onSelect callback
  - DealEventSidePanel for event detail without page navigation
  - Keyboard shortcut wiring (1-5 tabs, j/k events, Enter open, Esc close)

affects:
  - 07-02 (deal board tabs may follow same pattern)
  - 07-03 (CSV/API exports use DealCardHeader export buttons)

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-tabs@1.x"
  patterns:
    - "Controlled Radix Tabs.Root with TABS const array for keyboard-to-tab mapping"
    - "Fixed sidebar pattern: selectedEventId drives right-panel visibility, pr-[400px] offsets main content"
    - "Keyboard guard: skip shortcuts when target is input/textarea/contenteditable"

key-files:
  created:
    - apps/j16z-frontend/src/components/deal-card/deal-card-header.tsx
    - apps/j16z-frontend/src/components/deal-card/deal-event-side-panel.tsx
    - apps/j16z-frontend/src/components/deal-card/tabs/terms-tab.tsx
    - apps/j16z-frontend/src/components/deal-card/tabs/events-tab.tsx
    - apps/j16z-frontend/src/components/deal-card/tabs/spread-history-tab.tsx
    - apps/j16z-frontend/src/components/deal-card/tabs/news-research-tab.tsx
    - apps/j16z-frontend/src/components/deal-card/tabs/reg-litigation-tab.tsx
  modified:
    - apps/j16z-frontend/src/components/deal-card.tsx
    - apps/j16z-frontend/src/components/keyboard-help-modal.tsx
    - apps/j16z-frontend/package.json

key-decisions:
  - "DealEventSidePanel receives events array (not fetching) — deal card already has events loaded, no redundant API call"
  - "Sidebar positioned fixed right-0 top-0 with z-20, main content offset pr-[400px] — avoids flex layout complexity"
  - "j/k keyboard navigation guard on activeTab === events only — prevents conflicts with global nav shortcuts"
  - "@radix-ui/react-tabs chosen over shadcn Tabs — lower abstraction, direct data-[state=active] styling control"

patterns-established:
  - "Tab component split: parent holds state/keyboard handlers, tab components are pure render with callback props"
  - "TABS const array with as const enables numeric key→tab mapping without switch statements"

requirements-completed: [UI-01, UI-02, UI-04, UI-05]

# Metrics
duration: 6min
completed: 2026-03-14
---

# Phase 07 Plan 01: Deal Card Tabbed Layout Summary

**Radix Tabs deal card with 5-tab layout, CourtListener-style event detail sidebar, and j/k/Enter/Esc keyboard shortcuts**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-13T22:39:23Z
- **Completed:** 2026-03-13T22:45:09Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Replaced monolithic collapsible-section deal card with Radix Tabs (Terms, Events, Spread History, News & Research, Reg & Litigation)
- Extracted sticky DealCardHeader with key metrics (spread, p_close, EV, deal value, entry threshold) that persists across all tabs
- Built EventsTab with focused-row highlighting, j/k navigation, and onSelect callback for sidebar integration
- Added DealEventSidePanel reusing InboxSidePanel detail layout — event opens in-context without page navigation
- Wired keyboard shortcuts: 1-5 switch tabs, j/k navigate events list, Enter open detail, Esc close sidebar
- Updated keyboard-help-modal with Deal Card section documenting all new shortcuts

## Task Commits

1. **Task 1: Extract deal card header and create tab components** - `c04dadb` (feat)
2. **Task 2: Rewire deal-card.tsx with Radix Tabs, sidebar state, and keyboard shortcuts** - `4c4c986` (feat)
3. **Lint fix: Biome issues in deal-card.tsx** - `c48f52e` (fix)

## Files Created/Modified

- `apps/j16z-frontend/src/components/deal-card/deal-card-header.tsx` — Sticky metrics header with export/alert controls
- `apps/j16z-frontend/src/components/deal-card/deal-event-side-panel.tsx` — Event detail panel reusing InboxSidePanel pattern
- `apps/j16z-frontend/src/components/deal-card/tabs/terms-tab.tsx` — Clause grouping with CLAUSE_CATEGORIES and ClauseCard
- `apps/j16z-frontend/src/components/deal-card/tabs/events-tab.tsx` — Navigable event list with focused-row highlighting
- `apps/j16z-frontend/src/components/deal-card/tabs/spread-history-tab.tsx` — SpreadChart wrapper
- `apps/j16z-frontend/src/components/deal-card/tabs/news-research-tab.tsx` — NewsSection + MemoList combined
- `apps/j16z-frontend/src/components/deal-card/tabs/reg-litigation-tab.tsx` — COURT/AGENCY events + deal regulatory flags
- `apps/j16z-frontend/src/components/deal-card.tsx` — Rewritten orchestrator with Radix Tabs and sidebar state
- `apps/j16z-frontend/src/components/keyboard-help-modal.tsx` — Added Deal Card shortcuts section
- `apps/j16z-frontend/package.json` — Added @radix-ui/react-tabs

## Decisions Made

- DealEventSidePanel receives pre-loaded events array rather than fetching — the deal card already has all events, eliminates redundant API calls
- Sidebar is fixed position (right-0 top-0) with main content padded by pr-[400px] to prevent overlap — simpler than flex-based split layout
- j/k keyboard navigation only activates when activeTab === 'events' to avoid conflicts with global navigation shortcuts
- Used @radix-ui/react-tabs directly rather than shadcn Tabs wrapper — direct access to data-[state=active] attributes for styling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `type="button"` to all button elements**
- **Found during:** Task 2 (Biome lint check)
- **Issue:** Biome a11y/useButtonType requires explicit type on button elements — missing type defaults to "submit" which can cause unintended form submissions
- **Fix:** Added `type="button"` to all interactive buttons across deal-card-header.tsx, terms-tab.tsx, deal-card.tsx, keyboard-help-modal.tsx
- **Files modified:** All new component files and keyboard-help-modal.tsx
- **Verification:** npx biome check passes for all new files
- **Committed in:** c48f52e (fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing a11y button type)
**Impact on plan:** Minor correctness fix, no scope change.

## Issues Encountered

- `noArrayIndexKey` lint warnings in keyboard-help-modal.tsx — these were pre-existing (the idx/keyIdx patterns were already in the original file). Left in place as pre-existing out-of-scope issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Deal card tabbed layout is ready; analysts can keyboard-navigate between tabs and event detail without page navigation
- Next: 07-02 (landing page polish) and 07-03 (CSV/API exports from deal board)
- Export buttons in DealCardHeader are wired to CSV and JSON functions — ready for 07-03 server-side export enhancements

---
*Phase: 07-frontend-refinement-exports*
*Completed: 2026-03-14*
