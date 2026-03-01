/**
 * EDGAR deal matcher unit tests
 *
 * Tests CIK matching to existing deals and auto-deal creation for high-signal filings.
 * Per CONTEXT.md locked decision: S-4, DEFM14A auto-create deals as ANNOUNCED.
 * Mocks adminDb entirely — no real database connections.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilingMetadata } from '../edgar/types.js';

// ---------------------------------------------------------------------------
// Mocks
//
// deal-matcher.ts calls:
//   1. adminDb.select().from(deals).where(and(isNull(deletedAt), or(eq(acquirerCik), eq(targetCik))))
//      -- CIK match query (no .limit())
//   2. adminDb.select().from(deals).where(and(isNull, eq(source), or(...))).limit(1)
//      -- Existing auto-deal check (has .limit(1))
//   3. adminDb.insert(deals).values({...}).returning({ id })
//      -- Auto-deal creation
//
// We build the mock chain to support both query shapes.
// ---------------------------------------------------------------------------

// Track calls so tests can control sequential return values
const mockCikWhereResult = vi.fn();     // result of .where() in CIK match query (awaited directly)
const mockAutoWhereLimitResult = vi.fn(); // result of .limit() in auto-deal check query
const mockReturningDeal = vi.fn();
const mockValuesInsert = vi.fn(() => ({ returning: mockReturningDeal }));
const mockInsert = vi.fn(() => ({ values: mockValuesInsert }));

// select() call count so we can differentiate query 1 vs query 2
let selectCallCount = 0;

function makeSelectMock() {
  selectCallCount = 0;
  return vi.fn(() => {
    const callIndex = selectCallCount++;
    if (callIndex === 0) {
      // First select: CIK match query — .where() is awaited directly (no .limit())
      return {
        from: () => ({
          where: mockCikWhereResult,
        }),
      };
    }
    // Second select: existing auto-deal check — has .limit()
    return {
      from: () => ({
        where: () => ({
          limit: mockAutoWhereLimitResult,
        }),
      }),
    };
  });
}

let mockSelect = makeSelectMock();

vi.mock('../db/index.js', () => ({
  adminDb: {
    get select() { return mockSelect; },
    get insert() { return mockInsert; },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFilingMetadata(overrides: Partial<FilingMetadata> = {}): FilingMetadata {
  return {
    accessionNumber: '0000320193-26-000001',
    filingType: 'S-4',
    filedDate: '2026-01-15',
    primaryDocument: 'ds4.htm',
    filerCik: '320193',
    filerName: 'ACME Corp',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('deal matcher — CIK-based matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect = makeSelectMock();
    mockInsert.mockReturnValue({ values: mockValuesInsert });
    mockValuesInsert.mockReturnValue({ returning: mockReturningDeal });
  });

  it('returns existing deal ID and firmIds when acquirerCik matches', async () => {
    // CIK match query returns a deal
    mockCikWhereResult.mockResolvedValueOnce([{ id: 'deal-1', firmId: 'firm-1' }]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata({ filerCik: '320193' }));

    expect(result.dealId).toBe('deal-1');
    expect(result.isNewDeal).toBe(false);
    expect(result.firmIds).toContain('firm-1');
  });

  it('returns existing deal ID when targetCik matches (not just acquirerCik)', async () => {
    // Target company files — deal is found by targetCik match
    mockCikWhereResult.mockResolvedValueOnce([{ id: 'deal-2', firmId: 'firm-2' }]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata({ filerCik: '999999' }));

    expect(result.dealId).toBe('deal-2');
    expect(result.isNewDeal).toBe(false);
  });

  it('returns all firmIds when multiple firms track the same deal CIK', async () => {
    // Two firms both track the same deal — both should get events
    mockCikWhereResult.mockResolvedValueOnce([
      { id: 'deal-1', firmId: 'firm-1' },
      { id: 'deal-1', firmId: 'firm-2' },
    ]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata());

    expect(result.firmIds).toContain('firm-1');
    expect(result.firmIds).toContain('firm-2');
    expect(result.firmIds.length).toBe(2);
  });

  it('deduplicates firmIds — same firm via multiple deals returns each firm once', async () => {
    // Same firm appears twice (two deals with same firm)
    mockCikWhereResult.mockResolvedValueOnce([
      { id: 'deal-1', firmId: 'firm-1' },
      { id: 'deal-2', firmId: 'firm-1' }, // same firm
    ]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata());

    expect(result.firmIds).toContain('firm-1');
    expect(result.firmIds.length).toBe(1); // deduplicated
  });

  it('excludes null firmIds from firmIds array (auto-created deal in pool has no firm)', async () => {
    mockCikWhereResult.mockResolvedValueOnce([
      { id: 'deal-1', firmId: null }, // auto-created deal — no firm
    ]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata());

    expect(result.dealId).toBe('deal-1');
    expect(result.firmIds).toHaveLength(0); // null firmId filtered out
  });
});

describe('deal matcher — high-signal auto-deal creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect = makeSelectMock();
    mockInsert.mockReturnValue({ values: mockValuesInsert });
    mockValuesInsert.mockReturnValue({ returning: mockReturningDeal });
  });

  it('auto-creates deal for S-4 filing with no CIK match', async () => {
    // CIK match: no match; existing auto-deal: none
    mockCikWhereResult.mockResolvedValueOnce([]);
    mockAutoWhereLimitResult.mockResolvedValueOnce([]);
    mockReturningDeal.mockResolvedValueOnce([{ id: 'new-deal-id' }]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata({ filingType: 'S-4' }));

    expect(result.dealId).toBe('new-deal-id');
    expect(result.isNewDeal).toBe(true);
    expect(result.firmIds).toHaveLength(0); // no firms — in discovery pool
  });

  it('auto-creates deal for DEFM14A filing with no CIK match', async () => {
    mockCikWhereResult.mockResolvedValueOnce([]);
    mockAutoWhereLimitResult.mockResolvedValueOnce([]);
    mockReturningDeal.mockResolvedValueOnce([{ id: 'new-deal-id' }]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata({ filingType: 'DEFM14A' }));

    expect(result.dealId).toBe('new-deal-id');
    expect(result.isNewDeal).toBe(true);
  });

  it('auto-created deal has correct fields: status=ANNOUNCED, source=auto_edgar, filerCik as acquirerCik', async () => {
    mockCikWhereResult.mockResolvedValueOnce([]);
    mockAutoWhereLimitResult.mockResolvedValueOnce([]);
    mockReturningDeal.mockResolvedValueOnce([{ id: 'new-deal-id' }]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    await matchFilingToDeal(makeFilingMetadata({ filingType: 'S-4', filerCik: '320193', filerName: 'ACME Corp' }));

    const insertedValuesCalls = mockValuesInsert.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const insertedValues = insertedValuesCalls[0]?.[0];
    expect(insertedValues?.status).toBe('ANNOUNCED');
    expect(insertedValues?.source).toBe('auto_edgar');
    expect(insertedValues?.acquirerCik).toBe('320193');
    expect(insertedValues?.acquirer).toBe('ACME Corp');
  });

  it('prevents duplicate auto-creation: returns existing auto_edgar deal instead of creating new one', async () => {
    // CIK match: empty; existing auto_edgar deal: found
    mockCikWhereResult.mockResolvedValueOnce([]);
    mockAutoWhereLimitResult.mockResolvedValueOnce([{ id: 'existing-auto-deal-id' }]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata({ filingType: 'S-4' }));

    expect(result.dealId).toBe('existing-auto-deal-id');
    expect(result.isNewDeal).toBe(false);
    // Should NOT have called insert — returned existing deal
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('low-signal 8-K filing does NOT auto-create a deal', async () => {
    // No CIK match — and 8-K is not high-signal (no second select needed)
    mockCikWhereResult.mockResolvedValueOnce([]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata({ filingType: '8-K' }));

    expect(result.dealId).toBeNull();
    expect(result.isNewDeal).toBe(false);
    expect(result.firmIds).toHaveLength(0);
    // insert should NOT have been called
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('SC 13D (low-signal) filing does NOT auto-create a deal', async () => {
    mockCikWhereResult.mockResolvedValueOnce([]);

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(makeFilingMetadata({ filingType: 'SC 13D' }));

    expect(result.dealId).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('S-4 filing WITHOUT filerName does NOT auto-create a deal', async () => {
    // filerName is required for auto-deal creation
    const filingWithoutName: FilingMetadata = {
      accessionNumber: '0000320193-26-000001',
      filingType: 'S-4',
      filedDate: '2026-01-15',
      primaryDocument: 'ds4.htm',
      filerCik: '320193',
      // filerName intentionally omitted
    };

    mockCikWhereResult.mockResolvedValueOnce([]); // no CIK match

    const { matchFilingToDeal } = await import('../edgar/deal-matcher.js');
    const result = await matchFilingToDeal(filingWithoutName);

    expect(result.dealId).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
