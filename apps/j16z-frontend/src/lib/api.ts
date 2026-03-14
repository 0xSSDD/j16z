/**
 * API Abstraction Layer
 *
 * This module provides a unified interface for data access that can switch
 * between mock data (for development) and real API calls (for production).
 *
 * Set NEXT_PUBLIC_USE_MOCK_DATA=true in .env to use mock data.
 * Set NEXT_PUBLIC_USE_MOCK_DATA=false to call the real Hono API backend.
 */

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

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function coerceDealNumerics(raw: Record<string, unknown>): Deal {
  return {
    ...raw,
    dealValue: num(raw.dealValue),
    grossSpread: num(raw.grossSpread),
    pCloseBase: num(raw.pCloseBase),
    spreadEntryThreshold: num(raw.spreadEntryThreshold),
    annualizedReturn: num(raw.annualizedReturn),
    litigationCount: num(raw.litigationCount),
  } as Deal;
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
  if (USE_MOCK_DATA) return [];
  const response = await authFetch('/api/deals');
  const raw: Record<string, unknown>[] = await response.json();
  return raw.map(coerceDealNumerics);
}

/**
 * Get a single deal by ID
 */
export async function getDeal(id: string): Promise<Deal | null> {
  if (USE_MOCK_DATA) return null;
  try {
    const response = await authFetch(`/api/deals/${id}`);
    const raw = await response.json();
    return coerceDealNumerics(raw);
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
    return [];
  }

  const response = await authFetch(`/api/events?dealId=${dealId}`);
  return response.json();
}

/**
 * Get all events (for inbox/feed)
 */
export async function getAllEvents(): Promise<Event[]> {
  if (USE_MOCK_DATA) {
    return [];
  }

  const response = await authFetch('/api/events');
  return response.json();
}

/**
 * Get clauses for a specific deal
 */
export async function getClauses(dealId: string): Promise<Clause[]> {
  if (USE_MOCK_DATA) {
    return [];
  }

  const response = await authFetch(`/api/deals/${dealId}/clauses`);
  return response.json();
}

/**
 * Get market snapshots (spread history) for a specific deal
 */
export async function getMarketSnapshots(dealId: string): Promise<MarketSnapshot[]> {
  if (USE_MOCK_DATA) {
    return [];
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
    return { ...deal, id: crypto.randomUUID() } as Deal;
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
    return { ...updates, id: crypto.randomUUID() } as Deal;
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

export async function getIntegrationHealth(): Promise<IntegrationHealthResponse> {
  if (USE_MOCK_DATA) {
    return { sources: [] };
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

export async function getRSSFeeds(): Promise<RSSFeedRecord[]> {
  if (USE_MOCK_DATA) {
    return [];
  }

  const response = await authFetch('/api/rss-feeds');
  return response.json();
}

export async function createRSSFeed(data: { name: string; url: string }): Promise<RSSFeedRecord> {
  if (USE_MOCK_DATA) {
    return {} as RSSFeedRecord;
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
    return { ...updates, id } as RSSFeedRecord;
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

export async function getAlertRules(dealId?: string): Promise<AlertRule[]> {
  if (USE_MOCK_DATA) {
    return [];
  }

  const params = dealId ? `?dealId=${dealId}` : '';
  const response = await authFetch(`/api/alert-rules${params}`);
  return response.json();
}

export async function createAlertRule(rule: CreateAlertRuleInput): Promise<AlertRule> {
  if (USE_MOCK_DATA) {
    return {} as AlertRule;
  }

  const response = await authFetch('/api/alert-rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  });
  return response.json();
}

export async function updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
  if (USE_MOCK_DATA) {
    return { ...updates, id } as AlertRule;
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

/**
 * Get the current user's digest preferences.
 */
export async function getDigestPreferences(): Promise<DigestPreferences> {
  if (USE_MOCK_DATA) {
    return {} as DigestPreferences;
  }

  const response = await authFetch('/api/digest-preferences');
  return response.json();
}

/**
 * Update the current user's digest preferences.
 */
export async function updateDigestPreferences(prefs: DigestPreferences): Promise<DigestPreferences> {
  if (USE_MOCK_DATA) {
    return {} as DigestPreferences;
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

/**
 * Get all memos across deals (for the memos index page).
 */
export async function getAllMemos(): Promise<(Memo & { dealTitle: string })[]> {
  if (USE_MOCK_DATA) {
    return [];
  }

  const response = await authFetch('/api/memos');
  return response.json();
}

/**
 * Get memos for a deal (list view — no content field).
 */
export async function getMemos(dealId: string): Promise<Memo[]> {
  if (USE_MOCK_DATA) {
    return [];
  }

  const response = await authFetch(`/api/memos?dealId=${dealId}`);
  return response.json();
}

/**
 * Get a single memo with full content.
 */
export async function getMemo(id: string): Promise<Memo> {
  if (USE_MOCK_DATA) {
    return {} as Memo;
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
    return { ...data, id: crypto.randomUUID() } as Memo;
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
    return { ...data, id: crypto.randomUUID() } as Memo;
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
    return {} as MemoSnapshot;
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
    return {} as MemoSnapshot;
  }

  const response = await authFetch(`/api/memos/${memoId}/snapshots/${snapshotId}`);
  return response.json();
}

/**
 * Restore memo content from a named snapshot.
 */
export async function restoreMemoSnapshot(memoId: string, snapshotId: string): Promise<Memo> {
  if (USE_MOCK_DATA) {
    return {} as Memo;
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
    return {} as CreateApiKeyResponse;
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
    const watchlist: WatchlistWithDeals = await response.json();
    return {
      ...watchlist,
      deals: (watchlist.deals ?? []).map((deal) => coerceDealNumerics(deal as unknown as Record<string, unknown>)),
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

export async function createWatchlist(data: { name: string; description?: string }): Promise<WatchlistRecord> {
  if (USE_MOCK_DATA) {
    return {} as WatchlistRecord;
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
    return null;
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

export interface AdminRecentFiling {
  id: string;
  accessionNumber: string;
  filingType: string;
  filerName: string | null;
  filerCik: string;
  filedDate: string;
  dealId: string | null;
  status: string;
  hasContent: boolean;
  extracted: boolean;
}

export async function getAdminPipeline(): Promise<AdminPipeline> {
  const response = await authFetch('/api/admin/pipeline');
  return response.json();
}

export async function getFirmMembers(): Promise<
  Array<{ id: string; userId: string; email: string; role: string; joinedAt: string }>
> {
  const response = await authFetch('/api/auth/members');
  return response.json();
}

export async function inviteFirmMember(email: string, role: 'admin' | 'member'): Promise<void> {
  await authFetch('/api/auth/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function updateMemberRole(memberId: string, role: 'admin' | 'member'): Promise<void> {
  await authFetch(`/api/auth/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

export async function removeMember(memberId: string): Promise<void> {
  await authFetch(`/api/auth/members/${memberId}`, { method: 'DELETE' });
}

export async function getAdminRecentFilings(): Promise<AdminRecentFiling[]> {
  const response = await authFetch('/api/admin/recent-filings');
  return response.json();
}

export async function triggerEdgarPoll(): Promise<void> {
  await authFetch('/api/admin/trigger-poll', {
    method: 'POST',
  });
}
