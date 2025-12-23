"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Watchlist {
  id: string;
  name: string;
  description: string;
  dealIds: string[];
  createdAt: string;
}

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (watchlists: Watchlist[]) => void;
}

export function WatchlistModal({ isOpen, onClose, onSave }: WatchlistModalProps) {
  const [watchlists, setWatchlists] = React.useState<Watchlist[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("watchlists");
    return stored ? JSON.parse(stored) : [];
  });
  const [newName, setNewName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");

  const handleAddWatchlist = () => {
    if (!newName.trim()) return;

    const newWatchlist: Watchlist = {
      id: `watchlist-${Date.now()}`,
      name: newName.trim(),
      description: newDescription.trim(),
      dealIds: [],
      createdAt: new Date().toISOString(),
    };

    const updated = [...watchlists, newWatchlist];
    setWatchlists(updated);
    localStorage.setItem("watchlists", JSON.stringify(updated));
    onSave(updated);
    setNewName("");
    setNewDescription("");
  };

  const handleDeleteWatchlist = (id: string) => {
    const updated = watchlists.filter((w) => w.id !== id);
    setWatchlists(updated);
    localStorage.setItem("watchlists", JSON.stringify(updated));
    onSave(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-zinc-100">Manage Watchlists</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-mono font-medium text-zinc-400">Create New Watchlist</h3>
            <div className="space-y-2">
              <Input
                placeholder="Watchlist Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono"
              />
              <Input
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono"
              />
              <button
                onClick={handleAddWatchlist}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-md font-mono text-sm transition-colors"
              >
                + Add Watchlist
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-mono font-medium text-zinc-400">Your Watchlists</h3>
            {watchlists.length === 0 ? (
              <p className="text-sm text-zinc-500 font-mono">No watchlists yet. Create one above.</p>
            ) : (
              <div className="space-y-2">
                {watchlists.map((watchlist) => (
                  <div
                    key={watchlist.id}
                    className="flex items-start justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium text-zinc-100">
                        {watchlist.name}
                      </div>
                      {watchlist.description && (
                        <div className="text-xs text-zinc-500 font-mono mt-1">
                          {watchlist.description}
                        </div>
                      )}
                      <div className="text-xs text-zinc-600 font-mono mt-1">
                        {watchlist.dealIds.length} deals
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteWatchlist(watchlist.id)}
                      className="text-red-500 hover:text-red-400 text-sm font-mono"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
