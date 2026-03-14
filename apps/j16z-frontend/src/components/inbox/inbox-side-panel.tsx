'use client';

import { format } from 'date-fns';
import { ExternalLink, Eye, FileText, Newspaper, NotebookPen, Scale, Shield, TrendingUp, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllEvents, getMemos } from '@/lib/api';
import type { Event, Memo } from '@/lib/types';
import { AddToMemoDialog } from './add-to-memo-dialog';

const SOURCE_LABELS: Record<string, string> = {
  SEC_EDGAR: 'SEC EDGAR',
  COURT_LISTENER: 'CourtListener',
  FTC_GOV: 'FTC.gov',
  DOJ_GOV: 'DOJ.gov',
  RSS: 'RSS Feed',
};

const EVENT_TYPE_META: Record<string, { icon: typeof FileText; color: string; sourceLabel: string }> = {
  FILING: { icon: FileText, color: 'text-primary-500', sourceLabel: 'View on SEC EDGAR' },
  COURT: { icon: Scale, color: 'text-text-muted', sourceLabel: 'View on CourtListener' },
  AGENCY: { icon: Shield, color: 'text-primary-400', sourceLabel: 'View Agency Release' },
  SPREAD_MOVE: { icon: TrendingUp, color: 'text-primary-300', sourceLabel: 'View Market Data' },
  NEWS: { icon: Newspaper, color: 'text-primary-400', sourceLabel: 'View Article' },
};

const SUBTYPE_LABELS: Record<string, string> = {
  FTC_SECOND_REQUEST: 'FTC Second Request',
  HSR_EARLY_TERMINATION: 'HSR Early Termination',
  FTC_PRESS_RELEASE: 'FTC Press Release',
  DOJ_PRESS_RELEASE: 'DOJ Press Release',
  DOJ_CIVIL_CASE: 'DOJ Civil Case',
  RSS_ARTICLE: 'RSS Article',
};

interface InboxSidePanelProps {
  eventId: string;
  onClose: () => void;
}

export function InboxSidePanel({ eventId, onClose }: InboxSidePanelProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddToMemo, setShowAddToMemo] = useState(false);
  const [dealMemo, setDealMemo] = useState<Memo | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        const events = await getAllEvents();
        const found = events.find((e) => e.id === eventId);
        setEvent(found || null);
      } catch (error) {
        console.error('Failed to load event:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();

    // Auto-mark as read after 5 seconds
    const timer = setTimeout(() => {
      const { markEventAsRead } = require('@/lib/read-status');
      markEventAsRead(eventId);
      // Dispatch custom event to update unread badge
      window.dispatchEvent(new CustomEvent('inbox:unread-updated'));
    }, 5000);

    return () => clearTimeout(timer);
  }, [eventId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (!event?.dealId) {
      setDealMemo(null);
      return;
    }

    getMemos(event.dealId)
      .then((memos) => {
        const sorted = [...memos].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setDealMemo(sorted[0] ?? null);
      })
      .catch(() => setDealMemo(null));
  }, [event?.dealId]);

  if (loading) {
    return (
      <div className="w-[400px] border-l border-border bg-surface p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-3/4 rounded bg-surfaceHighlight" />
          <div className="h-4 w-1/2 rounded bg-surfaceHighlight" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-surfaceHighlight" />
            <div className="h-3 w-full rounded bg-surfaceHighlight" />
            <div className="h-3 w-2/3 rounded bg-surfaceHighlight" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-[400px] border-l border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-main">Event Not Found</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-text-muted">The requested event could not be found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-[400px] border-l border-border bg-surface overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-border bg-surface p-4">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-bold text-text-main pr-8">{event.title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Date:</span>
              <span className="text-text-main">{format(new Date(event.timestamp), 'MMM d, yyyy, h:mm a')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Event Type:</span>
              {(() => {
                const meta = EVENT_TYPE_META[event.type];
                if (!meta) return <span className="text-text-main">{event.type}</span>;
                const Icon = meta.icon;
                return (
                  <span className={`inline-flex items-center gap-1.5 ${meta.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {event.type}
                  </span>
                );
              })()}
            </div>
            {event.subtype && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>Subtype:</span>
                <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-400 border border-primary-500/20">
                  {SUBTYPE_LABELS[event.subtype] ?? event.subtype}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Source:</span>
              <span className="text-text-main">{SOURCE_LABELS[event.sourceType] ?? event.sourceType}</span>
            </div>
            {event.dealId && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>Deal:</span>
                <span className="text-text-main">{event.dealId}</span>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-text-main mb-2">SUMMARY</h3>
            <p className="text-sm text-text-muted leading-relaxed">{event.summary || 'No summary available'}</p>
          </div>

          {event.content && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold text-text-main mb-2">DETAILS</h3>
              <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                {event.content.slice(0, 500)}
                {event.content.length > 500 && '...'}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-text-main mb-3">SOURCE</h3>
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border border-border bg-surfaceHighlight px-3 py-2 text-sm text-text-main transition-colors hover:border-primary-500/30 hover:bg-surfaceHighlight"
            >
              <ExternalLink className="h-4 w-4" />
              {EVENT_TYPE_META[event.type]?.sourceLabel ?? 'View Source Document'}
            </a>
          </div>

          {event.dealId && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold text-text-main mb-3">RELATED DEAL</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/app/deals/${event.dealId}`)}
                  className="flex items-center gap-2 rounded-md border border-border bg-surfaceHighlight px-3 py-2 text-sm text-text-main transition-colors hover:border-primary-500/30 hover:bg-surfaceHighlight"
                >
                  <Eye className="h-4 w-4" />
                  View Deal Card
                </button>
                {dealMemo && (
                  <button
                    type="button"
                    onClick={() => router.push(`/app/memos/${dealMemo.id}`)}
                    className="flex items-center gap-2 rounded-md border border-border bg-surfaceHighlight px-3 py-2 text-sm text-text-main transition-colors hover:border-primary-500/30 hover:bg-surfaceHighlight"
                  >
                    <FileText className="h-4 w-4" />
                    View Memo
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddToMemo(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
            >
              <NotebookPen className="h-4 w-4" />
              Add to Memo
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
            >
              Mark Read
            </button>
          </div>
        </div>
      </div>

      <AddToMemoDialog event={event ?? null} open={showAddToMemo} onOpenChange={setShowAddToMemo} />
    </>
  );
}
