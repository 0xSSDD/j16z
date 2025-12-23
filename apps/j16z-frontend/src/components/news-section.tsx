"use client";

import * as React from "react";
import { MOCK_NEWS } from "@/lib/constants";

interface NewsSectionProps {
  dealId: string;
}

export function NewsSection({ dealId }: NewsSectionProps) {
  const news = MOCK_NEWS.filter((n) => n.dealId === dealId);
  const [notes, setNotes] = React.useState<{ [key: string]: string }>(() => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem(`news-notes-${dealId}`);
    return stored ? JSON.parse(stored) : {};
  });
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const saveNotes = (updated: { [key: string]: string }) => {
    localStorage.setItem(`news-notes-${dealId}`, JSON.stringify(updated));
  };

  const handleNoteChange = (newsId: string, note: string) => {
    const updated = { ...notes, [newsId]: note };
    setNotes(updated);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Auto-save after 2 seconds of no typing
    saveTimeoutRef.current = setTimeout(() => {
      saveNotes(updated);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, newsId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // Clear any pending auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Save immediately
      saveNotes(notes);

      // Optional: Show a brief "Saved" indicator
      e.currentTarget.blur();
    }
  };

  return (
    <div className="space-y-3">
      {news.length === 0 ? (
        <p className="text-sm text-text-muted font-mono">No news items available.</p>
      ) : (
        news.map((item) => (
          <div key={item.id} className="border border-border rounded-lg bg-surface p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-text-muted font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <span className="text-xs text-text-dim font-mono">•</span>
                  <span className="text-xs text-text-muted font-mono">{item.source}</span>
                </div>
                <h4 className="text-sm font-mono font-medium text-text-main mb-2">
                  {item.title}
                </h4>
                <p className="text-sm text-text-muted font-mono leading-relaxed mb-3">
                  {item.summary}
                </p>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-400 text-sm font-mono"
                >
                  →
                </a>
              )}
            </div>
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">
                Your Notes <span className="text-text-dim">(Enter to save, Shift+Enter for new line)</span>
              </label>
              <textarea
                value={notes[item.id] || ""}
                onChange={(e) => handleNoteChange(item.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                placeholder="Add your analysis notes..."
                className="w-full bg-background border border-border text-text-main font-mono text-sm p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={2}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
