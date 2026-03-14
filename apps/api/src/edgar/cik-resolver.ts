import { edgarFetch } from './client.js';

interface CompanyTicker {
  cik_str: number;
  ticker: string;
  title: string;
}

// ---------------------------------------------------------------------------
// CIK auto-resolution from company names
//
// SEC provides a canonical company_tickers.json that maps CIK → ticker + name.
// We cache it for 15 minutes (matching poll interval) to avoid per-company
// HTTP calls. Anti-pattern: fetching company_tickers.json per-company in a loop.
// ---------------------------------------------------------------------------

// Cache for company_tickers.json — refreshed per poll cycle
let tickerCache: Map<string, CompanyTicker> | null = null;
let tickerCacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes — matches poll interval

async function loadTickerCache(): Promise<Map<string, CompanyTicker>> {
  const now = Date.now();
  if (tickerCache && now - tickerCacheTimestamp < CACHE_TTL_MS) {
    return tickerCache;
  }

  const res = await edgarFetch('https://www.sec.gov/files/company_tickers.json');
  const data = (await res.json()) as Record<string, CompanyTicker>;
  const companies = Object.values(data);

  // Build map keyed by lowercased company name for fast lookup
  const cache = new Map<string, CompanyTicker>();
  for (const company of companies) {
    cache.set(company.title.toLowerCase(), company);
  }

  tickerCache = cache;
  tickerCacheTimestamp = now;
  return cache;
}

export async function resolveCompanyCik(companyName: string): Promise<string | null> {
  const cache = await loadTickerCache();
  const normalized = companyName.toLowerCase().trim();

  // Exact match first
  const exact = cache.get(normalized);
  if (exact) return String(exact.cik_str);

  // Partial match fallback — company name contains or is contained by query
  for (const [title, company] of cache) {
    if (title.includes(normalized) || normalized.includes(title)) {
      return String(company.cik_str);
    }
  }

  return null;
}

// Resolve by ticker symbol (for deal board where ticker is known)
export async function resolveCikByTicker(ticker: string): Promise<string | null> {
  const cache = await loadTickerCache();
  const upperTicker = ticker.toUpperCase().trim();

  for (const company of cache.values()) {
    if (company.ticker === upperTicker) {
      return String(company.cik_str);
    }
  }

  return null;
}

// Clear cache (for testing)
export function clearTickerCache(): void {
  tickerCache = null;
  tickerCacheTimestamp = 0;
}
