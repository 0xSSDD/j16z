// ---------------------------------------------------------------------------
// Market data types — vendor-agnostic interfaces for quote fetching and
// spread computation used by the market data poller subsystem.
// ---------------------------------------------------------------------------

export interface QuoteResult {
  symbol: string;
  price: number;
  previousClose: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: string;
  timestamp: Date;
}

export interface SpreadComputation {
  grossSpread: number;
  annualizedReturn: number;
  impliedConsideration: number;
}

export interface QuoteAdapter {
  getQuote(symbol: string): Promise<QuoteResult | null>;
}
