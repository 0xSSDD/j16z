"use client";

import React, { useEffect, useState } from "react";
import { getAllEvents } from "@/lib/api";
import { calculateSeverityWithLevel, EventType } from "@/lib/severity-scoring";
import type { Event } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface InboxTimelineProps {
  filters: {
    severity: string[];
    eventType: string[];
    deal: string[];
    watchlist: string[];
    unreadOnly: boolean;
  };
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  searchQuery?: string;
  selectedIndex?: number;
  onIndexChange?: (index: number) => void;
}

interface EnrichedEvent extends Event {
  severityScore: number;
  severityLevel: string;
  severityBadge: string;
  isRead: boolean;
}

// Helper function to get severity order for sorting
const getSeverityOrder = (severity: string): number => {
  switch (severity) {
    case "CRITICAL":
      return 3;
    case "WARNING":
      return 2;
    case "INFO":
      return 1;
    default:
      return 0;
  }
};

export function InboxTimeline({
  filters,
  selectedEventId,
  onEventSelect,
  searchQuery = "",
  selectedIndex = 0,
  onIndexChange,
}: InboxTimelineProps) {
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadEvents() {
      try {
        const rawEvents = await getAllEvents();

        // Enrich events with severity scores
        const enriched = rawEvents.map((event) => {
          const { score, level, badge } = calculateSeverityWithLevel({
            type: event.type as EventType,
            subtype: event.subtype,
            daysToOutsideDate: 45, // TODO: Calculate from deal data
            spreadMoveBps: 0, // TODO: Get from event data if SPREAD_MOVE
          });

          return {
            ...event,
            severityScore: score,
            severityLevel: level,
            severityBadge: badge,
            isRead: false, // TODO: Get from localStorage
          };
        });

        // Sort by severity (descending), then timestamp (descending)
        enriched.sort((a, b) => {
          const aSeverity = a.severityLevel || a.severity || "INFO";
          const bSeverity = b.severityLevel || b.severity || "INFO";

          if (getSeverityOrder(bSeverity) !== getSeverityOrder(aSeverity)) {
            return getSeverityOrder(bSeverity) - getSeverityOrder(aSeverity);
          }
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        setEvents(enriched);
      } catch (error) {
        console.error("Failed to load events:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery]);

  // Apply filters and search
  const filteredEvents = events.filter((event) => {
    // Severity filter (with safe fallback for migration)
    const severity = filters.severity || [];
    if (severity.length > 0 && !severity.includes(event.severity)) {
      return false;
    }
    if (filters.eventType.length > 0 && !filters.eventType.includes(event.type)) {
      return false;
    }
    if (filters.deal.length > 0 && !filters.deal.includes(event.dealId)) {
      return false;
    }
    // TODO: Implement watchlist filtering when event-watchlist relationship is available
    if (filters.unreadOnly && event.isRead) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = event.title.toLowerCase().includes(query);
      const matchesSummary = event.summary?.toLowerCase().includes(query);
      const matchesType = event.type.toLowerCase().includes(query);
      if (!matchesTitle && !matchesSummary && !matchesType) {
        return false;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = Math.min(selectedIndex + 1, filteredEvents.length - 1);
        if (onIndexChange) onIndexChange(newIndex);
        if (filteredEvents[newIndex]) {
          onEventSelect(filteredEvents[newIndex].id);
          setTimeout(() => {
            const element = document.getElementById(`event-${filteredEvents[newIndex].id}`);
            element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 0);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = Math.max(selectedIndex - 1, 0);
        if (onIndexChange) onIndexChange(newIndex);
        if (filteredEvents[newIndex]) {
          onEventSelect(filteredEvents[newIndex].id);
          setTimeout(() => {
            const element = document.getElementById(`event-${filteredEvents[newIndex].id}`);
            element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 0);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, onIndexChange, onEventSelect, filteredEvents]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto border-r border-border p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    );
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "text-red-500";
      case "WARNING":
        return "text-yellow-500";
      case "INFO":
        return "text-green-500";
      default:
        return "text-text-muted";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "🔴";
      case "WARNING":
        return "🟡";
      case "INFO":
        return "🟢";
      default:
        return "⚪";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto border-r border-border">
      <div className="space-y-2 p-4">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-text-muted">No events match your filters</p>
          </div>
        ) : (
          <>
            {paginatedEvents.map((event, idx) => (
              <button
                key={event.id}
                id={`event-${event.id}`}
                onClick={() => {
                  onEventSelect(event.id);
                  if (onIndexChange) onIndexChange(idx);
                }}
                className={`w-full rounded-lg border p-4 text-left transition-all ${
                  selectedEventId === event.id
                    ? "border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/20"
                    : "border-border bg-surface hover:border-border/80 hover:bg-surfaceHighlight"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">
                    {event.isRead ? "○" : "●"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${getSeverityColor(event.severity)}`}>
                        {getSeverityIcon(event.severity)} {event.severity}
                      </span>
                      <span className="text-xs text-text-muted">
                        {event.type}
                      </span>
                      <span className="text-xs text-text-dim">•</span>
                      <span className="text-xs text-text-dim">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm text-text-main mb-1 truncate">
                      {event.title}
                    </h3>
                    <p className="text-xs text-text-muted line-clamp-2">
                      {event.summary || "No summary available"}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4 mt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageSizeChange(20)}
                  className={`rounded border px-3 py-1 text-sm font-medium transition-colors ${
                    pageSize === 20
                      ? "border-primary-500 bg-primary-500/10 text-primary-400"
                      : "border-border bg-surface text-text-main hover:bg-surfaceHighlight"
                  }`}
                >
                  20
                </button>
                <button
                  onClick={() => handlePageSizeChange(30)}
                  className={`rounded border px-3 py-1 text-sm font-medium transition-colors ${
                    pageSize === 30
                      ? "border-primary-500 bg-primary-500/10 text-primary-400"
                      : "border-border bg-surface text-text-main hover:bg-surfaceHighlight"
                  }`}
                >
                  30
                </button>
                <button
                  onClick={() => handlePageSizeChange(50)}
                  className={`rounded border px-3 py-1 text-sm font-medium transition-colors ${
                    pageSize === 50
                      ? "border-primary-500 bg-primary-500/10 text-primary-400"
                      : "border-border bg-surface text-text-main hover:bg-surfaceHighlight"
                  }`}
                >
                  50
                </button>
                <span className="text-sm text-text-muted">per page</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded border border-border bg-surface px-3 py-1 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span className="text-sm text-text-main">
                  Page {currentPage} of {Math.max(1, totalPages)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded border border-border bg-surface px-3 py-1 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
