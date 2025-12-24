"use client";

import { useState } from "react";
import { Plus, X, RefreshCw } from "lucide-react";
import { SimpleDropdown } from "@/components/ui/simple-dropdown";

interface RSSFeed {
  id: string;
  name: string;
  url: string;
  type: "builtin" | "custom";
  watchlists: string[];
  lastSync?: string;
}

export function RSSFeedsTab() {
  const [feeds, setFeeds] = useState<RSSFeed[]>([
    {
      id: "1",
      name: "SEC EDGAR Filings",
      url: "https://www.sec.gov/cgi-bin/browse-edgar",
      type: "builtin",
      watchlists: [],
      lastSync: "2 hours ago",
    },
    {
      id: "2",
      name: "FTC/DOJ Merger Reviews",
      url: "https://www.ftc.gov/news-events/news/press-releases",
      type: "builtin",
      watchlists: [],
      lastSync: "1 hour ago",
    },
    {
      id: "3",
      name: "CourtListener",
      url: "https://www.courtlistener.com/api/rest/v3/",
      type: "builtin",
      watchlists: [],
      lastSync: "30 minutes ago",
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedWatchlists, setNewFeedWatchlists] = useState<string[]>([]);
  const [validationError, setValidationError] = useState("");

  const watchlistOptions = [
    { id: "tech-deals", name: "Tech Deals" },
    { id: "healthcare", name: "Healthcare" },
    { id: "retail", name: "Retail" },
  ];

  const toggleWatchlist = (id: string) => {
    setNewFeedWatchlists(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleAddFeed = () => {
    if (!newFeedUrl) {
      setValidationError("URL is required");
      return;
    }

    try {
      new URL(newFeedUrl);
    } catch {
      setValidationError("Invalid URL format");
      return;
    }

    const newFeed: RSSFeed = {
      id: Date.now().toString(),
      name: new URL(newFeedUrl).hostname,
      url: newFeedUrl,
      type: "custom",
      watchlists: newFeedWatchlists,
      lastSync: "Never",
    };

    setFeeds(prev => [...prev, newFeed]);
    setShowAddModal(false);
    setNewFeedUrl("");
    setNewFeedWatchlists([]);
    setValidationError("");
  };

  const handleDeleteFeed = (id: string) => {
    setFeeds(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Built-in Feeds */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-main">Built-in Feeds</h2>
          <p className="text-sm text-text-muted">Official data sources monitored automatically</p>
        </div>

        <div className="space-y-3">
          {feeds.filter(f => f.type === "builtin").map((feed) => (
            <div
              key={feed.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <p className="font-medium text-text-main">{feed.name}</p>
                <p className="text-xs text-text-muted">Last synced: {feed.lastSync}</p>
              </div>
              <button className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight">
                <RefreshCw className="h-3 w-3" />
                Sync Now
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Custom Feeds */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-main">Custom Feeds</h2>
            <p className="text-sm text-text-muted">Add your own RSS feeds to monitor</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Add Custom Feed
          </button>
        </div>

        {feeds.filter(f => f.type === "custom").length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">No custom feeds configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feeds.filter(f => f.type === "custom").map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-text-main">{feed.name}</p>
                  <p className="text-xs text-text-muted">{feed.url}</p>
                  {feed.watchlists.length > 0 && (
                    <p className="mt-1 text-xs text-text-dim">
                      Watchlists: {feed.watchlists.join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">Last synced: {feed.lastSync}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Feed Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-main">Add Custom RSS Feed</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-main">
                  Feed URL
                </label>
                <input
                  type="url"
                  value={newFeedUrl}
                  onChange={(e) => {
                    setNewFeedUrl(e.target.value);
                    setValidationError("");
                  }}
                  placeholder="https://example.com/feed.xml"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {validationError && (
                  <p className="mt-1 text-xs text-red-500">{validationError}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-main">
                  Associate with Watchlists
                </label>
                <p className="mb-3 text-xs text-text-muted">
                  Link this feed to specific watchlists for filtering
                </p>
                <SimpleDropdown
                  label="Watchlists"
                  items={watchlistOptions}
                  selectedIds={newFeedWatchlists}
                  onToggle={toggleWatchlist}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddFeed}
                  className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                >
                  Add Feed
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewFeedUrl("");
                    setNewFeedWatchlists([]);
                    setValidationError("");
                  }}
                  className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
