/**
 * Alert worker + delivery handler tests
 *
 * Tests the alert evaluation pipeline:
 *   - INFO severity returns early (no DB queries)
 *   - CRITICAL events dispatch to email + slack
 *   - WARNING events dispatch to slack only (email skipped)
 *   - Dedup prevents duplicate sends for same eventId+userId+channel
 *   - Webhook delivery includes HMAC signature header
 *   - No matching rules = no deliveries
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertEvaluateData } from '../alerts/types.js';

// ---------------------------------------------------------------------------
// Mock setup — must be before any imports that use these modules
// ---------------------------------------------------------------------------

// Mock notification log query results
const mockNotifWhere = vi.fn().mockResolvedValue([]);
const mockNotifFrom = vi.fn(() => ({ where: mockNotifWhere }));
const mockNotifSelect = vi.fn(() => ({ from: mockNotifFrom }));

// Mock alert rules query
const mockRulesWhere = vi.fn().mockResolvedValue([]);
const mockRulesFrom = vi.fn(() => ({ where: mockRulesWhere }));
const mockRulesSelect = vi.fn(() => ({ from: mockRulesFrom }));

// Mock events query
const mockEventsWhere = vi.fn().mockResolvedValue([]);
const mockEventsFrom = vi.fn(() => ({ where: mockEventsWhere }));
const mockEventsSelect = vi.fn(() => ({ from: mockEventsFrom }));

// Mock deals query
const mockDealsWhere = vi.fn().mockResolvedValue([]);
const mockDealsFrom = vi.fn(() => ({ where: mockDealsWhere }));
const mockDealsSelect = vi.fn(() => ({ from: mockDealsFrom }));

// Mock insert for notification_log
const mockInsertValues = vi.fn().mockResolvedValue([]);
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

// We track selectCallCount to route select() calls to different mocks
let selectCallCount = 0;

vi.mock('../db/index.js', () => ({
  adminDb: {
    get select() {
      return () => {
        selectCallCount++;
        // Route based on call order in handleAlertEvaluate:
        // 1st select = alertRules, 2nd = event, 3rd = deal (if dealId), then notification_log dedup checks
        if (selectCallCount === 1) return mockRulesSelect();
        if (selectCallCount === 2) return mockEventsSelect();
        if (selectCallCount === 3) return mockDealsSelect();
        // Subsequent selects are notification_log dedup checks
        return mockNotifSelect();
      };
    },
    get insert() {
      return mockInsert;
    },
  },
}));

// Mock Resend
const mockResendSend = vi.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null });
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockResendSend };
    },
  };
});

// Mock @slack/webhook
const mockSlackSend = vi.fn().mockResolvedValue({ text: 'ok' });
vi.mock('@slack/webhook', () => {
  return {
    IncomingWebhook: class MockIncomingWebhook {
      send = mockSlackSend;
    },
  };
});

// Mock fetch for webhook delivery
const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeJob(overrides: Partial<AlertEvaluateData> = {}) {
  return {
    data: {
      eventId: 'evt-1',
      firmId: 'firm-1',
      dealId: 'deal-1',
      materialityScore: 85,
      severity: 'CRITICAL' as const,
      ...overrides,
    },
    updateData: vi.fn(),
  };
}

function makeAlertRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    firmId: 'firm-1',
    dealId: null,
    userId: 'user-1',
    name: 'Test Rule',
    threshold: 50,
    channels: ['email', 'slack'],
    webhookUrl: null,
    webhookSecret: null,
    isActive: true,
    deletedAt: null,
    ...overrides,
  };
}

function makeEvent() {
  return {
    id: 'evt-1',
    firmId: 'firm-1',
    dealId: 'deal-1',
    type: 'AGENCY',
    subType: 'FTC_COMPLAINT',
    title: 'FTC Files Complaint Against Merger',
    description: 'The FTC has filed a complaint to block the proposed acquisition.',
    source: 'ftc',
    sourceUrl: 'https://ftc.gov/complaint/123',
    materialityScore: 95,
    severity: 'CRITICAL',
    timestamp: new Date(),
    metadata: null,
  };
}

function makeDeal() {
  return {
    id: 'deal-1',
    firmId: 'firm-1',
    symbol: 'ACME',
    acquirer: 'BigCorp Inc',
    target: 'SmallCo Ltd',
    grossSpread: '3.50',
    currentPrice: '45.00',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleAlertEvaluate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;

    // Re-establish mock chains after clearAllMocks
    mockNotifFrom.mockReturnValue({ where: mockNotifWhere });
    mockNotifSelect.mockReturnValue({ from: mockNotifFrom });
    mockRulesFrom.mockReturnValue({ where: mockRulesWhere });
    mockRulesSelect.mockReturnValue({ from: mockRulesFrom });
    mockEventsFrom.mockReturnValue({ where: mockEventsWhere });
    mockEventsSelect.mockReturnValue({ from: mockEventsFrom });
    mockDealsFrom.mockReturnValue({ where: mockDealsWhere });
    mockDealsSelect.mockReturnValue({ from: mockDealsFrom });
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue([]);

    // Default: no dedup matches, no rules
    mockNotifWhere.mockResolvedValue([]);
    mockRulesWhere.mockResolvedValue([]);
    mockEventsWhere.mockResolvedValue([makeEvent()]);
    mockDealsWhere.mockResolvedValue([makeDeal()]);
    mockResendSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });
    mockSlackSend.mockResolvedValue({ text: 'ok' });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    // Set env vars for delivery
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.RESEND_FROM_EMAIL = 'alerts@test.com';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
  });

  it('returns early for INFO severity (no DB queries)', async () => {
    const { handleAlertEvaluate } = await import('../alerts/alert-worker.js');
    const job = makeJob({ severity: 'INFO', materialityScore: 30 });

    await handleAlertEvaluate(job as never);

    // No DB queries should have been made
    expect(mockRulesSelect).not.toHaveBeenCalled();
    expect(mockEventsSelect).not.toHaveBeenCalled();
  });

  it('dispatches CRITICAL event to email + slack', async () => {
    const rule = makeAlertRule({ channels: ['email', 'slack'] });
    mockRulesWhere.mockResolvedValueOnce([rule]);

    const { handleAlertEvaluate } = await import('../alerts/alert-worker.js');
    const job = makeJob({ severity: 'CRITICAL', materialityScore: 85 });

    await handleAlertEvaluate(job as never);

    // Email should be sent for CRITICAL
    expect(mockResendSend).toHaveBeenCalled();
    // Slack should be sent
    expect(mockSlackSend).toHaveBeenCalled();
    // Two notification_log inserts (email + slack)
    expect(mockInsert).toHaveBeenCalled();
  });

  it('WARNING event skips email, sends slack only', async () => {
    const rule = makeAlertRule({ channels: ['email', 'slack'] });
    mockRulesWhere.mockResolvedValueOnce([rule]);

    const { handleAlertEvaluate } = await import('../alerts/alert-worker.js');
    const job = makeJob({ severity: 'WARNING', materialityScore: 60 });

    await handleAlertEvaluate(job as never);

    // Email should NOT be sent for WARNING
    expect(mockResendSend).not.toHaveBeenCalled();
    // Slack should be sent
    expect(mockSlackSend).toHaveBeenCalled();
  });

  it('dedup prevents duplicate sends for same eventId+userId+channel', async () => {
    const rule = makeAlertRule({ channels: ['slack'] });
    mockRulesWhere.mockResolvedValueOnce([rule]);

    // Simulate existing notification_log entry (dedup match)
    mockNotifWhere.mockResolvedValueOnce([{ id: 'existing-notif' }]);

    const { handleAlertEvaluate } = await import('../alerts/alert-worker.js');
    const job = makeJob({ severity: 'CRITICAL', materialityScore: 85 });

    await handleAlertEvaluate(job as never);

    // Slack should NOT be sent (dedup)
    expect(mockSlackSend).not.toHaveBeenCalled();
  });

  it('no matching rules = no deliveries', async () => {
    // No rules returned
    mockRulesWhere.mockResolvedValueOnce([]);

    const { handleAlertEvaluate } = await import('../alerts/alert-worker.js');
    const job = makeJob({ severity: 'CRITICAL', materialityScore: 85 });

    await handleAlertEvaluate(job as never);

    expect(mockResendSend).not.toHaveBeenCalled();
    expect(mockSlackSend).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('webhook delivery HMAC signature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;

    mockNotifFrom.mockReturnValue({ where: mockNotifWhere });
    mockNotifSelect.mockReturnValue({ from: mockNotifFrom });
    mockRulesFrom.mockReturnValue({ where: mockRulesWhere });
    mockRulesSelect.mockReturnValue({ from: mockRulesFrom });
    mockEventsFrom.mockReturnValue({ where: mockEventsWhere });
    mockEventsSelect.mockReturnValue({ from: mockEventsFrom });
    mockDealsFrom.mockReturnValue({ where: mockDealsWhere });
    mockDealsSelect.mockReturnValue({ from: mockDealsFrom });
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue([]);

    mockNotifWhere.mockResolvedValue([]);
    mockRulesWhere.mockResolvedValue([]);
    mockEventsWhere.mockResolvedValue([makeEvent()]);
    mockDealsWhere.mockResolvedValue([makeDeal()]);
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
  });

  it('webhook delivery includes HMAC-SHA256 signature header', async () => {
    const rule = makeAlertRule({
      channels: ['webhook'],
      webhookUrl: 'https://example.com/webhook',
      webhookSecret: 'test-secret-hex',
    });
    mockRulesWhere.mockResolvedValueOnce([rule]);

    const { handleAlertEvaluate } = await import('../alerts/alert-worker.js');
    const job = makeJob({ severity: 'CRITICAL', materialityScore: 85 });

    await handleAlertEvaluate(job as never);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Webhook-Signature': expect.any(String),
          'X-Webhook-Timestamp': expect.any(String),
        }),
      }),
    );
  });
});
