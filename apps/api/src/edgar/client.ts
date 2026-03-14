import { RateLimiter } from 'limiter';

// ---------------------------------------------------------------------------
// EDGAR HTTP client with rate limiter
//
// SEC guidelines: <10 requests/second, User-Agent header required.
// All outbound EDGAR requests MUST go through edgarFetch() — never call
// fetch() directly for EDGAR URLs (anti-pattern from research).
// ---------------------------------------------------------------------------

// Module-level singleton — shared across all EDGAR calls in the worker process
const edgarLimiter = new RateLimiter({ tokensPerInterval: 9, interval: 'second' });

export const EDGAR_USER_AGENT = 'j16z admin@j16z.com';

export async function edgarFetch(url: string): Promise<Response> {
  await edgarLimiter.removeTokens(1);
  const res = await fetch(url, {
    headers: {
      'User-Agent': EDGAR_USER_AGENT,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`EDGAR fetch failed: ${res.status} ${res.statusText} — ${url}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// URL builders — construct sec.gov URLs from CIK and accession number
// ---------------------------------------------------------------------------

// Build URL to the actual filing document on sec.gov
export function buildFilingUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const accNoPlain = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoPlain}/${primaryDocument}`;
}

// Build URL to the filing index JSON (for discovering primaryDocument)
export function buildIndexUrl(cik: string, accessionNumber: string): string {
  const accNoPlain = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoPlain}/${accessionNumber}-index.json`;
}
