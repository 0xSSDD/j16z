# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Runner:**
- Vitest 4.0.2
- Config: Not yet configured (no vitest.config.ts found)
- Command: `pnpm test` (root), `pnpm test:be` (backend-specific via `--project=j16z-backend`)

**Assertion Library:**
- Not determined (Vitest comes with built-in expect)

**Run Commands:**
```bash
pnpm test              # Run all tests (currently no tests)
pnpm test:be           # Run backend tests only (if configured)
pnpm lint              # Check code with Biome (linting/formatting)
pnpm lint:fix          # Auto-fix code with Biome
pnpm check             # TypeScript type-checking (tsc -b)
```

## Test File Organization

**Current State:**
- No test files found in the codebase
- No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files present
- No test directories (`__tests__`, `tests/`, `.test/`) present
- Vitest is configured in package.json but not yet set up

**Expected Pattern (not yet implemented):**
- Test files likely co-located with source files or in parallel directory structure
- Naming convention: `[module].test.ts` or `[module].spec.ts`

## Test Structure

**Current Testing Approach:**
- No unit or integration tests implemented
- Manual testing only
- Frontend uses localStorage for persistence, which can be manually inspected

**Build-Time Type Checking:**
- `pnpm check` runs TypeScript type checking (`tsc -b`)
- All TypeScript files are strictly typed (strict mode enabled)
- Type safety acts as first line of defense

## Mocking

**Current Strategy:**
- **Mock Data:** Extensive mock data layer in `src/lib/constants.ts`
- **Data Access Pattern:** API abstraction layer (`src/lib/api.ts`) switches between mock and real API calls based on `NEXT_PUBLIC_USE_MOCK_DATA` environment variable

**Mock Data Structure:**
- File: `src/lib/constants.ts` (~1,381 lines)
- Exports:
  - `MOCK_DEALS`: Array of test deals
  - `MOCK_EVENTS`: Array of test events
  - `MOCK_CLAUSES`: Array of test clauses
  - `MOCK_MARKET_SNAPSHOTS`: Array of market data
  - `DATA_SOURCES`: Array of data source configurations
  - `MOCK_ITEMS`: Array of intelligence items

**Mock Mode Usage:**
- Set `NEXT_PUBLIC_USE_MOCK_DATA=true` in environment
- All API functions in `src/lib/api.ts` check this flag
- Mock functions simulate network delay with `setTimeout(100-200ms)`
- Production mode: Real fetch calls to `/api/*` endpoints

**Example from `src/lib/api.ts`:**
```typescript
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export async function getDeal(id: string): Promise<Deal | null> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_DEALS.find((d) => d.id === id) || null;
  }

  const response = await fetch(`/api/deals/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch deal");
  }
  return response.json();
}
```

**What to Mock (Development Strategy):**
- All external API calls (handled via abstraction layer)
- localStorage operations (via `use-local-storage-state` library)
- Date/time values (use date-fns utilities)

**What NOT to Mock:**
- Component rendering logic (test via integration)
- User interactions (keyboard, clicks - test via integration)
- Business logic calculations (scoring functions should be tested)

## Fixtures and Factories

**Current Implementation:**
- `src/lib/constants.ts` serves as fixture/factory file
- Large objects defined at module level for reuse

**Mock Fixtures:**
```typescript
// In src/lib/constants.ts
export const MOCK_DEALS: Deal[] = [
  {
    id: "deal-001",
    symbol: "ACME",
    acquirerSymbol: "TECH",
    companyName: "Acme Corp",
    acquisitionDate: "2025-12-31",
    // ... more fields
  },
  // ... more deals
];

export const MOCK_EVENTS: Event[] = [
  {
    id: "event-001",
    dealId: "deal-001",
    type: "FILING",
    subtype: "S4_DEFM14A",
    // ... more fields
  },
  // ... more events
];
```

**Location:**
- All fixtures in `src/lib/constants.ts`
- Organized by type (MOCK_DEALS, MOCK_EVENTS, etc.)
- ~1,381 lines total for comprehensive test coverage

## Coverage

**Requirements:** None enforced

**View Coverage:**
- Not configured (would use `vitest --coverage` once setup complete)

**Current State:**
- Type safety from strict TypeScript: `strict: true`, `exactOptionalPropertyTypes: true`, `noUnusedLocals: true`
- Manual QA via mock data in dev mode (`NEXT_PUBLIC_USE_MOCK_DATA=true`)

## Test Types

**Unit Tests:**
- Not yet implemented
- Should cover:
  - Scoring functions (`src/lib/severity-scoring.ts`, `src/lib/materiality-scoring.ts`)
  - Date utilities (`src/lib/date-utils.ts`)
  - API abstraction layer (`src/lib/api.ts`) with mock mode
  - Helper functions

**Integration Tests:**
- Not yet implemented
- Should cover:
  - Component + API interaction (e.g., `InboxTimeline` loading events)
  - Data enrichment pipelines (fetching data, transforming, rendering)
  - LocalStorage persistence flows

**E2E Tests:**
- Not yet implemented
- Framework: Playwright 1.56.1 (dependency installed, not configured)

## Common Patterns

**Async Testing (Not Implemented Yet):**
- Vitest pattern for async functions:
```typescript
it("should load events", async () => {
  const events = await getAllEvents();
  expect(events).toHaveLength(10);
});
```

**Error Testing (Not Implemented Yet):**
```typescript
it("should throw on 404", async () => {
  await expect(getDeal("invalid-id")).rejects.toThrow("Failed to fetch deal");
});
```

**Mock Mode Testing (Planned Pattern):**
```typescript
it("should return mock data when enabled", async () => {
  process.env.NEXT_PUBLIC_USE_MOCK_DATA = "true";
  const deals = await getDeals();
  expect(deals.length).toBeGreaterThan(0);
});
```

## Development Testing Workflow

**Current Approach:**
1. Set `NEXT_PUBLIC_USE_MOCK_DATA=true` in `.env.local`
2. Run `pnpm dev` to start Next.js dev server
3. Manual click-through testing with mock data
4. Use browser console for debugging (console.error is used throughout)
5. Type checking: `pnpm check` for TypeScript validation

**Validation:**
- localStorage persists across page reloads (filters, theme, read status)
- API responses handled in try-catch blocks with error logging
- Component props typed strictly (TypeScript)
- No runtime type checking needed due to strict types

## Integration Points to Test

**Data Flow Testing** (to implement):
- `src/lib/api.ts`: Mock vs real API switching
- Event enrichment: `src/components/inbox/inbox-timeline.tsx` fetches events, enriches with scores
- Scoring: `calculateSeverityWithLevel()` takes event context → returns score + level + badge
- Filtering: `filteredEvents` array computed from events + filters
- localStorage: Theme, read status, filter preferences persist

**Example Test Scenario:**
```typescript
// Load events from API (mock)
// Enrich each with severity score
// Apply filters (severity, type, deal, unread)
// Apply search query
// Paginate results
// Verify sorted by severity (CRITICAL > WARNING > INFO)
// Verify badges rendered correctly
```

## Type Safety as Testing

**TypeScript Strict Mode Configuration** (`tsconfig.base.json`):
- `strict: true` - All strict checks enabled
- `exactOptionalPropertyTypes: true` - Optional properties cannot be undefined by default
- `noUnusedLocals: true` - Catches unused variables at compile time
- `noFallthroughCasesInSwitch: true` - All cases must have break/return

**Benefits:**
- Prevents entire categories of runtime errors
- Function signatures act as contracts
- Missing fields caught at type-check time
- Invalid prop combinations prevented

**Example:**
```typescript
// This would fail type check:
const deal: Deal = { id: "1" }; // Missing required fields

// This would fail at compile time:
interface Props { text: string }
// Caller must pass text; optional not allowed
```

## CI/CD Integration

**Not yet configured:**
- No test workflow in CI/CD
- Biome linting runs locally (`pnpm lint`)
- TypeScript checking runs locally (`pnpm check`)

**Future Test Integration:**
- Add `pnpm test` to CI pipeline
- Enforce code coverage thresholds
- Run both frontend and backend tests

---

*Testing analysis: 2026-02-25*
