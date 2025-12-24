"use client";

import React, { useState, useEffect } from "react";
import { Filter, X, Search } from "lucide-react";
import { VirtualizedDropdown } from "@/components/ui/virtualized-dropdown";

interface InboxFiltersProps {
  filters: {
    materiality: string[];
    eventType: string[];
    deal: string[];
    watchlist: string[];
    unreadOnly: boolean;
  };
  onFiltersChange: (filters: InboxFiltersProps["filters"]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function InboxFilters({ filters, onFiltersChange, searchQuery, onSearchChange }: InboxFiltersProps) {
  const [deals, setDeals] = useState<Array<{ id: string; name: string }>>([]);
  const [watchlists, setWatchlists] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    // Load deals from API/mock data
    async function loadDeals() {
      try {
        const { getDeals } = await import("@/lib/api");
        const dealsData = await getDeals();
        setDeals(dealsData.map(d => ({ id: d.id, name: d.companyName })));
      } catch (error) {
        console.error("Failed to load deals:", error);
      }
    }

    // Load watchlists from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("watchlists");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setWatchlists(parsed.map((w: any) => ({ id: w.id, name: w.name })));
        } catch (error) {
          console.error("Failed to load watchlists:", error);
        }
      }
    }

    loadDeals();
  }, []);


  const toggleMateriality = (tier: string) => {
    const newMateriality = filters.materiality.includes(tier)
      ? filters.materiality.filter((t) => t !== tier)
      : [...filters.materiality, tier];
    onFiltersChange({ ...filters, materiality: newMateriality });
  };

  const toggleEventType = (type: string) => {
    const newEventType = filters.eventType.includes(type)
      ? filters.eventType.filter((t) => t !== type)
      : [...filters.eventType, type];
    onFiltersChange({ ...filters, eventType: newEventType });
  };

  const toggleDeal = (dealId: string) => {
    const newDeal = filters.deal.includes(dealId)
      ? filters.deal.filter((d) => d !== dealId)
      : [...filters.deal, dealId];
    onFiltersChange({ ...filters, deal: newDeal });
  };

  const toggleWatchlist = (watchlistId: string) => {
    const newWatchlist = filters.watchlist.includes(watchlistId)
      ? filters.watchlist.filter((w) => w !== watchlistId)
      : [...filters.watchlist, watchlistId];
    onFiltersChange({ ...filters, watchlist: newWatchlist });
  };

  const toggleUnreadOnly = () => {
    onFiltersChange({ ...filters, unreadOnly: !filters.unreadOnly });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      materiality: [],
      eventType: [],
      deal: [],
      watchlist: [],
      unreadOnly: false,
    });
    onSearchChange("");
  };

  const eventTypes = [
    { id: "AGENCY", name: "Agency" },
    { id: "COURT", name: "Court" },
    { id: "FILING", name: "Filing" },
    { id: "SPREAD_MOVE", name: "Spread Move" },
    { id: "NEWS", name: "News" },
  ];

  const hasActiveFilters =
    filters.materiality.length > 0 ||
    filters.eventType.length > 0 ||
    filters.deal.length > 0 ||
    filters.watchlist.length > 0 ||
    filters.unreadOnly ||
    searchQuery.length > 0;

  return (
    <div className="space-y-3 border-b border-border py-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events..."
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filters:</span>
        </div>

        <div className="flex flex-1 items-center gap-2">
        <button
          onClick={() => toggleMateriality("HIGH")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filters.materiality.includes("HIGH")
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-surface text-text-muted border border-border hover:bg-surfaceHighlight"
          }`}
        >
          🔴 HIGH
        </button>
        <button
          onClick={() => toggleMateriality("MEDIUM")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filters.materiality.includes("MEDIUM")
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              : "bg-surface text-text-muted border border-border hover:bg-surfaceHighlight"
          }`}
        >
          🟠 MEDIUM
        </button>
        <button
          onClick={() => toggleMateriality("LOW")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filters.materiality.includes("LOW")
              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              : "bg-surface text-text-muted border border-border hover:bg-surfaceHighlight"
          }`}
        >
          🟡 LOW
        </button>

        <div className="mx-2 h-4 w-px bg-border" />

        <VirtualizedDropdown
          label="Event Type"
          items={eventTypes}
          selectedIds={filters.eventType}
          onToggle={toggleEventType}
        />

        <VirtualizedDropdown
          label="Deal"
          items={deals}
          selectedIds={filters.deal}
          onToggle={toggleDeal}
        />

        <VirtualizedDropdown
          label="Watchlist"
          items={watchlists}
          selectedIds={filters.watchlist}
          onToggle={toggleWatchlist}
        />

        <div className="mx-2 h-4 w-px bg-border" />

        <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surfaceHighlight cursor-pointer">
          <input
            type="checkbox"
            checked={filters.unreadOnly}
            onChange={toggleUnreadOnly}
            className="h-3 w-3 rounded border-border bg-surface text-primary-500 focus:ring-primary-500"
          />
          Unread Only
        </label>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-main"
          >
            <X className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
