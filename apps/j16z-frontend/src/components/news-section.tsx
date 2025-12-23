"use client";

import * as React from "react";
import { MOCK_NEWS } from "@/lib/constants";
import type { NewsItem } from "@/lib/types";

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

  const handleNoteChange = (newsId: string, note: string) => {
    const updated = { ...notes, [newsId]: note };
    setNotes(updated);

    setTimeout(() => {
      localStorage.setItem(`news-notes-${dealId}`, JSON.stringify(updated));
    }, 5000);
  };

  return (
    <div className="space-y-3">
      {news.length === 0 ? (
        <p className="text-sm text-zinc-500 font-mono">No news items available.</p>
      ) : (
        news.map((item) => (
          <div key={item.id} className="border border-zinc-800 rounded-lg bg-zinc-900 p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-zinc-500 font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-600 font-mono">•</span>
                  <span className="text-xs text-zinc-400 font-mono">{item.source}</span>
                </div>
                <h4 className="text-sm font-mono font-medium text-zinc-100 mb-2">
                  {item.title}
                </h4>
                <p className="text-sm text-zinc-400 font-mono leading-relaxed mb-3">
                  {item.summary}
                </p>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:text-amber-400 text-sm font-mono"
                >
                  →
                </a>
              )}
            </div>
            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-1">Your Notes</label>
              <textarea
                value={notes[item.id] || ""}
                onChange={(e) => handleNoteChange(item.id, e.target.value)}
                placeholder="Add your analysis notes..."
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-sm p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                rows={2}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
