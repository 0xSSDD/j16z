import type { QuoteAdapter, QuoteResult } from './types.js';

// ---------------------------------------------------------------------------
// Alpha Vantage GLOBAL_QUOTE response shape
// Field names use numbered prefixes like "01. symbol", "05. price", etc.
// ---------------------------------------------------------------------------
interface AlphaVantageGlobalQuote {
  'Global Quote': {
    '01. symbol'?: string;
    '02. open'?: string;
    '03. high'?: string;
    '04. low'?: string;
    '05. price'?: string;
    '06. volume'?: string;
    '07. latest trading day'?: string;
    '08. previous close'?: string;
    '09. change'?: string;
    '10. change percent'?: string;
  };
}

/**
 * Alpha Vantage quote adapter — fetches real-time stock quotes
 * from the GLOBAL_QUOTE endpoint.
 *
 * Free tier: 25 requests/day, 5/minute.
 * Standard tier: higher limits.
 */
export class AlphaVantageAdapter implements QuoteAdapter {
  constructor(private readonly apiKey: string) {}

  async getQuote(symbol: string): Promise<QuoteResult | null> {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[market] Alpha Vantage HTTP ${response.status} for ${symbol}`);
        return null;
      }

      const data = (await response.json()) as AlphaVantageGlobalQuote;
      const quote = data['Global Quote'];

      // Empty quote object = rate limited or invalid symbol
      if (!quote || !quote['05. price']) {
        console.warn(`[market] No quote data for ${symbol} (rate limit or invalid symbol)`);
        return null;
      }

      return {
        symbol: quote['01. symbol'] ?? symbol,
        price: Number.parseFloat(quote['05. price'] ?? '0'),
        previousClose: Number.parseFloat(quote['08. previous close'] ?? '0'),
        volume: Number.parseInt(quote['06. volume'] ?? '0', 10),
        open: Number.parseFloat(quote['02. open'] ?? '0'),
        high: Number.parseFloat(quote['03. high'] ?? '0'),
        low: Number.parseFloat(quote['04. low'] ?? '0'),
        change: Number.parseFloat(quote['09. change'] ?? '0'),
        changePercent: quote['10. change percent'] ?? '0%',
        timestamp: new Date(),
      };
    } catch (err) {
      console.error(`[market] Failed to fetch quote for ${symbol}:`, (err as Error).message);
      return null;
    }
  }
}

/**
 * Factory — creates a QuoteAdapter using the ALPHA_VANTAGE_API_KEY env var.
 */
export function createQuoteAdapter(): QuoteAdapter {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY environment variable is required');
  }
  return new AlphaVantageAdapter(apiKey);
}
