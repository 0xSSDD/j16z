/**
 * API Abstraction Layer
 *
 * This module provides a unified interface for data access that can switch
 * between mock data (for development) and real API calls (for production).
 *
 * Set NEXT_PUBLIC_USE_MOCK_DATA=true in .env to use mock data.
 * Set NEXT_PUBLIC_USE_MOCK_DATA=false to call the real Hono API backend.
 */

import { MOCK_CLAUSES, MOCK_DEALS, MOCK_EVENTS, MOCK_MARKET_SNAPSHOTS } from './constants';
import type {
  AlertRule,
  Clause,
  CreateAlertRuleInput,
  Deal,
  DigestPreferences,
  Event,
  Filing,
  MarketSnapshot,
  Memo,
  MemoSnapshot,
  NewsItem,
} from './types';

export interface IntegrationHealth {
  id: string;
  source: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastSyncAt: string | null;
  itemsIngested: number;
  lastError: string | null;
  pollIntervalMinutes: number;
}

export interface PacerCredentialHealth {
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  expiryDate: string | null;
  lastChanged: string | null;
}

export interface IntegrationHealthResponse {
  sources: IntegrationHealth[];
  pacerCredential?: PacerCredentialHealth;
}

export interface RSSFeedRecord {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'paused' | 'error';
  lastSyncAt: string | null;
  itemCount: number;
  createdAt: string;
}

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Backend → Frontend type mappers
//
// The backend DB schema uses different field names than the frontend types.
// These mappers bridge the gap so components can consume API data directly.
// ---------------------------------------------------------------------------

interface BackendDeal {
  id: string;
  firmId: string | null;
  symbol: string;
  acquirer: string;
  target: string;
  dealValue: string | null;
  pricePerShare: string | null;
  premium: string | null;
  currentPrice: string | null;
  grossSpread: string | null;
  annualizedReturn: string | null;
  status: string;
  considerationType: string;
  announcedDate: string | null;
  expectedCloseDate: string | null;
  outsideDate: string | null;
  pCloseBase: string | null;
  pBreakRegulatory: string | null;
  pBreakLitigation: string | null;
  regulatoryFlags: string[] | null;
  litigationCount: number;
  spreadEntryThreshold: string | null;
  sizeBucket: string | null;
  isStarter: boolean;
  acquirerCik: string | null;
  targetCik: string | null;
  source: string | null;
  exchangeRatio: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BackendEvent {
  id: string;
  firmId: string;
  dealId: string;
  type: string;
  subType: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  timestamp: string;
  materialityScore: number;
  severity: string;
  metadata: unknown;
}

function num(v: string | null | undefined): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function mapBackendDeal(raw: BackendDeal): Deal {
  const pClose = num(raw.pCloseBase);
  const spread = num(raw.grossSpread);
  const pBreakReg = num(raw.pBreakRegulatory);
  const pBreakLit = num(raw.pBreakLitigation);
  const downside = pBreakReg + pBreakLit;
  const ev = spread > 0 ? (spread * pClose - downside * (100 - pClose)) / 100 : num(raw.annualizedReturn);

  return {
    id: raw.id,
    symbol: raw.symbol,
    acquirerSymbol: raw.symbol,
    companyName: raw.target,
    acquirerName: raw.acquirer,
    announcementDate: raw.announcedDate ?? '',
    acquisitionDate: raw.expectedCloseDate ?? '',
    outsideDate: raw.outsideDate ?? '',
    reportedEquityTakeoverValue: num(raw.dealValue),
    considerationType: (raw.considerationType as Deal['considerationType']) ?? 'CASH',
    p_close_base: pClose,
    spread_entry_threshold: num(raw.spreadEntryThreshold),
    currentSpread: spread,
    ev,
    status: (raw.status as Deal['status']) ?? 'ANNOUNCED',
    regulatoryFlags: (raw.regulatoryFlags ?? []) as Deal['regulatoryFlags'],
    litigationCount: raw.litigationCount ?? 0,
  };
}

function mapBackendEvent(raw: BackendEvent): Event {
  return {
    id: raw.id,
    dealId: raw.dealId,
    timestamp: raw.timestamp,
    type: raw.type as Event['type'],
    subtype: raw.subType,
    severity: (raw.severity as Event['severity']) ?? 'INFO',
    title: raw.title,
    summary: raw.description,
    sourceUrl: raw.sourceUrl,
    sourceType: raw.source as Event['sourceType'],
    materialityScore: raw.materialityScore,
  };
}

// ---------------------------------------------------------------------------
// authFetch — wrapper around fetch that attaches the Supabase JWT as a Bearer
// token on every request to the Hono API.
//
// In real mode, the API requires a valid JWT on all /api/* routes.
// The token is retrieved from the active Supabase session in the browser.
// ---------------------------------------------------------------------------
async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Get all deals
 */
export async function getDeals(): Promise<Deal[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_DEALS;
  }

  const response = await authFetch('/api/deals');
  const raw: BackendDeal[] = await response.json();
  return raw.map(mapBackendDeal);
}

/**
 * Get a single deal by ID
 */
export async function getDeal(id: string): Promise<Deal | null> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_DEALS.find((d) => d.id === id) ?? null;
  }

  try {
    const response = await authFetch(`/api/deals/${id}`);
    const raw: BackendDeal = await response.json();
    return mapBackendDeal(raw);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

/**
 * Get events for a specific deal
 */
export async function getEvents(dealId: string): Promise<Event[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_EVENTS.filter((e) => e.dealId === dealId);
  }

  const response = await authFetch(`/api/events?dealId=${dealId}`);
  const raw: BackendEvent[] = await response.json();
  return raw.map(mapBackendEvent);
}

/**
 * Get all events (for inbox/feed)
 */
export async function getAllEvents(): Promise<Event[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_EVENTS;
  }

  const response = await authFetch('/api/events');
  const raw: BackendEvent[] = await response.json();
  return raw.map(mapBackendEvent);
}

/**
 * Get clauses for a specific deal
 */
export async function getClauses(dealId: string): Promise<Clause[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_CLAUSES.filter((c) => c.dealId === dealId);
  }

  const response = await authFetch(`/api/deals/${dealId}/clauses`);
  return response.json();
}

/**
 * Get market snapshots (spread history) for a specific deal
 */
export async function getMarketSnapshots(dealId: string): Promise<MarketSnapshot[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_MARKET_SNAPSHOTS.filter((s) => s.dealId === dealId);
  }

  const response = await authFetch(`/api/deals/${dealId}/market-snapshots`);
  return response.json();
}

/**
 * Get news items for a specific deal
 */
export async function getNews(dealId: string): Promise<NewsItem[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return [];
  }

  const response = await authFetch(`/api/deals/${dealId}/news`);
  return response.json();
}

/**
 * Create a new deal
 */
export async function createDeal(deal: Partial<Deal>): Promise<Deal> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { ...deal, id: `deal-${Date.now()}` } as Deal;
  }

  const response = await authFetch('/api/deals', {
    method: 'POST',
    body: JSON.stringify(deal),
  });
  return response.json();
}

/**
 * Update an existing deal
 */
export async function updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const deal = MOCK_DEALS.find((d) => d.id === id);
    if (!deal) throw new Error('Deal not found');
    return { ...deal, ...updates };
  }

  const response = await authFetch(`/api/deals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.json();
}

/**
 * Delete a deal (soft delete on backend)
 */
export async function deleteDeal(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  await authFetch(`/api/deals/${id}`, { method: 'DELETE' });
}

/**
 * Get filings for a specific deal
 * NOTE: No mock data fallback — filings require real backend
 */
export async function getFilings(dealId: string): Promise<Filing[]> {
  if (USE_MOCK_DATA) {
    return []; // No mock filings — real data only
  }

  const response = await authFetch(`/api/filings/deal/${dealId}`);
  return response.json();
}

/**
 * Get all filings for the firm's deals
 * NOTE: No mock data fallback — filings require real backend
 */
export async function getAllFilings(): Promise<Filing[]> {
  if (USE_MOCK_DATA) {
    return []; // No mock filings — real data only
  }

  const response = await authFetch('/api/filings');
  return response.json();
}

/**
 * Get filing count for a specific deal (for deal board badge)
 * NOTE: No mock data fallback — filings require real backend
 */
export async function getFilingCount(dealId: string): Promise<number> {
  if (USE_MOCK_DATA) {
    return 0;
  }

  const filings = await getFilings(dealId);
  return filings.length;
}

const MOCK_INTEGRATION_HEALTH: IntegrationHealth[] = [
  {
    id: 'int-edgar',
    source: 'SEC EDGAR',
    status: 'healthy',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    itemsIngested: 1247,
    lastError: null,
    pollIntervalMinutes: 10,
  },
  {
    id: 'int-ftc',
    source: 'FTC.gov',
    status: 'healthy',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    itemsIngested: 89,
    lastError: null,
    pollIntervalMinutes: 30,
  },
  {
    id: 'int-doj',
    source: 'DOJ.gov',
    status: 'degraded',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    itemsIngested: 42,
    lastError: 'Rate limited — retry scheduled',
    pollIntervalMinutes: 30,
  },
  {
    id: 'int-court',
    source: 'CourtListener',
    status: 'healthy',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    itemsIngested: 316,
    lastError: null,
    pollIntervalMinutes: 15,
  },
  {
    id: 'int-rss',
    source: 'RSS Feeds',
    status: 'healthy',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    itemsIngested: 523,
    lastError: null,
    pollIntervalMinutes: 15,
  },
];

export async function getIntegrationHealth(): Promise<IntegrationHealthResponse> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { sources: MOCK_INTEGRATION_HEALTH };
  }

  const response = await authFetch('/api/integrations/health');
  const data = await response.json();

  // Map backend { sources, pacerCredential } shape to frontend IntegrationHealth[]
  const mappedSources: IntegrationHealth[] = (data.sources ?? []).map(
    (source: {
      sourceName: string;
      displayName: string;
      lastSuccessfulSync: string | null;
      lastError: string | null;
      itemsIngested: number;
      isHealthy: boolean;
    }) => ({
      id: source.sourceName,
      source: source.displayName,
      status: source.isHealthy ? 'healthy' : source.lastError ? 'unhealthy' : 'degraded',
      lastSyncAt: source.lastSuccessfulSync,
      itemsIngested: source.itemsIngested,
      lastError: source.lastError,
      pollIntervalMinutes: 30,
    }),
  );

  return {
    sources: mappedSources,
    pacerCredential: data.pacerCredential,
  };
}

const MOCK_RSS_FEEDS: RSSFeedRecord[] = [
  {
    id: 'rss-1',
    name: 'Reuters M&A Wire',
    url: 'https://www.reuters.com/business/deals/rss',
    status: 'active',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    itemCount: 234,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'rss-2',
    name: 'Bloomberg Law Mergers',
    url: 'https://news.bloomberglaw.com/mergers-and-acquisitions/feed',
    status: 'active',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    itemCount: 189,
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'rss-3',
    name: 'Skadden M&A Alerts',
    url: 'https://www.skadden.com/insights/rss/mergers-acquisitions',
    status: 'paused',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    itemCount: 67,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'rss-4',
    name: 'Wachtell Lipton Insights',
    url: 'https://www.wlrk.com/insights/feed',
    status: 'error',
    lastSyncAt: null,
    itemCount: 0,
    createdAt: '2024-02-10T00:00:00Z',
  },
];

export async function getRSSFeeds(): Promise<RSSFeedRecord[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return MOCK_RSS_FEEDS;
  }

  const response = await authFetch('/api/rss-feeds');
  return response.json();
}

export async function createRSSFeed(data: { name: string; url: string }): Promise<RSSFeedRecord> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      id: `rss-${Date.now()}`,
      name: data.name,
      url: data.url,
      status: 'active',
      lastSyncAt: null,
      itemCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  const response = await authFetch('/api/rss-feeds', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteRSSFeed(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  await authFetch(`/api/rss-feeds/${id}`, { method: 'DELETE' });
}

export async function updateRSSFeed(id: string, updates: Partial<RSSFeedRecord>): Promise<RSSFeedRecord> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const feed = MOCK_RSS_FEEDS.find((f) => f.id === id);
    if (!feed) throw new Error('Feed not found');
    return { ...feed, ...updates };
  }

  const response = await authFetch(`/api/rss-feeds/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.json();
}

// ---------------------------------------------------------------------------
// Alert Rules API
// ---------------------------------------------------------------------------

const MOCK_ALERT_RULES: AlertRule[] = [
  {
    id: 'ar-1',
    firmId: 'firm-1',
    dealId: null,
    userId: 'user-1',
    name: 'Critical alerts',
    threshold: 70,
    channels: ['email', 'slack'],
    webhookUrl: null,
    isActive: true,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
];

export async function getAlertRules(dealId?: string): Promise<AlertRule[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (dealId) return MOCK_ALERT_RULES.filter((r) => r.dealId === dealId);
    return MOCK_ALERT_RULES;
  }

  const params = dealId ? `?dealId=${dealId}` : '';
  const response = await authFetch(`/api/alert-rules${params}`);
  return response.json();
}

export async function createAlertRule(rule: CreateAlertRuleInput): Promise<AlertRule> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      id: `ar-${Date.now()}`,
      firmId: 'firm-1',
      dealId: rule.dealId ?? null,
      userId: 'user-1',
      name: rule.name,
      threshold: rule.threshold,
      channels: rule.channels,
      webhookUrl: rule.webhookUrl ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await authFetch('/api/alert-rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  });
  return response.json();
}

export async function updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const existing = MOCK_ALERT_RULES.find((r) => r.id === id);
    if (!existing) throw new Error('Alert rule not found');
    return { ...existing, ...updates };
  }

  const response = await authFetch(`/api/alert-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.json();
}

export async function deleteAlertRule(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  await authFetch(`/api/alert-rules/${id}`, { method: 'DELETE' });
}

export async function testAlertRule(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  await authFetch(`/api/alert-rules/${id}/test`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Market Snapshots API (latest snapshot for deal board)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Digest Preferences API
// ---------------------------------------------------------------------------

const DEFAULT_DIGEST_PREFS: DigestPreferences = {
  dailyEnabled: true,
  weeklyEnabled: true,
  suppressWeekend: false,
};

/**
 * Get the current user's digest preferences.
 * Returns defaults when NEXT_PUBLIC_USE_MOCK_DATA=true.
 */
export async function getDigestPreferences(): Promise<DigestPreferences> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { ...DEFAULT_DIGEST_PREFS };
  }

  const response = await authFetch('/api/digest-preferences');
  return response.json();
}

/**
 * Update the current user's digest preferences.
 */
export async function updateDigestPreferences(prefs: DigestPreferences): Promise<DigestPreferences> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { ...prefs };
  }

  const response = await authFetch('/api/digest-preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
  return response.json();
}

// ---------------------------------------------------------------------------
// Market Snapshots API (latest snapshot for deal board)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Memos API
// ---------------------------------------------------------------------------

// Mock memos spanning multiple deals for development mode
function mockMemoContent(title: string, summary: string): Record<string, unknown> {
  const h2 = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });
  const p = (text: string) => (text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' });
  return {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] },
      h2('Executive Summary'),
      p(summary),
      h2('Deal Terms'),
      p('See deal card for current terms.'),
      h2('Regulatory Status'),
      p('Regulatory review in progress.'),
      h2('Litigation'),
      p('No litigation events recorded yet.'),
      h2('Key Clauses'),
      p('Key clause analysis pending.'),
      h2('Spread History'),
      p('Spread data to be updated on next refresh.'),
      h2('Analyst Notes'),
      p(''),
    ],
  };
}

const MOCK_MEMOS: (Memo & { dealTitle: string })[] = [
  {
    id: 'memo-1',
    dealId: 'deal-1',
    dealTitle: 'Microsoft / Activision Blizzard',
    title: 'Initial Spread Analysis',
    content: mockMemoContent(
      'Microsoft / Activision Blizzard — Initial Spread Analysis',
      'Spread remains attractive at 4.2% with FTC challenge ongoing. CMA clearance is the binding constraint.',
    ),
    createdBy: 'user-1',
    visibility: 'firm',
    version: 3,
    createdAt: '2026-03-10T09:15:00Z',
    updatedAt: '2026-03-13T14:22:00Z',
  },
  {
    id: 'memo-2',
    dealId: 'deal-1',
    dealTitle: 'Microsoft / Activision Blizzard',
    title: 'Regulatory Risk Assessment',
    content: mockMemoContent(
      'Microsoft / Activision Blizzard — Regulatory Risk Assessment',
      'FTC second request timeline analysis and UK CMA phase 2 review implications for deal closure probability.',
    ),
    createdBy: 'user-1',
    visibility: 'private',
    version: 2,
    createdAt: '2026-03-08T11:30:00Z',
    updatedAt: '2026-03-12T16:45:00Z',
  },
  {
    id: 'memo-3',
    dealId: 'deal-3',
    dealTitle: 'Kroger / Albertsons Companies',
    title: 'IC Memo Draft',
    content: mockMemoContent(
      'Kroger / Albertsons — IC Memo Draft',
      'Investment committee memo draft. FTC divestiture package of 413 stores may satisfy competitive concerns. Spread entry at 6.8% presents compelling risk/reward.',
    ),
    createdBy: 'user-1',
    visibility: 'firm',
    version: 5,
    createdAt: '2026-03-05T08:00:00Z',
    updatedAt: '2026-03-14T10:15:00Z',
  },
  {
    id: 'memo-4',
    dealId: 'deal-4',
    dealTitle: 'JetBlue / Spirit Airlines',
    title: 'Post-DOJ Ruling Update',
    content: mockMemoContent(
      'JetBlue / Spirit Airlines — Post-DOJ Ruling Update',
      'DOJ successfully blocked the merger. Evaluating appeal likelihood and updated downside scenarios.',
    ),
    createdBy: 'user-1',
    visibility: 'firm',
    version: 1,
    createdAt: '2026-03-12T15:00:00Z',
    updatedAt: '2026-03-12T15:00:00Z',
  },
  {
    id: 'memo-5',
    dealId: 'deal-6',
    dealTitle: 'Broadcom / VMware Inc.',
    title: 'Post-Close Integration Notes',
    content: mockMemoContent(
      'Broadcom / VMware — Post-Close Integration Notes',
      'Deal closed 11/22. Final spread capture was 29bps. Documenting timeline for future reference on mega-cap semiconductor M&A.',
    ),
    createdBy: 'user-1',
    visibility: 'private',
    version: 2,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-11T09:30:00Z',
  },
  {
    id: 'memo-6',
    dealId: 'deal-3',
    dealTitle: 'Kroger / Albertsons Companies',
    title: 'Divestiture Package Analysis',
    content: mockMemoContent(
      'Kroger / Albertsons — Divestiture Package Analysis',
      'C&S Wholesale Grocers proposed as divestiture buyer for 413 stores. Analyzing buyer credibility and FTC precedent for grocery mergers.',
    ),
    createdBy: 'user-1',
    visibility: 'firm',
    version: 4,
    createdAt: '2026-03-07T13:45:00Z',
    updatedAt: '2026-03-13T11:00:00Z',
  },
];

/**
 * Get all memos across deals (for the memos index page).
 */
export async function getAllMemos(): Promise<(Memo & { dealTitle: string })[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_MEMOS;
  }

  const response = await authFetch('/api/memos');
  return response.json();
}

/**
 * Get memos for a deal (list view — no content field).
 */
export async function getMemos(dealId: string): Promise<Memo[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_MEMOS.filter((m) => m.dealId === dealId);
  }

  const response = await authFetch(`/api/memos?dealId=${dealId}`);
  return response.json();
}

/**
 * Get a single memo with full content.
 */
export async function getMemo(id: string): Promise<Memo> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const memo = MOCK_MEMOS.find((m) => m.id === id);
    if (!memo) throw new Error(`Memo ${id} not found`);
    return memo;
  }

  const response = await authFetch(`/api/memos/${id}`);
  return response.json();
}

/**
 * Create a new memo.
 */
export async function createMemo(data: {
  dealId: string;
  title: string;
  content: Record<string, unknown>;
  visibility?: string;
}): Promise<Memo> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      id: `memo-${Date.now()}`,
      dealId: data.dealId,
      title: data.title,
      content: data.content,
      createdBy: 'user-1',
      visibility: (data.visibility as 'private' | 'firm') ?? 'private',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await authFetch('/api/memos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Update memo content/title/visibility (auto-save target).
 */
export async function updateMemo(
  id: string,
  data: { content?: Record<string, unknown>; title?: string; visibility?: string; version: number },
): Promise<Memo> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    throw new Error('Memos not available in mock mode');
  }

  const response = await authFetch(`/api/memos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Soft-delete a memo.
 */
export async function deleteMemo(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return;
  }

  await authFetch(`/api/memos/${id}`, { method: 'DELETE' });
}

/**
 * Create a named snapshot of a memo at its current state.
 */
export async function createMemoSnapshot(memoId: string, name: string): Promise<MemoSnapshot> {
  if (USE_MOCK_DATA) {
    throw new Error('Memos not available in mock mode');
  }

  const response = await authFetch(`/api/memos/${memoId}/snapshots`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return response.json();
}

/**
 * List snapshots for a memo (no content field).
 */
export async function getMemoSnapshots(memoId: string): Promise<MemoSnapshot[]> {
  if (USE_MOCK_DATA) {
    return [];
  }

  const response = await authFetch(`/api/memos/${memoId}/snapshots`);
  return response.json();
}

/**
 * Get a single snapshot with full content.
 */
export async function getMemoSnapshot(memoId: string, snapshotId: string): Promise<MemoSnapshot> {
  if (USE_MOCK_DATA) {
    throw new Error('Memos not available in mock mode');
  }

  const response = await authFetch(`/api/memos/${memoId}/snapshots/${snapshotId}`);
  return response.json();
}

/**
 * Restore memo content from a named snapshot.
 */
export async function restoreMemoSnapshot(memoId: string, snapshotId: string): Promise<Memo> {
  if (USE_MOCK_DATA) {
    throw new Error('Memos not available in mock mode');
  }

  const response = await authFetch(`/api/memos/${memoId}/snapshots/${snapshotId}/restore`, {
    method: 'POST',
  });
  return response.json();
}

// ---------------------------------------------------------------------------
// API Keys API
// ---------------------------------------------------------------------------

export interface ApiKeyRecord {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateApiKeyResponse extends ApiKeyRecord {
  key: string; // Raw sk_live_ key — shown once, never returned again
}

/**
 * List all API keys for the firm (id, name, dates — never the raw key).
 */
export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return [];
  }

  const response = await authFetch('/api/api-keys');
  return response.json();
}

/**
 * Create a new API key. Returns the raw sk_live_ key shown once.
 */
export async function createApiKey(name: string): Promise<CreateApiKeyResponse> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      id: `key-${Date.now()}`,
      name,
      key: `sk_live_${'x'.repeat(64)}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
  }

  const response = await authFetch('/api/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return response.json();
}

/**
 * Delete an API key by ID.
 */
export async function deleteApiKey(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  await authFetch(`/api/api-keys/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Watchlists API
// ---------------------------------------------------------------------------

export interface WatchlistRecord {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistWithDeals extends WatchlistRecord {
  deals: Deal[];
}

export async function getWatchlists(): Promise<WatchlistRecord[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return [];
  }

  const response = await authFetch('/api/watchlists');
  return response.json();
}

export async function getWatchlist(id: string): Promise<WatchlistWithDeals | null> {
  if (USE_MOCK_DATA) {
    return null;
  }

  try {
    const response = await authFetch(`/api/watchlists/${id}`);
    const raw = await response.json();
    return {
      ...raw,
      deals: (raw.deals ?? []).map(mapBackendDeal),
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

export async function createWatchlist(data: { name: string; description?: string }): Promise<WatchlistRecord> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      id: `wl-${Date.now()}`,
      name: data.name,
      description: data.description ?? null,
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await authFetch('/api/watchlists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

// ---------------------------------------------------------------------------
// Market Snapshots API
// ---------------------------------------------------------------------------

export async function getLatestMarketSnapshot(dealId: string): Promise<MarketSnapshot | null> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const snapshots = MOCK_MARKET_SNAPSHOTS.filter((s) => s.dealId === dealId);
    if (snapshots.length === 0) return null;
    // Return the most recent snapshot
    return snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }

  try {
    const response = await authFetch(`/api/market-snapshots/${dealId}/latest`);
    const data = await response.json();
    // Map backend shape (grossSpread, targetPrice) to frontend MarketSnapshot type
    return {
      dealId: data.dealId,
      timestamp: data.timestamp,
      targetPrice: Number(data.currentPrice),
      acquirerPrice: Number(data.acquirerPrice),
      offerPrice: Number(data.targetPrice),
      spread: Number(data.grossSpread),
      volume: Number(data.volume),
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

export interface AdminSystemHealth {
  state: 'healthy' | 'degraded' | 'incident';
  silentFailure: boolean;
  api: { healthy: boolean };
  redis: { healthy: boolean; error?: string };
  postgres: { healthy: boolean; error?: string };
  workers: { nodeJs: number; healthy: boolean };
  queue: { active: number; waiting: number; completed: number; failed: number; delayed: number };
  firm: { id: string } | null;
  timestamp: string;
}

export interface AdminQueueData {
  counts: Record<string, number>;
  failedJobs: Array<{
    id: string;
    name: string;
    failedReason: string;
    attemptsMade: number;
    timestamp: number;
    finishedOn: number;
  }>;
  schedulers: Array<{
    id: string;
    name: string;
    pattern: string;
    next: number;
    tz?: string;
  }>;
}

export interface AdminScheduleData {
  config: Record<string, string>;
  active: Array<{
    id: string;
    name: string;
    pattern: string;
    next: string | null;
    tz?: string;
  }>;
}

export interface AdminOverview {
  firmId: string;
  members: number;
  deals: number;
  events: number;
  filings: number;
}

export async function getAdminSystemHealth(): Promise<AdminSystemHealth> {
  const response = await authFetch('/api/admin/system');
  return response.json();
}

export async function getAdminQueues(): Promise<AdminQueueData> {
  const response = await authFetch('/api/admin/queues');
  return response.json();
}

export async function getAdminSchedules(): Promise<AdminScheduleData> {
  const response = await authFetch('/api/admin/schedules');
  return response.json();
}

export async function getAdminIngestion(): Promise<{ sources: Array<Record<string, unknown>> }> {
  const response = await authFetch('/api/admin/ingestion');
  return response.json();
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const response = await authFetch('/api/admin/overview');
  return response.json();
}

export interface AdminPipeline {
  funnel: { discovered: number; downloaded: number; extracted: number; eventsCreated: number };
  dealFreshness: Array<{
    dealId: string;
    symbol: string;
    acquirer: string;
    target: string;
    status: string;
    lastEventAt: string | null;
    stale: boolean;
  }>;
  oldestPendingMs: number;
  failureGroups: Array<{ count: number; lastError: string; lastTime: number }>;
}

export async function getAdminPipeline(): Promise<AdminPipeline> {
  const response = await authFetch('/api/admin/pipeline');
  return response.json();
}
