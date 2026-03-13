import type { SpreadComputation } from './types.js';

/**
 * Compute merger arbitrage spread metrics.
 *
 * @param currentPrice - Current market price of the target
 * @param offerPrice   - Cash offer price (used when no exchange ratio)
 * @param exchangeRatio - Stock exchange ratio (nullable, for STOCK/MIXED deals)
 * @param acquirerPrice - Acquirer's current stock price (nullable)
 * @param daysToClose   - Days until expected close date
 */
export function computeSpread(
  currentPrice: number,
  offerPrice: number,
  exchangeRatio: number | null,
  acquirerPrice: number | null,
  daysToClose: number,
): SpreadComputation {
  // For STOCK deals: implied consideration = exchangeRatio * acquirerPrice
  // For CASH deals: implied consideration = offerPrice
  const impliedConsideration =
    exchangeRatio != null && acquirerPrice != null ? exchangeRatio * acquirerPrice : offerPrice;

  const grossSpread = ((impliedConsideration - currentPrice) / currentPrice) * 100;

  // Annualize: (1 + grossSpread/100)^(365/days) - 1, as percentage
  // Use Math.max(daysToClose, 1) to avoid division by zero
  const safeDays = Math.max(daysToClose, 1);
  const annualizedReturn = ((1 + grossSpread / 100) ** (365 / safeDays) - 1) * 100;

  return { grossSpread, annualizedReturn, impliedConsideration };
}

/**
 * Check if US equity markets are currently open.
 * Markets are open Mon-Fri, 9:30 AM - 4:00 PM Eastern Time.
 *
 * Does NOT account for holidays — a holiday calendar can be added later.
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);

  // Weekend check
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false;
  }

  const timeInMinutes = hour * 60 + minute;
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}
