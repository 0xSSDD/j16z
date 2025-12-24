"use client";

import React, { useEffect, useState } from "react";
import { X, ExternalLink, Eye } from "lucide-react";
import { getAllEvents } from "@/lib/api";
import type { Event } from "@/lib/types";
import { format } from "date-fns";

interface InboxSidePanelProps {
  eventId: string;
  onClose: () => void;
}

export function InboxSidePanel({ eventId, onClose }: InboxSidePanelProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        const events = await getAllEvents();
        const found = events.find((e) => e.id === eventId);
        setEvent(found || null);
      } catch (error) {
        console.error("Failed to load event:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();

    // Auto-mark as read after 5 seconds
    const timer = setTimeout(() => {
      const { markEventAsRead } = require("@/lib/read-status");
      markEventAsRead(eventId);
      // Dispatch custom event to update unread badge
      window.dispatchEvent(new CustomEvent("inbox:unread-updated"));
    }, 5000);

    return () => clearTimeout(timer);
  }, [eventId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (loading) {
    return (
      <div className="w-[400px] border-l border-border bg-surface p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-3/4 rounded bg-surfaceHighlight" />
          <div className="h-4 w-1/2 rounded bg-surfaceHighlight" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-surfaceHighlight" />
            <div className="h-3 w-full rounded bg-surfaceHighlight" />
            <div className="h-3 w-2/3 rounded bg-surfaceHighlight" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-[400px] border-l border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-main">Event Not Found</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-text-muted">The requested event could not be found.</p>
      </div>
    );
  }

  return (
    <div className="w-[400px] border-l border-border bg-surface overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-border bg-surface p-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-text-main pr-8">{event.title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Date:</span>
            <span className="text-text-main">
              {format(new Date(event.timestamp), "MMM d, yyyy, h:mm a")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Event Type:</span>
            <span className="text-text-main">{event.type}</span>
          </div>
          {event.dealId && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Deal:</span>
              <span className="text-text-main">{event.dealId}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-bold text-text-main mb-2">SUMMARY</h3>
          <p className="text-sm text-text-muted leading-relaxed">
            {event.summary || "No summary available"}
          </p>
        </div>

        {event.content && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-text-main mb-2">DETAILS</h3>
            <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
              {event.content.slice(0, 500)}
              {event.content.length > 500 && "..."}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-bold text-text-main mb-3">SOURCE</h3>
          <a
            href="#"
            className="flex items-center gap-2 rounded-md border border-border bg-surfaceHighlight px-3 py-2 text-sm text-text-main transition-colors hover:border-primary-500/30 hover:bg-surfaceHighlight"
          >
            <ExternalLink className="h-4 w-4" />
            View Source Document
          </a>
        </div>

        {event.dealId && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-text-main mb-3">RELATED DEAL</h3>
            <a
              href={`/app/deals/${event.dealId}`}
              className="flex items-center gap-2 rounded-md border border-border bg-surfaceHighlight px-3 py-2 text-sm text-text-main transition-colors hover:border-primary-500/30 hover:bg-surfaceHighlight"
            >
              <Eye className="h-4 w-4" />
              View Deal Card
            </a>
          </div>
        )}

        <div className="border-t border-border pt-4 flex gap-2">
          <button className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight">
            Set Alert
          </button>
          <button className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight">
            Mark Read
          </button>
        </div>
      </div>
    </div>
  );
}
