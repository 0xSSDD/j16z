/**
 * EDGAR download handler unit tests
 *
 * Tests Stage 2: HTML fetch → plain text conversion → DB update.
 * Mocks edgarFetch (no real HTTP) and adminDb (no real database).
 * Uses real html-to-text for integration confidence on HTML conversion.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockWhere = vi.fn().mockResolvedValue([]);
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));

vi.mock('../db/index.js', () => ({
  adminDb: {
    update: mockUpdate,
  },
}));

const mockEdgarFetch = vi.fn();
vi.mock('../edgar/client.js', () => ({
  edgarFetch: mockEdgarFetch,
  buildFilingUrl: (cik: string, accession: string, doc: string) =>
    `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${doc}`,
  buildIndexUrl: (cik: string, accession: string) =>
    `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${accession}-index.json`,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTextResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

function makeJsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

// Sample EDGAR filing HTML with typical noise elements
const SAMPLE_EDGAR_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Form S-4 Registration Statement</title>
  <style>
    body { font-family: Arial; }
    .hidden { display: none; }
  </style>
  <script>
    console.log("tracking script");
    var analytics = {};
  </script>
</head>
<body>
  <h1>REGISTRATION STATEMENT UNDER THE SECURITIES ACT OF 1933</h1>
  <p>This registration statement relates to the proposed merger between ACME Corp and Target Corp.</p>
  <table>
    <tr><th>Item</th><th>Value</th></tr>
    <tr><td>Consideration per share</td><td>$45.00</td></tr>
    <tr><td>Exchange Ratio</td><td>0.5234</td></tr>
  </table>
  <p>The merger agreement was signed on January 10, 2026.</p>
</body>
</html>
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('edgar download handler — HTML to plain text conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts HTML to plain text — script and style tags are stripped', async () => {
    const jobData = {
      filingId: 'filing-uuid-1',
      accessionNumber: '0000320193-26-000001',
      cik: '320193',
      primaryDocument: 'ds4.htm',
    };

    mockEdgarFetch.mockResolvedValueOnce(makeTextResponse(SAMPLE_EDGAR_HTML));

    const { handleEdgarDownload } = await import('../edgar/download.js');
    await handleEdgarDownload({ data: jobData } as never);

    // The stored rawContent should be plain text — check via the update call
    const setCalls = mockSet.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const setArgs = setCalls[0]?.[0];
    const plainText: string = setArgs?.rawContent as string;

    // Should contain actual content
    expect(plainText).toContain('REGISTRATION STATEMENT');
    expect(plainText).toContain('merger between ACME Corp and Target Corp');

    // Should NOT contain HTML tags
    expect(plainText).not.toMatch(/<[a-z][\s\S]*?>/i);

    // Should NOT contain script content
    expect(plainText).not.toContain('console.log');
    expect(plainText).not.toContain('tracking script');

    // Should NOT contain style content
    expect(plainText).not.toContain('font-family');
    expect(plainText).not.toContain('.hidden');
  });

  it('updates filing row with rawContent, rawUrl, and updatedAt', async () => {
    const filingId = 'filing-uuid-1';
    const accessionNumber = '0000320193-26-000001';
    const cik = '320193';
    const primaryDocument = 'ds4.htm';

    mockEdgarFetch.mockResolvedValueOnce(makeTextResponse('<p>Simple content</p>'));

    const { handleEdgarDownload } = await import('../edgar/download.js');
    await handleEdgarDownload({ data: { filingId, accessionNumber, cik, primaryDocument } } as never);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        rawContent: expect.any(String),
        rawUrl: expect.stringContaining('320193'),
        updatedAt: expect.any(Date),
      }),
    );
    expect(mockWhere).toHaveBeenCalled();
  });

  it('uses edgarFetch (not bare fetch) for document download — rate limiter is respected', async () => {
    const jobData = {
      filingId: 'filing-uuid-1',
      accessionNumber: '0000320193-26-000001',
      cik: '320193',
      primaryDocument: 'ds4.htm',
    };

    mockEdgarFetch.mockResolvedValueOnce(makeTextResponse('<p>Content</p>'));

    const { handleEdgarDownload } = await import('../edgar/download.js');
    await handleEdgarDownload({ data: jobData } as never);

    // Verify edgarFetch was called (not bare fetch)
    expect(mockEdgarFetch).toHaveBeenCalledWith(
      expect.stringContaining('sec.gov/Archives/edgar/data/320193'),
    );
  });

  it('resolves primaryDocument via index endpoint when not provided', async () => {
    const jobData = {
      filingId: 'filing-uuid-1',
      accessionNumber: '0000320193-26-000001',
      cik: '320193',
      primaryDocument: '', // No primaryDocument — must resolve via index
    };

    const indexData = {
      directory: {
        item: [
          { name: 'ds4.htm', type: 'text/html' },
          { name: 'ds4-exhibit.htm', type: 'text/html' },
        ],
      },
    };

    // First call: index JSON; second call: filing HTML
    mockEdgarFetch
      .mockResolvedValueOnce(makeJsonResponse(indexData))
      .mockResolvedValueOnce(makeTextResponse('<p>Filing content</p>'));

    const { handleEdgarDownload } = await import('../edgar/download.js');
    await handleEdgarDownload({ data: jobData } as never);

    // Should have made two edgarFetch calls: index + document
    expect(mockEdgarFetch).toHaveBeenCalledTimes(2);

    // First call should be the index URL
    const firstCallUrl = mockEdgarFetch.mock.calls[0][0] as string;
    expect(firstCallUrl).toContain('-index.json');

    // Second call should be the resolved document URL (first .htm in index)
    const secondCallUrl = mockEdgarFetch.mock.calls[1][0] as string;
    expect(secondCallUrl).toContain('ds4.htm');

    // Update should have been called with content
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        rawContent: expect.any(String),
        rawUrl: expect.stringContaining('ds4.htm'),
      }),
    );
  });

  it('returns early when index has no HTML documents', async () => {
    const jobData = {
      filingId: 'filing-uuid-1',
      accessionNumber: '0000320193-26-000001',
      cik: '320193',
      primaryDocument: '',
    };

    const indexDataNoHtml = {
      directory: {
        item: [{ name: 'filing.xml', type: 'application/xml' }],
      },
    };

    mockEdgarFetch.mockResolvedValueOnce(makeJsonResponse(indexDataNoHtml));

    const { handleEdgarDownload } = await import('../edgar/download.js');
    await handleEdgarDownload({ data: jobData } as never);

    // Should NOT have called update — no primary document found
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
