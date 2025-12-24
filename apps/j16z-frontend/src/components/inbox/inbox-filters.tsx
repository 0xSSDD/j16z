"use client";

import React, { useState, useEffect } from "react";
import { Filter, X, Search } from "lucide-react";
import { VirtualizedDropdown } from "@/components/ui/virtualized-dropdown";

interface InboxFiltersProps {
  filters: {
    severity: string[];
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

  // Ensure filters has severity property (migration from materiality)
  const safeFilters = {
    severity: filters.severity || [],
    eventType: filters.eventType || [],
    deal: filters.deal || [],
    watchlist: filters.watchlist || [],
    unreadOnly: filters.unreadOnly || false,
  };

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


  const toggleSeverity = (level: string) => {
    const newSeverity = safeFilters.severity.includes(level)
      ? safeFilters.severity.filter((l) => l !== level)
      : [...safeFilters.severity, level];
    onFiltersChange({ ...safeFilters, severity: newSeverity });
  };

  const toggleEventType = (type: string) => {
    const newEventType = safeFilters.eventType.includes(type)
      ? safeFilters.eventType.filter((t) => t !== type)
      : [...safeFilters.eventType, type];
    onFiltersChange({ ...safeFilters, eventType: newEventType });
  };

  const toggleDeal = (dealId: string) => {
    const newDeal = safeFilters.deal.includes(dealId)
      ? safeFilters.deal.filter((d) => d !== dealId)
      : [...safeFilters.deal, dealId];
    onFiltersChange({ ...safeFilters, deal: newDeal });
  };

  const toggleWatchlist = (watchlistId: string) => {
    const newWatchlist = safeFilters.watchlist.includes(watchlistId)
      ? safeFilters.watchlist.filter((w) => w !== watchlistId)
      : [...safeFilters.watchlist, watchlistId];
    onFiltersChange({ ...safeFilters, watchlist: newWatchlist });
  };

  const toggleUnreadOnly = () => {
    onFiltersChange({ ...safeFilters, unreadOnly: !safeFilters.unreadOnly });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      severity: [],
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

  const severityOptions = [
    { id: "CRITICAL", name: "🔴 Critical" },
    { id: "WARNING", name: "🟡 Warning" },
    { id: "INFO", name: "🟢 Info" },
  ];

  const hasActiveFilters =
    safeFilters.severity.length > 0 ||
    safeFilters.eventType.length > 0 ||
    safeFilters.deal.length > 0 ||
    safeFilters.watchlist.length > 0 ||
    safeFilters.unreadOnly ||
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
          <VirtualizedDropdown
            label="Severity"
            items={severityOptions}
            selectedIds={safeFilters.severity}
            onToggle={toggleSeverity}
          />

          <VirtualizedDropdown
            label="Event Type"
            items={eventTypes}
            selectedIds={safeFilters.eventType}
            onToggle={toggleEventType}
          />

          <VirtualizedDropdown
            label="Deal"
            items={deals}
            selectedIds={safeFilters.deal}
            onToggle={toggleDeal}
          />

          <VirtualizedDropdown
            label="Watchlist"
            items={watchlists}
            selectedIds={safeFilters.watchlist}
            onToggle={toggleWatchlist}
          />

          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surfaceHighlight">
            <input
              type="checkbox"
              checked={safeFilters.unreadOnly}
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
