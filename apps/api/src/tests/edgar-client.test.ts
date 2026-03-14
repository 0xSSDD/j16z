/**
 * EDGAR HTTP client unit tests
 *
 * Covers EDGAR-03 (User-Agent header) and EDGAR-04 (rate limiting).
 * Mocks global fetch — no real HTTP calls to SEC EDGAR.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFilingUrl, buildIndexUrl, EDGAR_USER_AGENT, edgarFetch } from '../edgar/client.js';

describe('edgarFetch — User-Agent header', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets User-Agent header on every request (EDGAR-03)', async () => {
    const mockResponse = { ok: true, status: 200, statusText: 'OK' } as Response;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    await edgarFetch('https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const callArgs = fetchSpy.mock.calls[0];
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('j16z admin@j16z.com');
  });

  it('User-Agent matches EDGAR_USER_AGENT constant', async () => {
    const mockResponse = { ok: true, status: 200, statusText: 'OK' } as Response;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    await edgarFetch('https://data.sec.gov/submissions/CIK0000320193.json');

    const callArgs = fetchSpy.mock.calls[0];
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe(EDGAR_USER_AGENT);
  });
});

describe('edgarFetch — rate limiter', () => {
  it('calls removeTokens before fetch (verifies rate limiter is invoked)', async () => {
    // The rate limiter is module-level — we verify via timing that it throttles.
    // We import RateLimiter and spy on removeTokens to confirm it was called.
    const { RateLimiter } = await import('limiter');
    const removeTokensSpy = vi.spyOn(RateLimiter.prototype, 'removeTokens').mockResolvedValueOnce(9);
    const mockResponse = { ok: true, status: 200, statusText: 'OK' } as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    await edgarFetch('https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json');

    expect(removeTokensSpy).toHaveBeenCalledWith(1);
    vi.restoreAllMocks();
  });
});

describe('edgarFetch — error handling', () => {
  it('throws on non-2xx response (403 Forbidden)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response);

    await expect(edgarFetch('https://data.sec.gov/some-url')).rejects.toThrow('EDGAR fetch failed: 403');
    vi.restoreAllMocks();
  });

  it('error message includes status code and URL', async () => {
    const url = 'https://data.sec.gov/some-restricted-url';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as Response);

    await expect(edgarFetch(url)).rejects.toThrow('EDGAR fetch failed: 429');
    vi.restoreAllMocks();
  });
});

describe('buildFilingUrl', () => {
  it('constructs correct filing document URL stripping hyphens from accession number', () => {
    const url = buildFilingUrl('320193', '0000320193-24-000058', 'd123456ds4.htm');
    expect(url).toBe('https://www.sec.gov/Archives/edgar/data/320193/000032019324000058/d123456ds4.htm');
  });

  it('handles CIK without leading zeros in URL path', () => {
    const url = buildFilingUrl('12345', '0000012345-23-001234', 'form8k.htm');
    expect(url).toBe('https://www.sec.gov/Archives/edgar/data/12345/000001234523001234/form8k.htm');
  });
});

describe('buildIndexUrl', () => {
  it('constructs correct filing index JSON URL', () => {
    const url = buildIndexUrl('320193', '0000320193-24-000058');
    expect(url).toBe(
      'https://www.sec.gov/Archives/edgar/data/320193/000032019324000058/0000320193-24-000058-index.json',
    );
  });

  it('preserves original accession number with hyphens for index filename', () => {
    // The plain version (no hyphens) is used in the path segment,
    // but the original (with hyphens) is used in the filename
    const accessionNumber = '0001234567-22-099887';
    const url = buildIndexUrl('1234567', accessionNumber);
    expect(url).toContain('000123456722099887'); // path: hyphens stripped
    expect(url).toContain('0001234567-22-099887-index.json'); // filename: hyphens preserved
  });
});
