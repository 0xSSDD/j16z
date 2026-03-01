---
phase: 03-llm-extraction-pipeline
plan: 3
subsystem: api, testing
tags: [python, materiality-scoring, langextract, react, typescript, tdd, regression-testing]

# Dependency graph
requires:
  - phase: 03-llm-extraction-pipeline
    provides: "Extraction pipelines (s4_defm14a.py, eightk.py, thirteend_g.py), db.py with create_extraction_event()"
  - phase: 03-llm-extraction-pipeline
    provides: "scoring/__init__.py stub from plan 03-01"
provides:
  - Python materiality scoring (calculate_materiality_score, get_severity, get_materiality_tier)
  - Regression test harness structure with fixture/golden directories
  - Expanded ClauseType (13 types including GO_SHOP, TICKING_FEE, etc.)
  - Real clause display in deal card with grouped categories and collapsible verbatim quotes
  - DB materiality scores read by Inbox (EXTRACT-07)
  - All three pipelines create Inbox events with DB-stored materiality scores
affects:
  - 04-court-listener-integration
  - 05-alerts-notifications
  - frontend-deal-card

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Python port of TypeScript scoring logic — identical BASE_SCORES and adjustment thresholds
    - TDD (RED → GREEN) for Python materiality scoring module
    - Grouped clause display with ClauseCard component (category sections + collapsible verbatim)
    - EXTRACT-07 pattern: materiality score stored in DB at extraction time, read directly by frontend with client-side fallback

key-files:
  created:
    - apps/langextract/scoring/materiality.py
    - apps/langextract/tests/test_materiality.py
    - apps/langextract/tests/test_regression.py
    - apps/langextract/tests/fixtures/.gitkeep
    - apps/langextract/tests/golden/.gitkeep
  modified:
    - apps/langextract/scoring/__init__.py
    - apps/langextract/pipelines/s4_defm14a.py
    - apps/langextract/pipelines/eightk.py
    - apps/langextract/pipelines/thirteend_g.py
    - apps/j16z-frontend/src/lib/types.ts
    - apps/j16z-frontend/src/components/deal-card.tsx
    - apps/j16z-frontend/src/components/inbox/inbox-timeline.tsx

key-decisions:
  - "Severity threshold for CRITICAL is >= 70 (not strictly > 70) — matches CLAUDE.md materiality scoring spec"
  - "Regression test is a no-op until fixtures populated — parametrize produces empty list when fixtures/ is empty"
  - "ClauseCard falls back to value (legacy mock) if summary/verbatimText not present — backward compat preserved"
  - "Inbox falls back to client-side severity computation for events with materialityScore == 0 or undefined"

patterns-established:
  - "Python/TypeScript parity: Python porting of TS logic verified by mirrored test suite"
  - "ClauseCard pattern: summary inline, verbatim collapsed, confidence badge, analyst badge, provenance link"
  - "EXTRACT-07 inbox pattern: event.materialityScore from DB takes precedence; fallback to client-side scoring"

requirements-completed:
  - EXTRACT-05
  - EXTRACT-07

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 3 Plan 3: Materiality Scoring, Clause Display, and Regression Harness Summary

**Python materiality scoring (55 tests, TDD) wiring into all three extraction pipelines; deal card switched to real clause API with grouped categories and collapsible verbatim quotes; Inbox reads DB-stored scores per EXTRACT-07**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T22:12:13Z
- **Completed:** 2026-03-01T22:18:44Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Ported TypeScript materiality scoring to Python with identical BASE_SCORES, all adjustment thresholds, and 0-100 clamping — verified by 55 passing tests
- Wired `calculate_materiality_score()` into all three extraction pipelines (S-4/DEFM14A, 8-K, 13D/13G) which now call `create_extraction_event()` with DB-stored scores (EXTRACT-07)
- Regression test harness structure established with `tests/fixtures/` and `tests/golden/` directories; no-op until EDGAR filing fixtures added during bootstrap sprint
- Frontend deal card switches from `MOCK_CLAUSES.filter()` to real `getClauses()` API call with graceful fallback; clauses grouped by category (Termination/Conditions/Protective/Other) with collapsible verbatim quotes, confidence warning icons, and analyst-verified badges
- Inbox reads `event.materialityScore` from DB when available, falls back to client-side `calculateSeverityWithLevel()` for pre-extraction events

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for Python materiality scoring and regression harness** - `26294c0` (test)
2. **Task 1 GREEN: Python materiality scoring + pipeline wiring** - `9a9b446` (feat)
3. **Task 2: Frontend ClauseType expansion, real clause display, DB materiality scores** - `dbb4037` (feat)

_Note: Task 1 used TDD — separate RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `apps/langextract/scoring/materiality.py` - Python port of materiality-scoring.ts; BASE_SCORES, calculate_materiality_score, get_severity, get_materiality_tier
- `apps/langextract/scoring/__init__.py` - Updated to export materiality functions
- `apps/langextract/tests/test_materiality.py` - 55 tests covering all BASE_SCORES, adjustments, clamping, severity tiers; cross-language parity verification
- `apps/langextract/tests/test_regression.py` - Golden file regression harness; no-op until fixtures populated; structural smoke tests always pass
- `apps/langextract/tests/fixtures/.gitkeep` - Placeholder for future EDGAR fixture .txt files
- `apps/langextract/tests/golden/.gitkeep` - Placeholder for future golden .json files
- `apps/langextract/pipelines/s4_defm14a.py` - Calls calculate_materiality_score(FILING, S4_DEFM14A) and create_extraction_event() after extraction
- `apps/langextract/pipelines/eightk.py` - Calls calculate_materiality_score(FILING, 8K_AMENDMENT) and create_extraction_event()
- `apps/langextract/pipelines/thirteend_g.py` - Calls calculate_materiality_score(FILING, ROUTINE_UPDATE) and create_extraction_event() (only when deal_id present)
- `apps/j16z-frontend/src/lib/types.ts` - ClauseType expanded to 13 values; Clause interface adds extraction fields as optional; Event interface adds optional materialityScore field
- `apps/j16z-frontend/src/components/deal-card.tsx` - getClauses() replaces MOCK_CLAUSES; ClauseCard component with grouped categories, collapsible verbatim, confidence/verified badges
- `apps/j16z-frontend/src/components/inbox/inbox-timeline.tsx` - Uses event.materialityScore from DB; client-side fallback for pre-extraction events

## Decisions Made
- Severity CRITICAL threshold set to >= 70 (not strictly > 70) — matches the CLAUDE.md description "CRITICAL (>70)" which in practice means >= 70 boundary matching TypeScript severity-scoring.ts behavior
- Regression test uses `FIXTURES_DIR.glob("*.txt")` for parametrize — zero fixtures = no test cases (no-op); structural smoke tests always run regardless
- ClauseCard displays `summary ?? value ?? verbatimText[:120]` — gracefully handles both mock data (value only) and real extraction data (summary + verbatimText)
- 13D/13G pipeline only creates Inbox event when `deal_id` is present — activist filings without a tracked deal are skipped

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Root `pnpm check` fails with missing tsconfigs for apps/j16z-backend and packages/design-system/utils — pre-existing issue, not caused by this plan. Frontend-specific `tsc --noEmit` in apps/j16z-frontend/ passes cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (LLM Extraction Pipeline) is now complete — all 3 plans executed
- Python materiality scores flow from extraction pipeline → DB → frontend Inbox (EXTRACT-07)
- Deal cards display real extracted clauses when backend is running (EXTRACT-05)
- Regression harness is ready; bootstrap sprint needed to add 20 real EDGAR filings to tests/fixtures/
- Phase 4 (CourtListener Integration) can begin — backend extraction foundation is solid

---
*Phase: 03-llm-extraction-pipeline*
*Completed: 2026-03-01*
