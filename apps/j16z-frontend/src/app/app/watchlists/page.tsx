"use client";

import React, { useState, useEffect } from "react";
import { Plus, List as ListIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Watchlist {
  id: string;
  name: string;
  dealCount: number;
  createdAt: string;
}

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Load watchlists from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("watchlists");
      if (stored) {
        setWatchlists(JSON.parse(stored));
      }
    }
  }, []);

  const handleCreateWatchlist = () => {
    const name = prompt("Enter watchlist name:");
    if (name) {
      const newWatchlist: Watchlist = {
        id: `watchlist-${Date.now()}`,
        name,
        dealCount: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = [...watchlists, newWatchlist];
      setWatchlists(updated);
      localStorage.setItem("watchlists", JSON.stringify(updated));
    }
  };

  const handleDeleteWatchlist = (id: string) => {
    if (confirm("Delete this watchlist?")) {
      const updated = watchlists.filter((w) => w.id !== id);
      setWatchlists(updated);
      localStorage.setItem("watchlists", JSON.stringify(updated));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Watchlists</h1>
          <p className="mt-1 text-sm text-text-muted">
            Organize and track deals by custom groups
          </p>
        </div>
        <button
          onClick={handleCreateWatchlist}
          className="flex items-center gap-2 rounded-lg border border-border bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Create Watchlist
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {watchlists.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <ListIcon className="h-12 w-12 text-text-dim mb-4" />
            <p className="text-sm text-text-muted">No watchlists yet</p>
            <p className="text-xs text-text-dim mt-1">
              Create a watchlist to organize your deals
            </p>
          </div>
        ) : (
          watchlists.map((watchlist) => (
            <div
              key={watchlist.id}
              className="group relative rounded-lg border border-border bg-surface p-6 transition-all hover:border-primary-500/30 hover:shadow-lg cursor-pointer"
              onClick={() => router.push(`/app/watchlists/${watchlist.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-main mb-2">
                    {watchlist.name}
                  </h3>
                  <p className="text-sm text-text-muted">
                    {watchlist.dealCount} {watchlist.dealCount === 1 ? "deal" : "deals"}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWatchlist(watchlist.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 rounded-md p-2 text-text-muted transition-all hover:bg-surfaceHighlight hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
