/**
 * EDGAR poll handler unit tests
 *
 * Covers EDGAR-02 (ingest 8-K, S-4, DEFM14A, 13D/13G) and EDGAR-05 (two-stage:
 * raw_content=null on Stage 1 insert).
 *
 * Mocks: edgarFetch (no real HTTP), adminDb (no real database), ingestionQueue (no real Redis).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that transitively use them
// ---------------------------------------------------------------------------

const mockIngestionQueueAdd = vi.fn().mockResolvedValue(undefined);

vi.mock('../queues/ingestion.js', () => ({
  ingestionQueue: {
    add: mockIngestionQueueAdd,
  },
}));

vi.mock('../queues/connection.js', () => ({
  redisConnection: { host: 'mock-host', port: 6379 },
}));

// adminDb mock
//
// handleEdgarPoll calls adminDb.select() in two different query shapes:
//   1. getLastPollDate:   .select().from().orderBy().limit()     (no .where())
//   2. pollTrackedCiks:   .select().from().where()               (awaited directly, no .orderBy)
//
// The mock chain must support BOTH shapes. We use a shared `mockFrom` that
// returns an object with both `where` and `orderBy` methods.
//
// NOTE: vi.clearAllMocks() clears implementations, so we must re-set them
//       in each beforeEach after clearing.

const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();

const mockReturning = vi.fn();
const mockOnConflictDoNothing = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();

const mockSetWhere = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../db/index.js', () => ({
  adminDb: {
    get select() {
      return mockSelect;
    },
    get insert() {
      return mockInsert;
    },
    get update() {
      return mockUpdate;
    },
  },
}));

// deal-matcher mock — returns no match by default (filing goes unmatched)
const mockMatchFilingToDeal = vi.fn().mockResolvedValue({ dealId: null, isNewDeal: false, firmIds: [] });
vi.mock('../edgar/deal-matcher.js', () => ({
  matchFilingToDeal: mockMatchFilingToDeal,
}));

// event-factory mock
const mockCreateFilingEvents = vi.fn().mockResolvedValue(undefined);
vi.mock('../edgar/event-factory.js', () => ({
  createFilingEvents: mockCreateFilingEvents,
}));

// edgarFetch mock — default to returning an empty submissions response
const mockEdgarFetch = vi.fn();
vi.mock('../edgar/client.js', () => ({
  edgarFetch: mockEdgarFetch,
  buildFilingUrl: (cik: string, accession: string, doc: string) =>
    `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${doc}`,
  buildIndexUrl: (cik: string, accession: string) =>
    `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${accession}-index.json`,
}));

// ---------------------------------------------------------------------------
// Helper: reset all mock chains to their default implementations.
// Must be called after vi.clearAllMocks() in each beforeEach.
//
// Query chain shapes:
//   getLastPollDate:   select().from().orderBy().limit() → []
//   pollTrackedCiks:   select().from().where()           → [] (no tracked deals)
//   insert:            insert().values().onConflictDoNothing().returning() → []
//   update:            update().set().where()            → []
// ---------------------------------------------------------------------------
function resetMockChains({
  dealsRows = [] as Array<{ acquirerCik: string | null; targetCik: string | null }>,
  lastPollRows = [] as Array<{ filedDate: string }>,
  insertRows = [] as Array<{ id: string }>,
} = {}) {
  // Select chain
  mockLimit.mockResolvedValue(lastPollRows);
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockWhere.mockResolvedValue(dealsRows);
  mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
  mockSelect.mockReturnValue({ from: mockFrom });

  // Insert chain
  mockReturning.mockResolvedValue(insertRows);
  mockOnConflictDoNothing.mockReturnValue({ returning: mockReturning });
  mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  mockInsert.mockReturnValue({ values: mockValues });

  // Update chain
  mockSetWhere.mockResolvedValue([]);
  mockSet.mockReturnValue({ where: mockSetWhere });
  mockUpdate.mockReturnValue({ set: mockSet });

  // deal-matcher default: no match
  mockMatchFilingToDeal.mockResolvedValue({ dealId: null, isNewDeal: false, firmIds: [] });
}

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

// Dates within the last 30 days (relative to today: 2026-03-01)
const RECENT_DATE_1 = '2026-02-25';
const RECENT_DATE_2 = '2026-02-20';
const RECENT_DATE_3 = '2026-02-15';

function makeSubmissionsResponse(overrides: {
  accessionNumber?: string[];
  form?: string[];
  filingDate?: string[];
  primaryDocument?: string[];
  name?: string;
  cik?: number;
}) {
  return {
    cik: overrides.cik ?? 320193,
    name: overrides.name ?? 'Apple Inc',
    filings: {
      recent: {
        accessionNumber: overrides.accessionNumber ?? ['0000320193-26-000001'],
        form: overrides.form ?? ['8-K'],
        filingDate: overrides.filingDate ?? [RECENT_DATE_1],
        primaryDocument: overrides.primaryDocument ?? ['form8k.htm'],
      },
    },
  };
}

function makeJsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('edgar poll handler — zip-transpose of columnar submissions response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChains();
    mockIngestionQueueAdd.mockResolvedValue(undefined);
  });

  it('zip-transposes columnar arrays into correct FilingMetadata objects', async () => {
    // Arrange: two filings in columnar format (dates within 30-day backfill window)
    const submissionsData = makeSubmissionsResponse({
      accessionNumber: ['0000320193-26-000001', '0000320193-26-000002'],
      form: ['S-4', '8-K'],
      filingDate: [RECENT_DATE_1, RECENT_DATE_2],
      primaryDocument: ['ds4.htm', 'form8k.htm'],
      name: 'ACME Corp',
    });

    resetMockChains({
      dealsRows: [{ acquirerCik: '320193', targetCik: null }],
      insertRows: [{ id: 'filing-uuid-1' }],
    });

    mockEdgarFetch.mockResolvedValue(makeJsonResponse(submissionsData));

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    // Verify insert was called with correct filing types (both filings)
    expect(mockInsert).toHaveBeenCalled();
    const insertCalls = mockValues.mock.calls;
    expect(insertCalls.length).toBeGreaterThan(0);
    // First call should be S-4
    expect(insertCalls[0][0].filingType).toBe('S-4');
    expect(insertCalls[0][0].filerCik).toBe('320193');
    expect(insertCalls[0][0].accessionNumber).toBe('0000320193-26-000001');
  });

  it('filters out non-tracked form types (10-K, 10-Q) and keeps tracked types', async () => {
    const submissionsData = makeSubmissionsResponse({
      accessionNumber: ['0000320193-26-000001', '0000320193-26-000002', '0000320193-26-000003'],
      form: ['10-K', 'S-4', '10-Q'], // only S-4 should pass the filter
      filingDate: [RECENT_DATE_1, RECENT_DATE_2, RECENT_DATE_3],
      primaryDocument: ['10k.htm', 'ds4.htm', '10q.htm'],
    });

    resetMockChains({
      dealsRows: [{ acquirerCik: '320193', targetCik: null }],
      insertRows: [{ id: 'filing-uuid-1' }],
    });

    mockEdgarFetch.mockResolvedValue(makeJsonResponse(submissionsData));

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    // Only S-4 should have been inserted — 10-K and 10-Q are filtered out
    const insertedTypes = mockValues.mock.calls.map((call) => call[0].filingType);
    expect(insertedTypes).toContain('S-4');
    expect(insertedTypes).not.toContain('10-K');
    expect(insertedTypes).not.toContain('10-Q');
  });
});

describe('edgar poll handler — filing insert behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChains();
    mockIngestionQueueAdd.mockResolvedValue(undefined);
  });

  it('filing row has rawContent=null and extracted=false on Stage 1 insert (two-stage EDGAR-05)', async () => {
    const submissionsData = makeSubmissionsResponse({
      accessionNumber: ['0000320193-26-000001'],
      form: ['8-K'],
      filingDate: [RECENT_DATE_1],
      primaryDocument: ['form8k.htm'],
    });

    resetMockChains({
      dealsRows: [{ acquirerCik: '320193', targetCik: null }],
      insertRows: [{ id: 'filing-uuid-1' }],
    });

    mockEdgarFetch.mockResolvedValue(makeJsonResponse(submissionsData));

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.rawContent).toBeNull();
    expect(insertedValues.extracted).toBe(false);
  });

  it('high-signal filing (S-4) gets status "active"', async () => {
    const submissionsData = makeSubmissionsResponse({
      accessionNumber: ['0000320193-26-000001'],
      form: ['S-4'],
      filingDate: [RECENT_DATE_1],
      primaryDocument: ['ds4.htm'],
    });

    resetMockChains({
      dealsRows: [{ acquirerCik: '320193', targetCik: null }],
      insertRows: [{ id: 'filing-uuid-1' }],
    });

    mockEdgarFetch.mockResolvedValue(makeJsonResponse(submissionsData));

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.status).toBe('active');
  });

  it('low-signal filing (8-K) gets status "pending_review"', async () => {
    const submissionsData = makeSubmissionsResponse({
      accessionNumber: ['0000320193-26-000001'],
      form: ['8-K'],
      filingDate: [RECENT_DATE_1],
      primaryDocument: ['form8k.htm'],
    });

    resetMockChains({
      dealsRows: [{ acquirerCik: '320193', targetCik: null }],
      insertRows: [{ id: 'filing-uuid-1' }],
    });

    mockEdgarFetch.mockResolvedValue(makeJsonResponse(submissionsData));

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.status).toBe('pending_review');
  });

  it('filing insert uses onConflictDoNothing on accessionNumber', async () => {
    const submissionsData = makeSubmissionsResponse({
      accessionNumber: ['0000320193-26-000001'],
      form: ['8-K'],
      filingDate: [RECENT_DATE_1],
      primaryDocument: ['form8k.htm'],
    });

    resetMockChains({
      dealsRows: [{ acquirerCik: '320193', targetCik: null }],
      insertRows: [{ id: 'filing-uuid-1' }],
    });

    mockEdgarFetch.mockResolvedValue(makeJsonResponse(submissionsData));

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    // onConflictDoNothing should have been called with accessionNumber target
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
    const conflictArgs = mockOnConflictDoNothing.mock.calls[0][0];
    expect(conflictArgs).toHaveProperty('target');
  });

  it('download job is enqueued after successful insert with correct data', async () => {
    const accessionNumber = '0000320193-26-000001';
    const submissionsData = makeSubmissionsResponse({
      accessionNumber: [accessionNumber],
      form: ['S-4'],
      filingDate: [RECENT_DATE_1],
      primaryDocument: ['ds4.htm'],
    });

    resetMockChains({
      dealsRows: [{ acquirerCik: '320193', targetCik: null }],
      insertRows: [{ id: 'filing-uuid-1' }],
    });

    mockEdgarFetch.mockResolvedValue(makeJsonResponse(submissionsData));

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    expect(mockIngestionQueueAdd).toHaveBeenCalledWith(
      'edgar_download',
      expect.objectContaining({
        filingId: 'filing-uuid-1',
        accessionNumber,
        cik: '320193',
        primaryDocument: 'ds4.htm',
      }),
    );
  });

  it('does not enqueue download job when insert returns empty (conflict / already exists)', async () => {
    const submissionsData = makeSubmissionsResponse({
      accessionNumber: ['0000320193-26-000001'],
      form: ['8-K'],
      filingDate: [RECENT_DATE_1],
      primaryDocument: ['form8k.htm'],
    });

    resetMockChains({
      dealsRows: [{ acquirerCik: '320193', targetCik: null }],
      insertRows: [], // Conflict — filing already exists, insert returns empty
    });

    mockEdgarFetch.mockResolvedValue(makeJsonResponse(submissionsData));

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    expect(mockIngestionQueueAdd).not.toHaveBeenCalled();
  });

  it('30-day backfill: uses 30-day window when no filings exist in DB', async () => {
    // No prior filings — getLastPollDate returns [] → 30-day backfill
    // No tracked deals — CIK scan returns nothing
    resetMockChains({
      dealsRows: [],
      lastPollRows: [],
      insertRows: [],
    });

    // EFTS scan returns no hits — nothing to process
    mockEdgarFetch.mockResolvedValue(makeJsonResponse({ hits: { hits: [] } }));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { handleEdgarPoll } = await import('../edgar/poll.js');
    await handleEdgarPoll({ data: { triggeredBy: 'test' } } as never);

    // EFTS broad scan should use a startdt approximately 30 days ago
    const fetchCalls = mockEdgarFetch.mock.calls.map((c) => c[0] as string);
    const eftsCalls = fetchCalls.filter((url) => url.includes('efts.sec.gov'));
    expect(eftsCalls.length).toBeGreaterThan(0);
    const eftsUrl = eftsCalls[0];
    // Extract startdt from URL
    const startdtMatch = eftsUrl.match(/startdt=(\d{4}-\d{2}-\d{2})/);
    expect(startdtMatch).not.toBeNull();
    const startdt = new Date(startdtMatch?.[1]);
    // Should be within 1 day of 30 days ago
    const diffDays = Math.abs((thirtyDaysAgo.getTime() - startdt.getTime()) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBeLessThan(2);
  });
});
