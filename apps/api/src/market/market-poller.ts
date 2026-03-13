import type { Job } from 'bullmq';
import { and, eq, isNotNull, isNull, notInArray } from 'drizzle-orm';
import { RateLimiter } from 'limiter';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { createQuoteAdapter } from './quote-adapter.js';
import { computeSpread, isMarketOpen } from './spread-calculator.js';

/**
 * BullMQ handler for the market_data_poll job.
 *
 * Fetches stock quotes for all active deals with a ticker symbol,
 * computes spread metrics, stores market snapshots, and updates
 * deal price columns.
 *
 * Skips polling outside US market hours (Mon-Fri 9:30-16:00 ET).
 * Rate-limits Alpha Vantage requests to 4/min (free tier safety).
 */
export async function handleMarketDataPoll(_job: Job): Promise<void> {
  if (!isMarketOpen()) {
    console.log('[market] Market closed, skipping poll');
    return;
  }

  // Query all active deals with a symbol
  const activeDeals = await adminDb
    .select()
    .from(schema.deals)
    .where(
      and(
        notInArray(schema.deals.status, ['TERMINATED', 'CLOSED']),
        isNotNull(schema.deals.symbol),
        isNull(schema.deals.deletedAt),
      ),
    );

  if (activeDeals.length === 0) {
    console.log('[market] No active deals with symbols to poll');
    return;
  }

  const adapter = createQuoteAdapter();
  const limiter = new RateLimiter({ tokensPerInterval: 4, interval: 'minute' });

  console.log(`[market] Polling ${activeDeals.length} deals for market data`);

  let updated = 0;
  for (const deal of activeDeals) {
    await limiter.removeTokens(1);

    const quote = await adapter.getQuote(deal.symbol);
    if (!quote) {
      console.warn(`[market] No quote for ${deal.symbol} (deal ${deal.id}), skipping`);
      continue;
    }

    // Compute days to close
    const expectedClose = deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null;
    const daysToClose = expectedClose
      ? Math.max(Math.ceil((expectedClose.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 1)
      : 90; // default 90 days if no expected close date

    const offerPrice = deal.pricePerShare ? Number(deal.pricePerShare) : 0;
    const exchangeRatio = deal.exchangeRatio ? Number(deal.exchangeRatio) : null;

    const spread = computeSpread(quote.price, offerPrice, exchangeRatio, null, daysToClose);

    // Insert market snapshot only for deals with a firmId
    // Auto-discovered deals (firmId=null) skip snapshot insert but still get price updates
    if (deal.firmId) {
      await adminDb.insert(schema.marketSnapshots).values({
        firmId: deal.firmId,
        dealId: deal.id,
        timestamp: quote.timestamp,
        currentPrice: String(quote.price),
        targetPrice: String(offerPrice),
        acquirerPrice: String(quote.price), // placeholder — acquirer quote not fetched separately
        grossSpread: String(spread.grossSpread),
        annualizedReturn: String(spread.annualizedReturn),
        volume: quote.volume,
      });
    }

    // Update deal's price columns
    await adminDb
      .update(schema.deals)
      .set({
        currentPrice: String(quote.price),
        grossSpread: String(spread.grossSpread),
        annualizedReturn: String(spread.annualizedReturn),
        updatedAt: new Date(),
      })
      .where(eq(schema.deals.id, deal.id));

    updated++;
  }

  console.log(`[market] Updated ${updated}/${activeDeals.length} deals with market data`);
}
