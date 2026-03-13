import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockDealRow {
  id: string;
  firmId: string | null;
  acquirer: string;
  target: string;
  symbol: string;
}

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock('../db/index.js', () => ({
  adminDb: {
    get select() {
      return mockSelect;
    },
  },
}));

function makeDeal(overrides: Partial<MockDealRow> = {}): MockDealRow {
  return {
    id: 'deal-1',
    firmId: 'firm-1',
    acquirer: 'Apple Inc',
    target: 'Target Co',
    symbol: 'AAPL',
    ...overrides,
  };
}

describe('shared deal matcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it('matches exact acquirer name with confidence 1.0', async () => {
    mockWhere.mockResolvedValueOnce([makeDeal({ acquirer: 'Apple Inc' })]);

    const { matchCompanyToDeal } = await import('../shared/deal-matcher.js');
    const result = await matchCompanyToDeal('Apple Inc');

    expect(result).not.toBeNull();
    expect(result?.dealId).toBe('deal-1');
    expect(result?.matchedField).toBe('acquirer');
    expect(result?.confidence).toBe(1);
    expect(result?.firmIds).toEqual(['firm-1']);
  });

  it('matches normalized company name with confidence 0.9', async () => {
    mockWhere.mockResolvedValueOnce([makeDeal({ acquirer: 'Apple Incorporated' })]);

    const { matchCompanyToDeal } = await import('../shared/deal-matcher.js');
    const result = await matchCompanyToDeal('Apple Inc.');

    expect(result).not.toBeNull();
    expect(result?.dealId).toBe('deal-1');
    expect(result?.confidence).toBe(0.9);
  });

  it('matches token overlap when jaccard is above threshold', async () => {
    mockWhere.mockResolvedValueOnce([makeDeal({ acquirer: 'The Walt Disney Co' })]);

    const { matchCompanyToDeal } = await import('../shared/deal-matcher.js');
    const result = await matchCompanyToDeal('Walt Disney Company');

    expect(result).not.toBeNull();
    expect(result?.dealId).toBe('deal-1');
    expect(result?.confidence).toBeGreaterThan(0.7);
    expect(result?.confidence).toBeLessThanOrEqual(0.85);
  });

  it('matches substring containment with confidence 0.65', async () => {
    mockWhere.mockResolvedValueOnce([makeDeal({ acquirer: 'Walt Disney Company' })]);

    const { matchCompanyToDeal } = await import('../shared/deal-matcher.js');
    const result = await matchCompanyToDeal('Disney');

    expect(result).not.toBeNull();
    expect(result?.dealId).toBe('deal-1');
    expect(result?.confidence).toBe(0.65);
  });

  it('returns null when no match is found', async () => {
    mockWhere.mockResolvedValueOnce([makeDeal({ acquirer: 'Apple Inc' })]);

    const { matchCompanyToDeal } = await import('../shared/deal-matcher.js');
    const result = await matchCompanyToDeal('Microsoft Corp');

    expect(result).toBeNull();
  });

  it('respects minimum confidence threshold', async () => {
    mockWhere.mockResolvedValueOnce([makeDeal({ acquirer: 'Walt Disney Company' })]);

    const { matchCompanyToDeal } = await import('../shared/deal-matcher.js');
    const result = await matchCompanyToDeal('Disney', { minConfidence: 0.7 });

    expect(result).toBeNull();
  });

  it('returns the highest confidence match when multiple deals match', async () => {
    mockWhere.mockResolvedValueOnce([
      makeDeal({ id: 'deal-normalized', firmId: 'firm-1', acquirer: 'Apple Incorporated', symbol: 'APLE' }),
      makeDeal({ id: 'deal-exact', firmId: 'firm-2', acquirer: 'Apple Inc', symbol: 'AAPL' }),
    ]);

    const { matchCompanyToDeal } = await import('../shared/deal-matcher.js');
    const result = await matchCompanyToDeal('Apple Inc');

    expect(result).not.toBeNull();
    expect(result?.dealId).toBe('deal-exact');
    expect(result?.confidence).toBe(1);
    expect(result?.matchedField).toBe('acquirer');
  });
});
