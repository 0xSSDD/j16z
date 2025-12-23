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
  Plus,
  List,
  PenSquare,
} from "lucide-react";
import { MOCK_DEALS } from "@/lib/constants";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Page {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Command {
  id: string;
  name: string;
  category: "navigation" | "deal" | "action";
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recentCommands");
      if (stored) setRecentCommands(JSON.parse(stored));
    }
  }, []);

  const saveRecentCommand = (commandId: string) => {
    const updated = [commandId, ...recentCommands.filter(id => id !== commandId)].slice(0, 5);
    setRecentCommands(updated);
    localStorage.setItem("recentCommands", JSON.stringify(updated));
  };

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

  const commands: Command[] = [
    ...pages.map(page => ({
      id: `nav:${page.path}`,
      name: `Go to ${page.name}`,
      category: "navigation" as const,
      icon: page.icon,
      action: () => {
        router.push(page.path);
        saveRecentCommand(`nav:${page.path}`);
        onClose();
      },
    })),
    ...MOCK_DEALS.map(deal => ({
      id: `deal:${deal.id}`,
      name: `${deal.acquirerSymbol} / ${deal.symbol}`,
      category: "deal" as const,
      icon: TrendingUp,
      action: () => {
        router.push(`/app/deals/${deal.id}`);
        saveRecentCommand(`deal:${deal.id}`);
        onClose();
      },
    })),
    {
      id: "action:new-deal",
      name: "New Deal",
      category: "action" as const,
      icon: Plus,
      action: () => {
        router.push("/app/deals");
        saveRecentCommand("action:new-deal");
        onClose();
        setTimeout(() => {
          const event = new CustomEvent("openAddDealModal");
          window.dispatchEvent(event);
        }, 100);
      },
    },
    {
      id: "action:manage-watchlists",
      name: "Manage Watchlists",
      category: "action" as const,
      icon: List,
      action: () => {
        router.push("/app/deals");
        saveRecentCommand("action:manage-watchlists");
        onClose();
        setTimeout(() => {
          const event = new CustomEvent("openWatchlistModal");
          window.dispatchEvent(event);
        }, 100);
      },
    },
    {
      id: "action:generate-draft",
      name: "Generate Draft",
      category: "action" as const,
      icon: PenSquare,
      action: () => {
        const firstDeal = MOCK_DEALS[0];
        if (firstDeal) {
          router.push(`/app/deals/${firstDeal.id}/draft`);
          saveRecentCommand("action:generate-draft");
        }
        onClose();
      },
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  const recentItems = query === ""
    ? commands.filter(cmd => recentCommands.includes(cmd.id)).slice(0, 3)
    : [];

  const displayItems = query === "" && recentItems.length > 0 ? recentItems : filtered;

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setQuery("");
      setSelectedIndex(0);
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleSelect = (command: Command) => {
    command.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % displayItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + displayItems.length) % displayItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (displayItems[selectedIndex]) handleSelect(displayItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-black/50 pt-[15vh] backdrop-blur-sm"
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
            placeholder="Search commands, deals, or actions..."
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
        <div className="max-h-[400px] overflow-y-auto p-2">
          {query === "" && recentItems.length > 0 && (
            <div className="px-3 py-2 text-[10px] font-mono text-text-dim uppercase tracking-wide">
              Recent
            </div>
          )}
          {displayItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">
              No results found.
            </div>
          ) : (
            displayItems.map((command, idx) => (
              <div
                key={command.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  idx === selectedIndex
                    ? "bg-amber-500 text-zinc-950"
                    : "text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
                }`}
                onClick={() => handleSelect(command)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <command.icon
                  className={`h-4 w-4 ${idx === selectedIndex ? "text-zinc-950" : "text-text-dim"}`}
                />
                <span className="flex-1">{command.name}</span>
                {command.category === "deal" && (
                  <span className="text-[10px] font-mono opacity-60">Deal</span>
                )}
                {command.category === "action" && (
                  <span className="text-[10px] font-mono opacity-60">Action</span>
                )}
                {idx === selectedIndex && (
                  <div className="ml-2 font-mono text-[10px] opacity-80">
                    ⏎
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-surfaceHighlight/30 px-4 py-2">
          <span className="font-sans text-[10px] text-text-dim">
            ↑↓ navigate • ⏎ select • esc close
          </span>
          <span className="font-sans text-[10px] text-text-dim">
            J16Z Command
          </span>
        </div>
      </div>
    </div>
  );
};
