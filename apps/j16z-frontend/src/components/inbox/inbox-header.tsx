"use client";

import React from "react";
import { CheckCheck } from "lucide-react";

export function InboxHeader() {
  const handleMarkAllRead = () => {
    if (confirm("Mark all events as read?")) {
      // TODO: Implement mark all as read
      console.log("Mark all read");
    }
  };

  return (
    <div className="border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Inbox</h1>
          <p className="text-sm text-text-muted">
            Unified event timeline with materiality scoring
          </p>
          <p className="mt-1 text-xs text-text-dim">
            Press <kbd className="rounded border border-border bg-surfaceHighlight px-1 font-mono">?</kbd> for keyboard shortcuts
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
        >
          <CheckCheck className="h-4 w-4" />
          Mark All Read
        </button>
      </div>
    </div>
  );
}
