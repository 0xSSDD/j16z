import { describe, expect, it, vi, afterEach } from 'vitest';
import { computeSpread, isMarketOpen } from '../market/spread-calculator.js';

describe('computeSpread', () => {
  it('computes correct gross spread for CASH deal', () => {
    // $50 current, $55 offer, 30 days to close
    const result = computeSpread(50, 55, null, null, 30);
    expect(result.grossSpread).toBeCloseTo(10, 1); // (55-50)/50 * 100 = 10%
    expect(result.impliedConsideration).toBe(55);
    // Annualized: (1.10)^(365/30) - 1 = very high
    expect(result.annualizedReturn).toBeGreaterThan(200);
  });

  it('computes correct implied consideration for STOCK deal', () => {
    // exchangeRatio 0.5, acquirerPrice $100 -> implied = $50
    // currentPrice $48, daysToClose 60
    const result = computeSpread(48, 0, 0.5, 100, 60);
    expect(result.impliedConsideration).toBe(50);
    expect(result.grossSpread).toBeCloseTo(((50 - 48) / 48) * 100, 1);
  });

  it('handles daysToClose = 0 without division by zero', () => {
    const result = computeSpread(50, 55, null, null, 0);
    expect(result.grossSpread).toBeCloseTo(10, 1);
    // Uses Math.max(daysToClose, 1) so annualized is computed with 1 day
    expect(Number.isFinite(result.annualizedReturn)).toBe(true);
  });

  it('computes negative spread when currentPrice > offerPrice', () => {
    const result = computeSpread(60, 55, null, null, 30);
    expect(result.grossSpread).toBeLessThan(0);
    expect(result.impliedConsideration).toBe(55);
  });

  it('uses offerPrice when exchangeRatio is null', () => {
    const result = computeSpread(50, 55, null, 100, 30);
    expect(result.impliedConsideration).toBe(55);
  });

  it('uses exchangeRatio * acquirerPrice when both provided', () => {
    const result = computeSpread(50, 55, 2, 30, 30);
    // implied = 2 * 30 = 60
    expect(result.impliedConsideration).toBe(60);
    expect(result.grossSpread).toBeCloseTo(((60 - 50) / 50) * 100, 1);
  });
});

describe('isMarketOpen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true during market hours on a weekday', () => {
    // Wednesday 2026-03-11 14:00 ET = 19:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T19:00:00Z'));
    expect(isMarketOpen()).toBe(true);
  });

  it('returns false before market open on a weekday', () => {
    // Wednesday 2026-03-11 08:00 ET = 13:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T13:00:00Z'));
    expect(isMarketOpen()).toBe(false);
  });

  it('returns false after market close on a weekday', () => {
    // Wednesday 2026-03-11 17:00 ET = 22:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T22:00:00Z'));
    expect(isMarketOpen()).toBe(false);
  });

  it('returns false on a weekend', () => {
    // Saturday 2026-03-14 12:00 ET = 17:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T17:00:00Z'));
    expect(isMarketOpen()).toBe(false);
  });
});
