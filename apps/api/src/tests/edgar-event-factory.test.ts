/**
 * EDGAR event factory unit tests
 *
 * Tests firm-scoped Event creation from global filing data.
 * Filings are global; Events are firm-scoped (one Event per firm per filing).
 * Mocks adminDb entirely — no real database connections.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilingMetadata } from '../edgar/types.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let capturedEventArray: any[] = [];
const mockReturning = vi.fn().mockImplementation(() => {
  // Return array of { id } objects matching the number of events
  return Promise.resolve(capturedEventArray.map((_, i) => ({ id: `event-id-${i}` })));
});
const mockValues = vi.fn().mockImplementation((eventArray) => {
  capturedEventArray = eventArray;
  return { returning: mockReturning };
});
const mockInsert = vi.fn(() => ({ values: mockValues }));

vi.mock('../db/index.js', () => ({
  adminDb: {
    insert: mockInsert,
  },
}));

vi.mock('../queues/ingestion.js', () => ({
  ingestionQueue: {
    add: vi.fn().mockResolvedValue(undefined),
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

describe('event factory — event creation per firm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates one event per firm when multiple firms track the deal', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata(), ['firm-1', 'firm-2']);

    expect(mockInsert).toHaveBeenCalledOnce();
    const eventArray = mockValues.mock.calls[0][0];
    expect(eventArray).toHaveLength(2);
    expect(eventArray[0].firmId).toBe('firm-1');
    expect(eventArray[1].firmId).toBe('firm-2');
  });

  it('does NOT call insert when firmIds is empty (auto-created deal in discovery pool)', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata(), []);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('events have correct type=FILING and subType matching the filing form type', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ filingType: 'S-4' }), ['firm-1']);

    const eventArray = mockValues.mock.calls[0][0];
    const event = eventArray[0];
    expect(event.type).toBe('FILING');
    expect(event.subType).toBe('S-4');
  });

  it('events have correct source=SEC_EDGAR and non-empty sourceUrl', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata(), ['firm-1']);

    const eventArray = mockValues.mock.calls[0][0];
    const event = eventArray[0];
    expect(event.source).toBe('SEC_EDGAR');
    expect(event.sourceUrl).toBeTruthy();
    expect(event.sourceUrl).toContain('sec.gov');
  });

  it('sourceUrl contains Archives path when primaryDocument is present', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents(
      'filing-id-1',
      'deal-id-1',
      makeFilingMetadata({ primaryDocument: 'ds4.htm', filerCik: '320193' }),
      ['firm-1'],
    );

    const eventArray = mockValues.mock.calls[0][0];
    const event = eventArray[0];
    expect(event.sourceUrl).toContain('Archives/edgar/data/320193');
    expect(event.sourceUrl).toContain('ds4.htm');
  });

  it('sourceUrl falls back to browse-edgar when no primaryDocument', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ primaryDocument: '' }), ['firm-1']);

    const eventArray = mockValues.mock.calls[0][0];
    const event = eventArray[0];
    expect(event.sourceUrl).toContain('browse-edgar');
  });
});

describe('event factory — materiality scores by filing type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('S-4 filing has materialityScore=80 and severity=CRITICAL', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ filingType: 'S-4' }), ['firm-1']);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.materialityScore).toBe(80);
    expect(event.severity).toBe('CRITICAL');
  });

  it('8-K filing has materialityScore=60 and severity=WARNING', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ filingType: '8-K' }), ['firm-1']);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.materialityScore).toBe(60);
    expect(event.severity).toBe('WARNING');
  });

  it('SC 13G filing has materialityScore=40 and severity=INFO', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ filingType: 'SC 13G' }), ['firm-1']);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.materialityScore).toBe(40);
    expect(event.severity).toBe('INFO');
  });

  it('DEFM14A filing has materialityScore=80 and severity=CRITICAL', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ filingType: 'DEFM14A' }), ['firm-1']);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.materialityScore).toBe(80);
    expect(event.severity).toBe('CRITICAL');
  });

  it('SC TO-T filing has materialityScore=75 and severity=CRITICAL', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ filingType: 'SC TO-T' }), ['firm-1']);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.materialityScore).toBe(75);
    expect(event.severity).toBe('CRITICAL');
  });

  it('unknown filing type defaults to materialityScore=40 and severity=INFO', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ filingType: 'UNKNOWN_TYPE' }), [
      'firm-1',
    ]);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.materialityScore).toBe(40);
    expect(event.severity).toBe('INFO');
  });
});

describe('event factory — event metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('event metadata contains filingId, accessionNumber, filingType, filerCik, filerName', async () => {
    const filing = makeFilingMetadata({
      filingType: 'S-4',
      accessionNumber: '0000320193-26-000001',
      filerCik: '320193',
      filerName: 'ACME Corp',
    });

    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', filing, ['firm-1']);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.metadata).toMatchObject({
      filingId: 'filing-id-1',
      accessionNumber: '0000320193-26-000001',
      filingType: 'S-4',
      filerCik: '320193',
      filerName: 'ACME Corp',
    });
  });

  it('event dealId matches the provided dealId', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-XYZ', makeFilingMetadata(), ['firm-1']);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.dealId).toBe('deal-id-XYZ');
  });

  it('event timestamp is a Date object derived from filedDate', async () => {
    const { createFilingEvents } = await import('../edgar/event-factory.js');
    await createFilingEvents('filing-id-1', 'deal-id-1', makeFilingMetadata({ filedDate: '2026-01-15' }), ['firm-1']);

    const event = mockValues.mock.calls[0][0][0];
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.timestamp.getFullYear()).toBe(2026);
  });
});
