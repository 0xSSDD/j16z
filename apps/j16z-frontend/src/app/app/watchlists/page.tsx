"use client";

import React, { useState, useEffect } from "react";
import { Plus, List as ListIcon, Trash2, Edit2, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Watchlist {
  id: string;
  name: string;
  description?: string;
  dealCount: number;
  createdAt: string;
}

interface WatchlistModalProps {
  isOpen: boolean;
  watchlist: Watchlist | null;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

function WatchlistModal({ isOpen, watchlist, onClose, onSave }: WatchlistModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (watchlist) {
      setName(watchlist.name);
      setDescription(watchlist.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [watchlist, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-main">
            {watchlist ? "Edit Watchlist" : "Create Watchlist"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech Deals, High Priority, Q1 2024"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder-text-dim focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this watchlist..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder-text-dim focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              {watchlist ? "Save Changes" : "Create Watchlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Load watchlists from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("watchlists");
      if (stored) {
        try {
          setWatchlists(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  const handleSaveWatchlist = (name: string, description: string) => {
    if (editingWatchlist) {
      // Edit existing
      const updated = watchlists.map(w =>
        w.id === editingWatchlist.id
          ? { ...w, name, description }
          : w
      );
      setWatchlists(updated);
      localStorage.setItem("watchlists", JSON.stringify(updated));
      setEditingWatchlist(null);
    } else {
      // Create new
      const newWatchlist: Watchlist = {
        id: `watchlist-${Date.now()}`,
        name,
        description,
        dealCount: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = [...watchlists, newWatchlist];
      setWatchlists(updated);
      localStorage.setItem("watchlists", JSON.stringify(updated));
    }
  };

  const handleDeleteWatchlist = (id: string) => {
    if (confirm("Delete this watchlist? This action cannot be undone.")) {
      const updated = watchlists.filter((w) => w.id !== id);
      setWatchlists(updated);
      localStorage.setItem("watchlists", JSON.stringify(updated));
    }
  };

  const handleEditWatchlist = (watchlist: Watchlist) => {
    setEditingWatchlist(watchlist);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditingWatchlist(null);
    setShowModal(true);
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
          onClick={handleCreateNew}
          className="flex items-center gap-2 rounded-lg border border-border bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Create Watchlist
        </button>
      </div>

      <WatchlistModal
        isOpen={showModal}
        watchlist={editingWatchlist}
        onClose={() => {
          setShowModal(false);
          setEditingWatchlist(null);
        }}
        onSave={handleSaveWatchlist}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {watchlists.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <ListIcon className="mb-4 h-12 w-12 text-text-dim" />
            <p className="text-sm text-text-muted">No watchlists yet</p>
            <p className="mt-1 text-xs text-text-dim">
              Create a watchlist to organize your deals
            </p>
          </div>
        ) : (
          watchlists.map((watchlist) => (
            <div
              key={watchlist.id}
              className="group relative cursor-pointer rounded-lg border border-border bg-surface p-6 transition-all hover:border-primary-500/30 hover:shadow-lg"
              onClick={() => router.push(`/app/watchlists/${watchlist.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-bold text-text-main">
                    {watchlist.name}
                  </h3>
                  {watchlist.description && (
                    <p className="mb-2 text-xs text-text-dim line-clamp-2">
                      {watchlist.description}
                    </p>
                  )}
                  <p className="text-sm text-text-muted">
                    {watchlist.dealCount} {watchlist.dealCount === 1 ? "deal" : "deals"}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditWatchlist(watchlist);
                    }}
                    className="rounded-md p-2 text-text-muted transition-all hover:bg-surfaceHighlight hover:text-text-main"
                    title="Edit watchlist"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWatchlist(watchlist.id);
                    }}
                    className="rounded-md p-2 text-text-muted transition-all hover:bg-surfaceHighlight hover:text-rose-500"
                    title="Delete watchlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
