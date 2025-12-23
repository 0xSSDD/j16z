"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  FileText,
  Settings,
  Search,
  MessageSquareText,
  TrendingUp,
  ShieldAlert,
  Bell,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Page {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const pages: Page[] = [
    { name: "Dashboard", path: "/app", icon: LayoutDashboard },
    { name: "Live Monitor", path: "/app/feed", icon: Radio },
    { name: "Deals", path: "/app/deals", icon: TrendingUp },
    { name: "Discovery", path: "/app/discovery", icon: Search },
    { name: "Notifications", path: "/app/notifications", icon: Bell },
    { name: "Deal Intelligence", path: "/app/intelligence", icon: FileText },
    { name: "AI Analyst", path: "/app/chat", icon: MessageSquareText },
    { name: "Prediction Markets", path: "/app/markets", icon: TrendingUp },
    { name: "Risk Radar", path: "/app/risk", icon: ShieldAlert },
    { name: "Settings", path: "/app/settings", icon: Settings },
  ];

  const filtered = pages.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state when opened
    const timer = setTimeout(() => {
      setQuery("");
      setSelectedIndex(0);
    }, 0);
    
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleSelect = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex].path);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg animate-in fade-in slide-in-from-top-4 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-border bg-background/50 px-4 py-3">
          <Search className="mr-3 h-5 w-5 text-text-muted" />
          <input
            autoFocus
            className="flex-1 border-none bg-transparent text-sm font-sans text-text-main outline-none placeholder:text-text-dim"
            placeholder="Go to..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="rounded border border-border bg-surfaceHighlight px-2 py-0.5 font-mono text-[10px] text-text-muted">
            ESC
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">
              No results found.
            </div>
          ) : (
            filtered.map((page, idx) => (
              <div
                key={page.path}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  idx === selectedIndex
                    ? "bg-primary-500 text-white"
                    : "text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
                }`}
                onClick={() => handleSelect(page.path)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <page.icon
                  className={`h-4 w-4 ${idx === selectedIndex ? "text-white" : "text-text-dim"}`}
                />
                {page.name}
                {idx === selectedIndex && (
                  <div className="ml-auto font-mono text-[10px] opacity-80">
                    ⏎
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-surfaceHighlight/30 px-4 py-2">
          <span className="font-sans text-[10px] text-text-dim">
            Use arrows to navigate
          </span>
          <span className="font-sans text-[10px] text-text-dim">
            J16Z Command
          </span>
        </div>
      </div>
    </div>
  );
};
