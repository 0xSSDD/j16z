/**
 * API Abstraction Layer
 * 
 * This module provides a unified interface for data access that can switch
 * between mock data (for development) and real API calls (for production).
 * 
 * Set NEXT_PUBLIC_USE_MOCK_DATA=true in .env to use mock data.
 */

import { Deal, Event, Clause, MarketSnapshot, NewsItem } from "./types";
import { MOCK_DEALS, MOCK_EVENTS, MOCK_CLAUSES, MOCK_MARKET_SNAPSHOTS } from "./constants";

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

/**
 * Get all deals
 */
export async function getDeals(): Promise<Deal[]> {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_DEALS;
  }

  // TODO: Replace with real API call
  const response = await fetch("/api/deals");
  if (!response.ok) throw new Error("Failed to fetch deals");
  return response.json();
}

/**
 * Get a single deal by ID
 */
export async function getDeal(id: string): Promise<Deal | null> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_DEALS.find((d) => d.id === id) || null;
  }

  // TODO: Replace with real API call
  const response = await fetch(`/api/deals/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch deal");
  }
  return response.json();
}

/**
 * Get events for a specific deal
 */
export async function getEvents(dealId: string): Promise<Event[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_EVENTS.filter((e) => e.dealId === dealId);
  }

  // TODO: Replace with real API call
  const response = await fetch(`/api/deals/${dealId}/events`);
  if (!response.ok) throw new Error("Failed to fetch events");
  return response.json();
}

/**
 * Get all events (for notifications/feed)
 */
export async function getAllEvents(): Promise<Event[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_EVENTS;
  }

  // TODO: Replace with real API call
  const response = await fetch("/api/events");
  if (!response.ok) throw new Error("Failed to fetch events");
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

  // TODO: Replace with real API call
  const response = await fetch(`/api/deals/${dealId}/clauses`);
  if (!response.ok) throw new Error("Failed to fetch clauses");
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

  // TODO: Replace with real API call
  const response = await fetch(`/api/deals/${dealId}/market-snapshots`);
  if (!response.ok) throw new Error("Failed to fetch market snapshots");
  return response.json();
}

/**
 * Get news items for a specific deal
 */
export async function getNews(dealId: string): Promise<NewsItem[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    // TODO: Add mock news data when available
    return [];
  }

  // TODO: Replace with real API call
  const response = await fetch(`/api/deals/${dealId}/news`);
  if (!response.ok) throw new Error("Failed to fetch news");
  return response.json();
}

/**
 * Create a new deal
 */
export async function createDeal(deal: Partial<Deal>): Promise<Deal> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    // In mock mode, just return the deal with a generated ID
    return { ...deal, id: `deal-${Date.now()}` } as Deal;
  }

  // TODO: Replace with real API call
  const response = await fetch("/api/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deal),
  });
  if (!response.ok) throw new Error("Failed to create deal");
  return response.json();
}

/**
 * Update an existing deal
 */
export async function updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const deal = MOCK_DEALS.find((d) => d.id === id);
    if (!deal) throw new Error("Deal not found");
    return { ...deal, ...updates };
  }

  // TODO: Replace with real API call
  const response = await fetch(`/api/deals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error("Failed to update deal");
  return response.json();
}

/**
 * Delete a deal
 */
export async function deleteDeal(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  // TODO: Replace with real API call
  const response = await fetch(`/api/deals/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete deal");
}
