"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InboxTimeline } from "@/components/inbox/inbox-timeline";
import { InboxSidePanel } from "@/components/inbox/inbox-side-panel";
import { InboxFilters } from "@/components/inbox/inbox-filters";
import { InboxHeader } from "@/components/inbox/inbox-header";
import { KeyboardHelpModal } from "@/components/keyboard-help-modal";

export default function InboxPage() {
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [filters, setFilters] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("inbox_filters");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return {
      materiality: [] as string[],
      eventType: [] as string[],
      deal: [] as string[],
      watchlist: [] as string[],
      unreadOnly: false,
    };
  });

  useEffect(() => {
    localStorage.setItem("inbox_filters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    let gPressed = false;
    let gTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Help modal (Shift + ?)
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setShowHelpModal(true);
        return;
      }

      // Close side panel with Esc
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedEventId(null);
        setShowHelpModal(false);
        return;
      }

      // g+x navigation shortcuts
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        gPressed = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => {
          gPressed = false;
        }, 1000);
        return;
      }

      if (gPressed) {
        e.preventDefault();
        switch (e.key) {
          case "i":
            router.push("/app/inbox");
            gPressed = false;
            break;
          case "d":
            router.push("/app/deals");
            gPressed = false;
            break;
          case "w":
            router.push("/app/watchlists");
            gPressed = false;
            break;
          case "s":
            router.push("/app/settings");
            gPressed = false;
            break;
        }
        return;
      }

      // Materiality filter toggles (only when not in input)
      if (e.key === "1" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const newMateriality = filters.materiality.includes("HIGH")
          ? filters.materiality.filter((t: string) => t !== "HIGH")
          : [...filters.materiality, "HIGH"];
        setFilters({ ...filters, materiality: newMateriality });
        return;
      }
      if (e.key === "2" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const newMateriality = filters.materiality.includes("MEDIUM")
          ? filters.materiality.filter((t: string) => t !== "MEDIUM")
          : [...filters.materiality, "MEDIUM"];
        setFilters({ ...filters, materiality: newMateriality });
        return;
      }
      if (e.key === "3" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const newMateriality = filters.materiality.includes("LOW")
          ? filters.materiality.filter((t: string) => t !== "LOW")
          : [...filters.materiality, "LOW"];
        setFilters({ ...filters, materiality: newMateriality });
        return;
      }

      // Mark as read (e key)
      if (e.key === "e" && selectedEventId && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const { markEventAsRead } = require("@/lib/read-status");
        markEventAsRead(selectedEventId);
        window.dispatchEvent(new CustomEvent("inbox:unread-updated"));
        return;
      }

      // View deal card (v key)
      if (e.key === "v" && selectedEventId && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const { getAllEvents } = require("@/lib/api");
        getAllEvents().then((events: any[]) => {
          const event = events.find((e) => e.id === selectedEventId);
          if (event?.dealId) {
            router.push(`/app/deals/${event.dealId}`);
          }
        });
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [filters, selectedEventId, router, showHelpModal]);

  return (
    <div className="flex h-full flex-col">
      <InboxHeader />

      <InboxFilters
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex flex-1 overflow-hidden">
        <InboxTimeline
          filters={filters}
          selectedEventId={selectedEventId}
          onEventSelect={setSelectedEventId}
          searchQuery={searchQuery}
          selectedIndex={selectedIndex}
          onIndexChange={setSelectedIndex}
        />

        {selectedEventId && (
          <InboxSidePanel
            eventId={selectedEventId}
            onClose={() => setSelectedEventId(null)}
          />
        )}
      </div>

      <KeyboardHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
