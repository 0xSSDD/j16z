---
phase: 05-alert-delivery-market-data
plan: 02
subsystem: api
tags: [alpha-vantage, market-data, spread-calculator, merger-arb, bullmq, rate-limiting]

requires:
  - phase: 01-backend-foundation-auth
    provides: "Hono API server, adminDb, BullMQ worker, scheduler, deals/marketSnapshots schema"
provides:
  - "QuoteAdapter interface + AlphaVantageAdapter implementation"
  - "computeSpread function with CASH/STOCK implied consideration formulas"
  - "isMarketOpen ET timezone market hours detection"
  - "handleMarketDataPoll BullMQ handler with rate limiting"
  - "GET /api/market-snapshots/:dealId and /latest endpoints"
  - "market_data_poll schedule (*/5 cron)"
affects: [06-frontend-redesign, deal-board, spread-history]

tech-stack:
  added: [limiter (RateLimiter)]
  patterns: [vendor-agnostic adapter pattern for quote providers, market-hours guard on pollers]

key-files:
  created:
    - apps/api/src/market/types.ts
    - apps/api/src/market/quote-adapter.ts
    - apps/api/src/market/spread-calculator.ts
    - apps/api/src/market/market-poller.ts
    - apps/api/src/routes/market-snapshots.ts
    - apps/api/src/tests/spread-calculator.test.ts
    - apps/api/src/tests/market-poller.test.ts
  modified:
    - apps/api/src/queues/scheduler.ts
    - apps/api/src/worker.ts
    - apps/api/src/routes/index.ts
    - apps/api/src/index.ts

key-decisions:
  - "RateLimiter at 4 tokens/min for Alpha Vantage free tier safety (25 req/day, 5/min)"
  - "acquirerPrice placeholder uses target quote price — separate acquirer quote fetch deferred"
  - "Deals with null firmId (auto-discovered) skip marketSnapshot insert but still get deal price updates"

patterns-established:
  - "Vendor-agnostic adapter: QuoteAdapter interface allows swapping Alpha Vantage for Polygon/IEX without changing poller"
  - "Market hours guard: isMarketOpen() check prevents wasted API calls outside trading hours"

requirements-completed: [MKT-01, MKT-02, MKT-03]

duration: 4min
completed: 2026-03-13
---

# Phase 5 Plan 02: Market Data Summary

**Alpha Vantage quote adapter with merger arb spread calculator, BullMQ market data poller (market-hours aware), and snapshot history API endpoints**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T20:56:37Z
- **Completed:** 2026-03-13T21:00:42Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Vendor-agnostic QuoteAdapter interface with Alpha Vantage GLOBAL_QUOTE implementation
- Spread calculator computing gross spread, annualized return, and implied consideration for both CASH and STOCK deals
- Market data poller with ET timezone market hours guard and 4 req/min rate limiting
- Market snapshots API endpoints (history + latest) with firm isolation
- Scheduler registration at */5 cron (8 total schedules)

## Task Commits

Each task was committed atomically:

1. **Task 1: Quote adapter + spread calculator (TDD RED)** - `9a74ea9` (test)
2. **Task 1: Quote adapter + spread calculator (TDD GREEN)** - `b9fb218` (feat)
3. **Task 2: Market data poller + API endpoint + scheduler** - `009d5fe` (feat)

_TDD: Task 1 used RED-GREEN cycle with separate commits._

## Files Created/Modified
- `apps/api/src/market/types.ts` - QuoteResult, SpreadComputation, QuoteAdapter interfaces
- `apps/api/src/market/quote-adapter.ts` - AlphaVantageAdapter + createQuoteAdapter factory
- `apps/api/src/market/spread-calculator.ts` - computeSpread formulas + isMarketOpen
- `apps/api/src/market/market-poller.ts` - handleMarketDataPoll BullMQ handler
- `apps/api/src/routes/market-snapshots.ts` - GET /:dealId and /:dealId/latest endpoints
- `apps/api/src/tests/spread-calculator.test.ts` - 10 tests for spread + market hours
- `apps/api/src/tests/market-poller.test.ts` - 5 tests for poller behavior
- `apps/api/src/queues/scheduler.ts` - Added market_data_poll schedule
- `apps/api/src/worker.ts` - Registered market_data_poll handler
- `apps/api/src/routes/index.ts` - Added marketSnapshots route export
- `apps/api/src/index.ts` - Mounted /api/market-snapshots with firmContextMiddleware

## Decisions Made
- RateLimiter at 4 tokens/min for Alpha Vantage free tier safety (25 req/day limit, 5/min burst)
- acquirerPrice placeholder uses target's quote price — separate acquirer ticker quote deferred to future enhancement
- Deals with null firmId (auto-discovered) skip marketSnapshot insert but still get deal price column updates
- Market hours uses Intl.DateTimeFormat for timezone-safe ET detection without external library

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed RateLimiter mock in market-poller tests**
- **Found during:** Task 2 (market poller tests)
- **Issue:** vi.fn().mockImplementation() does not produce a proper constructor for `new RateLimiter()` — tests threw "is not a constructor"
- **Fix:** Used class-based mock (`class MockRateLimiter`) with module-level shared mock function
- **Files modified:** apps/api/src/tests/market-poller.test.ts
- **Verification:** All 15 tests pass
- **Committed in:** 009d5fe (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test mock fix necessary for correctness. No scope creep.

## Issues Encountered
- `pnpm check` fails at root level due to pre-existing missing tsconfig files for planned-but-unbuilt packages (j16z-backend, design-system, utils). API-scoped `tsc --noEmit` passes cleanly.

## User Setup Required

ALPHA_VANTAGE_API_KEY environment variable must be set for market data polling:
- Sign up at https://www.alphavantage.co/support/#api-key
- Add `ALPHA_VANTAGE_API_KEY=your_key` to `.env`

## Next Phase Readiness
- Market data subsystem complete — ready for frontend deal board spread display
- Snapshot history API enables spread chart rendering on deal cards
- Plan 05-03 (if exists) can build on market data for spread alerts

---
*Phase: 05-alert-delivery-market-data*
*Completed: 2026-03-13*
