---
phase: 02-sec-edgar-ingestion
plan: 02
subsystem: api
tags: [bullmq, drizzle, edgar, html-to-text, vitest, ingestion, event-factory]

# Dependency graph
requires:
  - phase: 02-01
    provides: edgarFetch, buildFilingUrl, buildIndexUrl, TRACKED_FORM_TYPES, HIGH_SIGNAL_TYPES, FilingMetadata, adminDb, filings schema, deals schema, events schema, ingestionQueue

provides:
  - Two-stage EDGAR ingestion pipeline (poll handler + download handler)
  - CIK-based polling from Submissions API with columnar zip-transpose
  - EFTS broad scan for new M&A deals
  - Filing deduplication via accessionNumber unique constraint + onConflictDoNothing
  - HTML-to-plain-text conversion using html-to-text library
  - Deal matcher: CIK matching to existing deals + auto-deal creation for high-signal filings
  - Event factory: firm-scoped Event records from global filings
  - BullMQ worker dispatching edgar_poll and edgar_download handlers
  - 37 unit tests across 4 test files

affects:
  - 02-03  # Clause extraction reads rawContent set by download handler
  - 03-courtlistener  # Same event factory pattern for court events
  - 04-agency  # Same event factory pattern for agency events

# Tech tracking
tech-stack:
  added: []  # html-to-text already added in 02-01
  patterns:
    - "Two-stage ingestion: Stage 1 writes metadata (rawContent=null), Stage 2 fetches content"
    - "Columnar zip-transpose: Submissions API returns arrays, not rows — must loop by index"
    - "Global filings + firm-scoped events: filings table has no firm_id, Events bridge to per-firm inbox"
    - "High-signal auto-deal creation: S-4/DEFM14A create deals with firmId=null, source=auto_edgar"

key-files:
  created:
    - apps/api/src/edgar/poll.ts
    - apps/api/src/edgar/download.ts
    - apps/api/src/edgar/deal-matcher.ts
    - apps/api/src/edgar/event-factory.ts
    - apps/api/src/tests/edgar-poll.test.ts
    - apps/api/src/tests/edgar-download.test.ts
    - apps/api/src/tests/edgar-deal-matcher.test.ts
    - apps/api/src/tests/edgar-event-factory.test.ts
  modified:
    - apps/api/src/worker.ts

key-decisions:
  - "Columnar zip-transpose in pollTrackedCiks: Submissions API returns arrays indexed by position, not row objects — loop by index using count = recent.accessionNumber.length"
  - "Test date sensitivity: test fixtures must use dates within 30-day backfill window relative to current date (2026-03-01); dates older than 30 days are filtered out by sinceDate check"
  - "Mock chain design for poll tests: vi.clearAllMocks() clears implementations, so resetMockChains() helper re-establishes all chains in beforeEach"
  - "Poll test uses mockWhere.mockResolvedValue() for deals query (awaited directly) and mockLimit.mockResolvedValue() for filings query (via orderBy chain)"

patterns-established:
  - "resetMockChains() helper: central function to re-establish Drizzle mock chains after vi.clearAllMocks() — needed because clearAllMocks removes implementations not just call history"
  - "RECENT_DATE constants in tests: use dates relative to known current date to avoid filter edge cases"
  - "Dual-shape mockFrom: mock from() returns {where, orderBy} to support both query shapes without per-test overrides"

requirements-completed: [EDGAR-01, EDGAR-02, EDGAR-04, EDGAR-05]

# Metrics
duration: 18min
completed: 2026-03-01
---

# Phase 02 Plan 02: Two-Stage Ingestion — EDGAR Poll, Download, Deal Matcher, and Event Factory Summary

**BullMQ-driven two-stage EDGAR ingestion pipeline: CIK-based + EFTS polling → HTML download with html-to-text conversion → CIK deal matching with auto-deal creation for S-4/DEFM14A → firm-scoped Event records for Inbox delivery**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-01T14:30:00Z
- **Completed:** 2026-03-01T14:48:00Z
- **Tasks:** 3 (tasks 1 and 2 implemented in 02-01, task 3 implemented here)
- **Files modified:** 9

## Accomplishments

- Full two-stage ingestion pipeline operational: Stage 1 polls EDGAR (CIK submissions + EFTS), inserts filings with rawContent=null, enqueues download jobs; Stage 2 fetches HTML and converts to plain text
- Deal matcher links filings to existing deals by CIK, auto-creates deals (firmId=null, source=auto_edgar) for high-signal S-4/DEFM14A filings per CONTEXT.md locked decision
- Event factory creates one firm-scoped Event per firm tracking a deal, bridging global ingestion to per-firm Inbox visibility
- Worker.ts dispatches edgar_poll and edgar_download jobs via handler registry
- 37 unit tests across 4 files: all pass, covering columnar zip-transpose, type filtering, two-stage insert, HTML conversion, CIK matching, auto-deal creation, materiality scoring

## Task Commits

Each task was committed atomically:

1. **Task 1: EDGAR poll handler (CIK-based + EFTS broad scan)** - `5724bd5` (feat)
2. **Task 2: Download handler, deal matcher, event factory, worker wiring** - `ecd4a92` (feat)
3. **Task 3: Unit tests for all four handlers** - `44d3eb4` (test)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `apps/api/src/edgar/poll.ts` - Stage 1 handler: polls Submissions API (CIK-based) and EFTS (broad scan), inserts filings with rawContent=null, enqueues edgar_download jobs, calls matchFilingToDeal + createFilingEvents
- `apps/api/src/edgar/download.ts` - Stage 2 handler: fetches filing HTML via edgarFetch, converts to plain text with html-to-text, updates rawContent and rawUrl on filing row
- `apps/api/src/edgar/deal-matcher.ts` - CIK-based deal matching; auto-creates deals for S-4/DEFM14A with status=ANNOUNCED, source=auto_edgar, firmId=null; duplicate guard prevents double-creation
- `apps/api/src/edgar/event-factory.ts` - Creates firm-scoped Event records per filing; materiality scores by form type (S-4:80, 8-K:60, 13G:40); severity: CRITICAL>=70, WARNING>=50, INFO<50
- `apps/api/src/worker.ts` - Handler registry (edgar_poll: handleEdgarPoll, edgar_download: handleEdgarDownload) with concurrency=5
- `apps/api/src/tests/edgar-poll.test.ts` - 9 tests: zip-transpose, type filtering, rawContent=null, status assignment, onConflictDoNothing, queue enqueueing, conflict deduplication, 30-day backfill
- `apps/api/src/tests/edgar-download.test.ts` - 5 tests: HTML-to-text, DB update shape, edgarFetch usage, index resolution, no-HTML early return
- `apps/api/src/tests/edgar-deal-matcher.test.ts` - 11 tests: CIK match, targetCik match, multi-firm firmIds, deduplication, null firmId filtering, S-4/DEFM14A auto-create, duplicate prevention, 8-K not auto-created, no filerName guard
- `apps/api/src/tests/edgar-event-factory.test.ts` - 12 tests: per-firm events, empty firmIds guard, type/subType, source/sourceUrl, materiality scores by form type, severity mapping, metadata fields

## Decisions Made

- **Test date sensitivity discovered:** Poll handler filters filings by `sinceDate` (30 days ago). Test fixtures with dates like 2026-01-10/01-15 were being filtered out because current date is 2026-03-01, making them >30 days old. Fixed by using RECENT_DATE constants (2026-02-15 through 2026-02-25).
- **Mock chain reset pattern:** `vi.clearAllMocks()` removes mock implementations, not just call history. Created `resetMockChains()` helper that re-establishes the full Drizzle query builder mock chain in each `beforeEach` to avoid test isolation failures.
- **Dual-shape mockFrom design:** `getLastPollDate()` uses `.from().orderBy().limit()` while `pollTrackedCiks()` uses `.from().where()` (awaited directly). Solution: `mockFrom()` returns `{ where: mockWhere, orderBy: mockOrderBy }` supporting both shapes without per-test overrides.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test mock chain to support dual query shapes**
- **Found during:** Task 3 (unit tests for poll handler)
- **Issue:** Original test mock had `mockFrom` returning only `{ where: mockWhere }` — but `getLastPollDate` uses `.from().orderBy().limit()` without calling `.where()`. Tests failed with "orderBy is not a function".
- **Fix:** Rewrote test file with `resetMockChains()` helper and dual-shape `mockFrom` supporting both `.where()` and `.orderBy()` chains. Used `vi.fn()` declarations (not inline implementations) so `vi.clearAllMocks()` can be followed by `resetMockChains()` to re-establish chains.
- **Files modified:** `apps/api/src/tests/edgar-poll.test.ts`
- **Verification:** All 9 edgar-poll tests pass
- **Committed in:** `44d3eb4`

**2. [Rule 1 - Bug] Fixed test filing date range (30-day filter)**
- **Found during:** Task 3 (edgar-poll tests — filings not being inserted despite correct mocks)
- **Issue:** Test filing dates (2026-01-10, 2026-01-15) were older than 30 days from the current date (2026-03-01). The `sinceDate` for 30-day backfill = 2026-01-30, so both test dates were filtered out in the `filedDate < sinceIso` check.
- **Fix:** Added `RECENT_DATE_1/2/3` constants (2026-02-25, 2026-02-20, 2026-02-15) and replaced all hardcoded old dates in test fixtures.
- **Files modified:** `apps/api/src/tests/edgar-poll.test.ts`
- **Verification:** All tests now trigger filing inserts as expected
- **Committed in:** `44d3eb4`

**3. [Rule 1 - Bug] Fixed strict TypeScript errors in test files**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** `mockValuesInsert.mock.calls[0][0]` and `mockSet.mock.calls[0][0]` caused `TS2493: Tuple type '[]' of length '0' has no element at index '0'` in strict mode.
- **Fix:** Cast `mock.calls` to `unknown as Array<[Record<string, unknown>]>` before indexing.
- **Files modified:** `apps/api/src/tests/edgar-deal-matcher.test.ts`, `apps/api/src/tests/edgar-download.test.ts`
- **Verification:** No TypeScript errors in edgar test files
- **Committed in:** `44d3eb4`

---

**Total deviations:** 3 auto-fixed (all Rule 1 bugs in test infrastructure)
**Impact on plan:** All fixes necessary for correct test behavior. No scope creep. Implementation files (poll.ts, download.ts, deal-matcher.ts, event-factory.ts, worker.ts) required no changes.

## Issues Encountered

- Implementation files (tasks 1 and 2) were committed during plan 02-01 execution — this executor only needed to commit task 3 (tests). No re-implementation was needed.
- Pre-existing EADDRINUSE error in `health.test.ts` (port 3001 already in use) — pre-existing issue documented in deferred-items.md, not caused by this plan.

## Next Phase Readiness

- EDGAR ingestion pipeline fully operational: edgar_poll and edgar_download handlers wired, tested, ready for BullMQ worker startup
- Plan 02-03 can read `rawContent` from filings table for LLM clause extraction
- All EDGAR-01, EDGAR-02, EDGAR-04, EDGAR-05 requirements satisfied

## Self-Check: PASSED

All created files exist:
- FOUND: apps/api/src/edgar/poll.ts
- FOUND: apps/api/src/edgar/download.ts
- FOUND: apps/api/src/edgar/deal-matcher.ts
- FOUND: apps/api/src/edgar/event-factory.ts
- FOUND: apps/api/src/tests/edgar-poll.test.ts
- FOUND: apps/api/src/tests/edgar-download.test.ts
- FOUND: apps/api/src/tests/edgar-deal-matcher.test.ts
- FOUND: apps/api/src/tests/edgar-event-factory.test.ts

All commits exist:
- FOUND: 5724bd5 (feat: poll handler)
- FOUND: ecd4a92 (feat: download + deal-matcher + event-factory + worker)
- FOUND: 44d3eb4 (test: 4 test files)

Test results: 95 passed, 1 skipped — all edgar tests pass.

---
*Phase: 02-sec-edgar-ingestion*
*Completed: 2026-03-01*
