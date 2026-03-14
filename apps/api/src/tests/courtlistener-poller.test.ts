import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock DB and fetch before importing modules under test
// ---------------------------------------------------------------------------
vi.mock('../db/index.js', () => ({
  adminDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.stubGlobal('fetch', vi.fn());

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. getCourtMaterialityScore — pure function tests
// ---------------------------------------------------------------------------
describe('getCourtMaterialityScore', () => {
  it('returns 90 for INJUNCTION', async () => {
    const { getCourtMaterialityScore } = await import('../courtlistener/event-factory.js');
    expect(getCourtMaterialityScore('INJUNCTION')).toBe(90);
  });

  it('returns 85 for COMPLAINT', async () => {
    const { getCourtMaterialityScore } = await import('../courtlistener/event-factory.js');
    expect(getCourtMaterialityScore('COMPLAINT')).toBe(85);
  });

  it('returns 70 for MOTION', async () => {
    const { getCourtMaterialityScore } = await import('../courtlistener/event-factory.js');
    expect(getCourtMaterialityScore('MOTION')).toBe(70);
  });

  it('returns 50 for DOCKET_ENTRY', async () => {
    const { getCourtMaterialityScore } = await import('../courtlistener/event-factory.js');
    expect(getCourtMaterialityScore('DOCKET_ENTRY')).toBe(50);
  });

  it('returns 50 (default) for unknown sub-type', async () => {
    const { getCourtMaterialityScore } = await import('../courtlistener/event-factory.js');
    expect(getCourtMaterialityScore('UNKNOWN_TYPE')).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 2. getCourtSeverity — pure function tests
// ---------------------------------------------------------------------------
describe('getCourtSeverity', () => {
  it('returns CRITICAL for score 90', async () => {
    const { getCourtSeverity } = await import('../courtlistener/event-factory.js');
    expect(getCourtSeverity(90)).toBe('CRITICAL');
  });

  it('returns CRITICAL for score 70 (boundary — >=70 is CRITICAL)', async () => {
    const { getCourtSeverity } = await import('../courtlistener/event-factory.js');
    expect(getCourtSeverity(70)).toBe('CRITICAL');
  });

  it('returns WARNING for score 50', async () => {
    const { getCourtSeverity } = await import('../courtlistener/event-factory.js');
    expect(getCourtSeverity(50)).toBe('WARNING');
  });

  it('returns INFO for score 30', async () => {
    const { getCourtSeverity } = await import('../courtlistener/event-factory.js');
    expect(getCourtSeverity(30)).toBe('INFO');
  });
});

// ---------------------------------------------------------------------------
// 3. scoreRssItem — pure function tests (imported from rss/poller.ts)
// ---------------------------------------------------------------------------
describe('scoreRssItem', () => {
  it('returns base score of 30 for text with no M&A keywords', async () => {
    const { scoreRssItem } = await import('../rss/poller.js');
    expect(scoreRssItem('Weather report', 'Sunny skies expected this weekend')).toBe(30);
  });

  it('adds 10 for "merger" keyword, returning 40', async () => {
    const { scoreRssItem } = await import('../rss/poller.js');
    expect(scoreRssItem('Tech merger announced', 'Details of the proposed merger')).toBe(40);
  });

  it('adds 20 for "injunction" and 15 for "antitrust", returning 65', async () => {
    const { scoreRssItem } = await import('../rss/poller.js');
    expect(scoreRssItem('Injunction sought in antitrust case', 'Federal regulators seek injunction')).toBe(65);
  });

  it('caps at 70 even when all keywords are present', async () => {
    const { scoreRssItem } = await import('../rss/poller.js');
    const title = 'Merger injunction antitrust second request termination shareholder suit';
    const content = 'FTC DOJ block challenge acquisition deal break fee mae litigation hsr';
    expect(scoreRssItem(title, content)).toBe(70);
  });

  it('matching is case-insensitive', async () => {
    const { scoreRssItem } = await import('../rss/poller.js');
    expect(scoreRssItem('MERGER ANNOUNCED', 'ANTITRUST Review Pending')).toBe(55);
  });
});

// ---------------------------------------------------------------------------
// 4. Zod schema validation — courtListenerWebhookSchema
// ---------------------------------------------------------------------------
describe('courtListenerWebhookSchema', () => {
  it('parses a valid webhook payload', async () => {
    const { courtListenerWebhookSchema } = await import('../courtlistener/types.js');

    const validPayload = {
      webhook: { event_type: 1, version: 1 },
      payload: {
        results: [
          {
            docket: 12345,
            case_name: 'FTC v. MegaCorp',
            docket_entries: [
              { id: 99, description: 'Motion for preliminary injunction', entry_number: 1, date_filed: '2026-03-01' },
            ],
          },
        ],
      },
    };

    const result = courtListenerWebhookSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('fails to parse a payload missing required webhook field', async () => {
    const { courtListenerWebhookSchema } = await import('../courtlistener/types.js');

    const invalidPayload = {
      payload: { results: [] },
      // webhook field is missing
    };

    const result = courtListenerWebhookSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('fails to parse a payload missing required payload field', async () => {
    const { courtListenerWebhookSchema } = await import('../courtlistener/types.js');

    const invalidPayload = {
      webhook: { event_type: 1, version: 1 },
      // payload field is missing
    };

    const result = courtListenerWebhookSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('preserves extra fields (passthrough) in parsed result', async () => {
    const { courtListenerWebhookSchema } = await import('../courtlistener/types.js');

    const payloadWithExtra = {
      webhook: { event_type: 1, version: 1, extra_field: 'preserved' },
      payload: { results: [], extra_root: true },
    };

    const result = courtListenerWebhookSchema.safeParse(payloadWithExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.webhook as Record<string, unknown>).extra_field).toBe('preserved');
      expect((result.data.payload as Record<string, unknown>).extra_root).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. COURTLISTENER_IPS — verify the IP allowlist contents
// ---------------------------------------------------------------------------
describe('COURTLISTENER_IPS', () => {
  it('contains exactly two IP addresses', async () => {
    const { COURTLISTENER_IPS } = await import('../courtlistener/types.js');
    expect(COURTLISTENER_IPS.size).toBe(2);
  });

  it('contains the documented CourtListener webhook sender IPs', async () => {
    const { COURTLISTENER_IPS } = await import('../courtlistener/types.js');
    expect(COURTLISTENER_IPS.has('34.210.230.218')).toBe(true);
    expect(COURTLISTENER_IPS.has('54.189.59.91')).toBe(true);
  });

  it('does not contain unlisted IPs', async () => {
    const { COURTLISTENER_IPS } = await import('../courtlistener/types.js');
    expect(COURTLISTENER_IPS.has('1.2.3.4')).toBe(false);
  });
});
