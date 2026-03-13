'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, ExternalLink, Pause, Play, Plus, Rss, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRSSFeed, deleteRSSFeed, getRSSFeeds, type RSSFeedRecord, updateRSSFeed } from '@/lib/api';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  paused: { label: 'Paused', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export function RSSFeedsTab() {
  const [feeds, setFeeds] = useState<RSSFeedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchFeeds() {
      try {
        const data = await getRSSFeeds();
        if (!cancelled) setFeeds(data);
      } catch (error) {
        if (!cancelled) console.error('Failed to load RSS feeds:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFeeds();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddFeed = async () => {
    if (!newFeedName.trim()) {
      setValidationError('Name is required');
      return;
    }
    if (!newFeedUrl.trim()) {
      setValidationError('URL is required');
      return;
    }

    try {
      new URL(newFeedUrl);
    } catch {
      setValidationError('Invalid URL format');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createRSSFeed({ name: newFeedName.trim(), url: newFeedUrl.trim() });
      setFeeds((prev) => [...prev, created]);
      handleCloseModal();
    } catch (_error) {
      setValidationError('Failed to add feed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeed = async (id: string) => {
    try {
      await deleteRSSFeed(id);
      setFeeds((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Failed to delete feed:', error);
    }
  };

  const handleTogglePause = async (feed: RSSFeedRecord) => {
    const newStatus = feed.status === 'paused' ? 'active' : 'paused';
    try {
      const updated = await updateRSSFeed(feed.id, { status: newStatus });
      setFeeds((prev) => prev.map((f) => (f.id === feed.id ? updated : f)));
    } catch (error) {
      console.error('Failed to update feed:', error);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setNewFeedName('');
    setNewFeedUrl('');
    setValidationError('');
  };

  useEffect(() => {
    if (!showAddModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setNewFeedName('');
        setNewFeedUrl('');
        setValidationError('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddModal]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface" />
        ))}
      </div>
    );
  }

  const activeFeeds = feeds.filter((f) => f.status === 'active');
  const pausedFeeds = feeds.filter((f) => f.status === 'paused');
  const errorFeeds = feeds.filter((f) => f.status === 'error');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-main">RSS Feeds</h2>
          <p className="text-sm text-text-muted">
            {feeds.length} feed{feeds.length !== 1 ? 's' : ''} configured
            {activeFeeds.length > 0 && <span className="text-green-400"> · {activeFeeds.length} active</span>}
            {pausedFeeds.length > 0 && <span className="text-yellow-400"> · {pausedFeeds.length} paused</span>}
            {errorFeeds.length > 0 && <span className="text-red-400"> · {errorFeeds.length} error</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Add Feed
        </button>
      </div>

      {feeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-16">
          <Rss className="h-10 w-10 text-text-dim mb-3" />
          <p className="text-sm text-text-muted mb-1">No RSS feeds configured</p>
          <p className="text-xs text-text-dim">Add a feed to start ingesting news articles</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feeds.map((feed) => {
            const statusStyle = STATUS_STYLES[feed.status] ?? STATUS_STYLES.error;

            return (
              <div
                key={feed.id}
                className={`flex items-center justify-between rounded-lg border bg-surface p-4 transition-colors hover:bg-surfaceHighlight ${
                  feed.status === 'error' ? 'border-red-500/20' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${statusStyle.bg}`}
                  >
                    {feed.status === 'error' ? (
                      <AlertCircle className={`h-4 w-4 ${statusStyle.color}`} />
                    ) : (
                      <Rss className={`h-4 w-4 ${statusStyle.color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-medium text-sm text-text-main truncate">{feed.name}</h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${statusStyle.bg} ${statusStyle.color}`}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <a
                      href={feed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 text-xs text-text-dim hover:text-text-muted font-mono truncate max-w-md"
                    >
                      {feed.url}
                      <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-text-muted">
                      <span>
                        Last sync:{' '}
                        <span className="text-text-main font-mono">
                          {feed.lastSyncAt
                            ? formatDistanceToNow(new Date(feed.lastSyncAt), { addSuffix: true })
                            : 'Never'}
                        </span>
                      </span>
                      <span>
                        Items: <span className="text-text-main font-mono">{feed.itemCount}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                  <button
                    type="button"
                    onClick={() => handleTogglePause(feed)}
                    className="rounded-md border border-border bg-background p-2 text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-main"
                    title={feed.status === 'paused' ? 'Resume' : 'Pause'}
                  >
                    {feed.status === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="rounded-md border border-border bg-background p-2 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Remove feed"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md rounded-lg border border-border bg-surface p-6"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="mb-4 text-lg font-semibold text-text-main">Add RSS Feed</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="rss-feed-name" className="mb-2 block text-sm font-medium text-text-main">
                  Feed Name
                </label>
                <input
                  id="rss-feed-name"
                  type="text"
                  value={newFeedName}
                  onChange={(e) => {
                    setNewFeedName(e.target.value);
                    setValidationError('');
                  }}
                  placeholder="Bloomberg M&A Wire"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="rss-feed-url" className="mb-2 block text-sm font-medium text-text-main">
                  Feed URL
                </label>
                <input
                  id="rss-feed-url"
                  type="url"
                  value={newFeedUrl}
                  onChange={(e) => {
                    setNewFeedUrl(e.target.value);
                    setValidationError('');
                  }}
                  placeholder="https://example.com/feed.xml"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {validationError && <p className="mt-1 text-xs text-red-400">{validationError}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddFeed}
                  disabled={submitting}
                  className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Feed'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
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
