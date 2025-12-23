"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MOCK_EVENTS } from "@/lib/constants";
import type { Event } from "@/lib/types";

export function NotificationsInbox() {
  const router = useRouter();
  const [events, setEvents] = React.useState<Event[]>(MOCK_EVENTS);
  const [filter, setFilter] = React.useState<string>("all");
  const [readEvents, setReadEvents] = React.useState<Set<string>>(new Set());

  const filteredEvents = React.useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const toggleRead = (eventId: string) => {
    setReadEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const markAllRead = () => {
    setReadEvents(new Set(events.map((e) => e.id)));
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-zinc-100">Notifications</h1>
          <p className="text-sm text-zinc-500 font-mono mt-1">
            {filteredEvents.length} events • {events.length - readEvents.size} unread
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md font-mono text-sm transition-colors"
        >
          Mark All Read
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "FILING", "COURT", "AGENCY", "SPREAD_MOVE", "NEWS"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-md font-mono text-xs transition-colors ${
              filter === type
                ? "bg-amber-500 text-zinc-950"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {type === "all" ? "All" : type}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredEvents.map((event) => {
          const isRead = readEvents.has(event.id);
          return (
            <div
              key={event.id}
              className={`border border-zinc-800 rounded-lg p-4 transition-colors ${
                isRead ? "bg-zinc-950/50" : "bg-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-zinc-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono ${
                        event.materiality === "HIGH"
                          ? "bg-red-500/10 text-red-500"
                          : event.materiality === "MEDIUM"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-zinc-500/10 text-zinc-500"
                      }`}
                    >
                      {event.materiality}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-400">
                      {event.type}
                    </span>
                  </div>
                  <h3
                    className={`font-mono text-sm mb-2 ${
                      isRead ? "text-zinc-500" : "text-zinc-100 font-medium"
                    }`}
                  >
                    {event.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{event.summary}</p>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => router.push(`/app/deals/${event.dealId}`)}
                      className="text-xs text-amber-500 hover:text-amber-400 font-mono"
                    >
                      View Deal →
                    </button>
                    {event.sourceUrl && (
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-500 hover:text-amber-400 font-mono"
                      >
                        Source →
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleRead(event.id)}
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-300"
                >
                  {isRead ? "Mark Unread" : "Mark Read"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
