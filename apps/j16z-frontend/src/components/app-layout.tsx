"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CommandPalette } from "@/components/command-palette";
import {
  Inbox,
  Settings as SettingsIcon,
  Search,
  Bell,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  List,
  Zap,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

type SidebarIconComponent = React.ComponentType<{
  className?: string;
}>;

const SidebarItem = ({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  icon: SidebarIconComponent;
  label: string;
  badge?: number;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`group mx-2 flex items-center gap-3 rounded-md px-4 py-2.5 text-xs font-medium transition-all duration-200 font-sans ${
        isActive
          ? "border border-border/50 bg-surfaceHighlight text-text-main shadow-sm"
          : "text-text-muted hover:bg-surfaceHighlight/50 hover:text-text-main"
      }`}
    >
      <Icon className="h-4 w-4 opacity-70 group-hover:opacity-100" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
};

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-zinc-700 bg-gradient-to-br from-zinc-800 to-black shadow-inner">
      <div className="flex h-3.5 items-end gap-[2px]">
        <div className="h-2 w-1 rounded-sm bg-primary-500/40" />
        <div className="h-3.5 w-1 rounded-sm bg-primary-500" />
        <div className="h-2.5 w-1 rounded-sm bg-primary-500/70" />
      </div>
    </div>
    <div className="flex flex-col">
      <span className="font-sans text-base font-bold leading-none tracking-tight text-text-main">
        J16Z
      </span>
      <span className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-text-dim">
        Terminal
      </span>
    </div>
  </div>
);

export const AppLayout: React.FC<LayoutProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    if (shouldBeDark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }

    // Use setTimeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      setIsDarkMode(shouldBeDark);
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isDarkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDarkMode, mounted]);

  useEffect(() => {
    // Command Palette keyboard shortcut
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdKOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    // Update unread count from localStorage
    const updateUnreadCount = async () => {
      try {
        const { getAllEvents } = await import("@/lib/api");
        const { getReadEvents } = await import("@/lib/read-status");

        const events = await getAllEvents();
        const readEvents = getReadEvents();
        const unread = events.filter((e) => !readEvents.has(e.id)).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error("Failed to update unread count:", error);
      }
    };

    updateUnreadCount();

    // Listen for custom event to update badge
    const handleUnreadUpdate = () => updateUnreadCount();
    window.addEventListener("inbox:unread-updated", handleUnreadUpdate);

    return () => {
      window.removeEventListener("inbox:unread-updated", handleUnreadUpdate);
    };
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (!newMode) {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  };

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <>
      <CommandPalette isOpen={isCmdKOpen} onClose={() => setIsCmdKOpen(false)} />

      <div className="flex h-screen overflow-hidden bg-background font-sans text-text-muted transition-colors duration-300">
      <aside className="flex w-64 flex-col border-r border-border bg-background pt-2">
        <div className="mb-2 flex items-center justify-between px-6 py-4">
          <Logo />
        </div>

        <div className="mb-4 px-4">
          <button
            onClick={() => setIsCmdKOpen(true)}
            className="group flex w-full items-center gap-2 rounded-lg border border-border bg-surfaceHighlight/50 px-3 py-2 text-xs text-text-muted transition-colors hover:border-primary-500/30 hover:text-text-main"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Jump to...</span>
            <div className="ml-auto flex items-center gap-0.5 rounded border border-border px-1 font-mono text-[10px] text-text-dim group-hover:border-primary-500/30">
              <span>⌘</span><span>K</span>
            </div>
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          <div className="px-6 pb-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-text-dim">
            Platform
          </div>
          <SidebarItem href="/app/inbox" icon={Inbox} label="Inbox" badge={unreadCount} />
          <SidebarItem href="/app/deals" icon={TrendingUp} label="Deals" />
          <SidebarItem href="/app/watchlists" icon={List} label="Watchlists" />
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <SidebarItem
            href="/app/settings"
            icon={SettingsIcon}
            label="System Config"
          />
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/50 bg-surface px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-tr from-primary-500 to-amber-600 text-xs font-bold text-white shadow-sm">
              DA
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-bold text-text-main">
                David&apos;s Analyst
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
                Connected
              </span>
            </div>
          </div>

          <div className="mt-2 flex gap-1">
            <button
              onClick={toggleTheme}
              className="flex flex-1 items-center justify-center rounded-md py-1.5 text-text-dim transition-colors hover:bg-surfaceHighlight hover:text-text-main"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center rounded-md py-1.5 text-text-dim transition-colors hover:bg-surfaceHighlight hover:text-rose-500"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
          <div className="flex flex-1 items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-text-dim">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              SYSTEM_NOMINAL
              <span className="text-border">/</span>
              <span className="text-text-muted">LATENCY: 12ms</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1">
              <Zap className="h-3 w-3 fill-primary-500 text-primary-500" />
              <span className="text-xs font-bold text-text-main">Pro Plan</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <button className="relative rounded-full p-2 text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-primary-500">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full border border-background bg-primary-500" />
            </button>
          </div>
        </header>

        <main className="z-10 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
    </>
  );
};
