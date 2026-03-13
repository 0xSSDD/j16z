import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock modules before imports
vi.mock('../market/spread-calculator.js', () => ({
  isMarketOpen: vi.fn(),
  computeSpread: vi.fn(),
}));

vi.mock('../market/quote-adapter.js', () => ({
  createQuoteAdapter: vi.fn(),
}));

vi.mock('../db/index.js', () => ({
  adminDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

const mockRemoveTokensFn = vi.fn().mockResolvedValue(undefined);
vi.mock('limiter', () => {
  return {
    RateLimiter: class MockRateLimiter {
      removeTokens = mockRemoveTokensFn;
    },
  };
});

import { handleMarketDataPoll } from '../market/market-poller.js';
import { isMarketOpen, computeSpread } from '../market/spread-calculator.js';
import { createQuoteAdapter } from '../market/quote-adapter.js';
import { adminDb } from '../db/index.js';
import type { Job } from 'bullmq';

function mockJob(): Job {
  return { id: 'test-1', name: 'market_data_poll', data: {} } as unknown as Job;
}

describe('handleMarketDataPoll', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: market open
    vi.mocked(isMarketOpen).mockReturnValue(true);

    // Default: adapter returns null
    vi.mocked(createQuoteAdapter).mockReturnValue({
      getQuote: vi.fn().mockResolvedValue(null),
    });

    // Default: no active deals
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    vi.mocked(adminDb.select).mockReturnValue({ from: mockFrom } as never);
  });

  it('skips polling when market is closed', async () => {
    vi.mocked(isMarketOpen).mockReturnValue(false);

    await handleMarketDataPoll(mockJob());

    // Should not query deals or create adapter
    expect(adminDb.select).not.toHaveBeenCalled();
    expect(createQuoteAdapter).not.toHaveBeenCalled();
  });

  it('fetches quotes for active deals when market is open', async () => {
    const mockQuote = {
      symbol: 'ACME',
      price: 52.5,
      previousClose: 51,
      volume: 1000000,
      open: 51.5,
      high: 53,
      low: 51,
      change: 1.5,
      changePercent: '2.94%',
      timestamp: new Date(),
    };

    const mockGetQuote = vi.fn().mockResolvedValue(mockQuote);
    vi.mocked(createQuoteAdapter).mockReturnValue({ getQuote: mockGetQuote });

    vi.mocked(computeSpread).mockReturnValue({
      grossSpread: 4.76,
      annualizedReturn: 85.2,
      impliedConsideration: 55,
    });

    const mockDeals = [
      {
        id: 'deal-1',
        firmId: 'firm-1',
        symbol: 'ACME',
        pricePerShare: '55',
        exchangeRatio: null,
        expectedCloseDate: '2026-04-15',
        deletedAt: null,
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockDeals),
    });
    vi.mocked(adminDb.select).mockReturnValue({ from: mockFrom } as never);

    // Mock insert chain
    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(adminDb.insert).mockReturnValue({ values: mockValues } as never);

    // Mock update chain
    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(adminDb.update).mockReturnValue({ set: mockSet } as never);

    await handleMarketDataPoll(mockJob());

    expect(mockGetQuote).toHaveBeenCalledWith('ACME');
    expect(computeSpread).toHaveBeenCalled();
    expect(adminDb.insert).toHaveBeenCalled();
    expect(adminDb.update).toHaveBeenCalled();
  });

  it('skips deal when quote returns null (rate limit)', async () => {
    const mockGetQuote = vi.fn().mockResolvedValue(null);
    vi.mocked(createQuoteAdapter).mockReturnValue({ getQuote: mockGetQuote });

    const mockDeals = [
      {
        id: 'deal-1',
        firmId: 'firm-1',
        symbol: 'ACME',
        pricePerShare: '55',
        exchangeRatio: null,
        expectedCloseDate: '2026-04-15',
        deletedAt: null,
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockDeals),
    });
    vi.mocked(adminDb.select).mockReturnValue({ from: mockFrom } as never);

    await handleMarketDataPoll(mockJob());

    expect(mockGetQuote).toHaveBeenCalledWith('ACME');
    // No insert or update when quote is null
    expect(adminDb.insert).not.toHaveBeenCalled();
    expect(adminDb.update).not.toHaveBeenCalled();
  });

  it('skips marketSnapshot insert for deals with null firmId', async () => {
    const mockQuote = {
      symbol: 'ACME',
      price: 52.5,
      previousClose: 51,
      volume: 1000000,
      open: 51.5,
      high: 53,
      low: 51,
      change: 1.5,
      changePercent: '2.94%',
      timestamp: new Date(),
    };

    const mockGetQuote = vi.fn().mockResolvedValue(mockQuote);
    vi.mocked(createQuoteAdapter).mockReturnValue({ getQuote: mockGetQuote });

    vi.mocked(computeSpread).mockReturnValue({
      grossSpread: 4.76,
      annualizedReturn: 85.2,
      impliedConsideration: 55,
    });

    const mockDeals = [
      {
        id: 'deal-1',
        firmId: null, // auto-discovered deal
        symbol: 'ACME',
        pricePerShare: '55',
        exchangeRatio: null,
        expectedCloseDate: '2026-04-15',
        deletedAt: null,
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockDeals),
    });
    vi.mocked(adminDb.select).mockReturnValue({ from: mockFrom } as never);

    // Mock update chain (still updates deal price)
    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(adminDb.update).mockReturnValue({ set: mockSet } as never);

    await handleMarketDataPoll(mockJob());

    // No insert for marketSnapshot (firmId is null)
    expect(adminDb.insert).not.toHaveBeenCalled();
    // Still updates deal's price columns
    expect(adminDb.update).toHaveBeenCalled();
  });

  it('calls rate limiter removeTokens before each getQuote', async () => {
    const mockGetQuote = vi.fn().mockResolvedValue(null);
    vi.mocked(createQuoteAdapter).mockReturnValue({ getQuote: mockGetQuote });

    const mockDeals = [
      { id: 'deal-1', firmId: 'firm-1', symbol: 'A', pricePerShare: '50', exchangeRatio: null, expectedCloseDate: null, deletedAt: null },
      { id: 'deal-2', firmId: 'firm-1', symbol: 'B', pricePerShare: '60', exchangeRatio: null, expectedCloseDate: null, deletedAt: null },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockDeals),
    });
    vi.mocked(adminDb.select).mockReturnValue({ from: mockFrom } as never);

    await handleMarketDataPoll(mockJob());

    // mockRemoveTokensFn is the shared mock from the module-level vi.mock('limiter')
    expect(mockRemoveTokensFn).toHaveBeenCalledTimes(2);
  });
});
