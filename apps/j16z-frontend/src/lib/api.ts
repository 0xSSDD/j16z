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
import type { Clause, Deal, Event, MarketSnapshot, NewsItem } from './types';

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
