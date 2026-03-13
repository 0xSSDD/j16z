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
import type { AlertRule, Clause, CreateAlertRuleInput, Deal, Event, Filing, MarketSnapshot, NewsItem } from './types';

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
  return response.json();
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
    return response.json();
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
  return response.json();
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
  return response.json();
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
