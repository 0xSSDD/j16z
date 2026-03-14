'use client';

import type { JSONContent } from '@tiptap/react';
import { ArrowLeft, Calendar, ChevronRight, Eye, Lock, PanelRightClose, PanelRightOpen } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { MemoEditor } from '@/components/memo/memo-editor';
import { getDeal, getEvents, getMemo } from '@/lib/api';
import { MOCK_DEALS } from '@/lib/constants';
import type { Deal, Event, Memo } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FALLBACK_CONTENT: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Deal Memo' }],
    },
    { type: 'paragraph' },
  ],
};

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '\u2014';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STATUS_LABEL: Record<string, string> = {
  ANNOUNCED: 'Announced',
  REGULATORY_REVIEW: 'Reg. Review',
  LITIGATION: 'Litigation',
  APPROVED: 'Approved',
  TERMINATED: 'Terminated',
  CLOSED: 'Closed',
};

// ---------------------------------------------------------------------------
// DealContextPanel
// ---------------------------------------------------------------------------

function DealContextPanel({ deal, events, onCollapse }: { deal: Deal; events: Event[]; onCollapse: () => void }) {
  const recentEvents = events.slice(0, 5);

  return (
    <aside className="w-80 flex-shrink-0 border-l border-border bg-surface overflow-y-auto h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">Deal Context</span>
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse panel (\u2318\)"
            className="p-1 rounded text-text-dim hover:text-text-muted hover:bg-surfaceHighlight transition-colors"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Deal Terms */}
        <section className="bg-surfaceHighlight border border-border rounded-lg p-4 space-y-2.5">
          <h3 className="text-[10px] font-mono text-text-dim uppercase tracking-widest">Deal Terms</h3>
          <dl className="space-y-2">
            <TermRow label="Acquirer" value={deal.acquirerName} />
            <TermRow label="Target" value={deal.companyName} />
            <TermRow label="Value" value={formatCurrency(deal.reportedEquityTakeoverValue)} accent />
            <TermRow label="Type" value={deal.considerationType} />
            <TermRow label="P(Close)" value={`${deal.p_close_base}%`} />
            <TermRow label="Status" value={STATUS_LABEL[deal.status] ?? deal.status} />
          </dl>
        </section>

        {/* Key Dates */}
        <section className="bg-surfaceHighlight border border-border rounded-lg p-4 space-y-2.5">
          <h3 className="text-[10px] font-mono text-text-dim uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Key Dates
          </h3>
          <dl className="space-y-2">
            <TermRow label="Announced" value={formatDate(deal.announcementDate)} />
            <TermRow label="Outside Date" value={formatDate(deal.outsideDate)} />
            <TermRow label="Expected Close" value={formatDate(deal.acquisitionDate)} />
          </dl>
        </section>

        {/* Regulatory Flags */}
        {deal.regulatoryFlags.length > 0 && (
          <section className="bg-surfaceHighlight border border-border rounded-lg p-4 space-y-2.5">
            <h3 className="text-[10px] font-mono text-text-dim uppercase tracking-widest">Regulatory</h3>
            <div className="flex flex-wrap gap-1.5">
              {deal.regulatoryFlags.map((flag) => (
                <span
                  key={flag}
                  className="px-2 py-0.5 text-[10px] font-mono text-primary-400 bg-primary-500/10 border border-primary-500/20 rounded"
                >
                  {flag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <section className="bg-surfaceHighlight border border-border rounded-lg p-4 space-y-2.5">
            <h3 className="text-[10px] font-mono text-text-dim uppercase tracking-widest">Recent Events</h3>
            <ul className="space-y-2.5">
              {recentEvents.map((evt) => (
                <li key={evt.id} className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      evt.severity === 'CRITICAL'
                        ? 'bg-red-500'
                        : evt.severity === 'WARNING'
                          ? 'bg-primary-400'
                          : 'bg-text-dim'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-text-main leading-snug line-clamp-2">{evt.title}</p>
                    <p className="text-[10px] font-mono text-text-dim mt-0.5">{formatDate(evt.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Keyboard hint */}
        <p className="text-center text-[10px] font-mono text-text-dim pt-1">
          <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[9px]">\u2318</kbd>{' '}
          <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[9px]">\</kbd> to toggle
        </p>
      </div>
    </aside>
  );
}

/** Single row in a definition list. */
function TermRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs font-mono text-text-dim flex-shrink-0">{label}</dt>
      <dd className={`text-xs font-mono text-right truncate ${accent ? 'text-primary-400' : 'text-text-main'}`}>
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function MemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const [memo, setMemo] = React.useState<Memo | null>(null);
  const [deal, setDeal] = React.useState<Deal | null>(null);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [version, setVersion] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [panelCollapsed, setPanelCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('memo-panel-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // ------ Panel toggle ------

  const togglePanel = React.useCallback(() => {
    setPanelCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('memo-panel-collapsed', String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Cmd+\ (or Ctrl+\)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        togglePanel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel]);

  // ------ Data fetching ------

  React.useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      // 1) Fetch memo — may throw in mock mode
      let memoData: Memo | null = null;
      try {
        memoData = await getMemo(id);
      } catch {
        // Mock-mode fallback: synthetic memo linked to first mock deal
        const fallbackDealId = MOCK_DEALS[0]?.id ?? 'deal-1';
        memoData = {
          id,
          dealId: fallbackDealId,
          title: 'Draft Memo',
          content: FALLBACK_CONTENT,
          createdBy: 'user-1',
          visibility: 'private',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      if (cancelled) return;

      setMemo(memoData);
      setVersion(memoData.version);

      // 2) Fetch deal + events (both work in mock mode)
      try {
        const [dealData, eventsData] = await Promise.all([getDeal(memoData.dealId), getEvents(memoData.dealId)]);
        if (!cancelled) {
          setDeal(dealData);
          setEvents(eventsData);
        }
      } catch {
        // Non-critical — context panel will show empty
      }

      if (!cancelled) setLoading(false);
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ------ Loading state ------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-text-dim">Loading memo\u2026</span>
        </div>
      </div>
    );
  }

  // ------ Error / not found ------

  if (error || !memo) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-text-muted font-mono">{error ?? 'Memo not found'}</p>
          <Link
            href="/app/memos"
            className="text-xs font-mono text-primary-400 hover:text-primary-300 transition-colors"
          >
            \u2190 Back to Memos
          </Link>
        </div>
      </div>
    );
  }

  // ------ Main layout ------

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 py-2.5 bg-background/80 backdrop-blur-sm border-b border-border">
        {/* Left: back link + deal breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/app/memos"
            className="flex items-center gap-1 text-xs font-mono text-text-muted hover:text-text-main transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Memos
          </Link>

          {deal && (
            <>
              <ChevronRight className="h-3 w-3 text-text-dim flex-shrink-0" />
              <span className="text-xs font-mono text-text-main truncate">
                {deal.acquirerName} / {deal.companyName}
              </span>
            </>
          )}
        </div>

        {/* Right: metadata badges + panel toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-mono text-text-dim hidden sm:inline">{relativeTime(memo.updatedAt)}</span>

          <span className="px-1.5 py-0.5 text-[10px] font-mono text-text-muted bg-surfaceHighlight border border-border rounded">
            v{version}
          </span>

          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded border ${
              memo.visibility === 'firm'
                ? 'text-primary-400 bg-primary-500/10 border-primary-500/20'
                : 'text-text-dim bg-surfaceHighlight border-border'
            }`}
          >
            {memo.visibility === 'firm' ? <Eye className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
            {memo.visibility}
          </span>

          {/* Panel toggle — always visible on mobile, only when collapsed on desktop */}
          <button
            type="button"
            onClick={togglePanel}
            title={panelCollapsed ? 'Show deal context (\u2318\\)' : 'Hide deal context (\u2318\\)'}
            className="p-1.5 rounded text-text-dim hover:text-text-muted hover:bg-surfaceHighlight transition-colors md:hidden"
          >
            {panelCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </button>

          {panelCollapsed && (
            <button
              type="button"
              onClick={togglePanel}
              title="Show deal context (\u2318\\)"
              className="hidden md:flex p-1.5 rounded text-text-dim hover:text-text-muted hover:bg-surfaceHighlight transition-colors"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Body: editor + context panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor pane */}
        <main className="flex-1 overflow-y-auto p-4">
          <MemoEditor
            key={memo.id}
            initialContent={memo.content as JSONContent}
            memoId={memo.id}
            dealId={memo.dealId}
            version={version}
            onVersionChange={setVersion}
          />
        </main>

        {/* Desktop context panel */}
        {deal && !panelCollapsed && (
          <div className="hidden md:block">
            <DealContextPanel deal={deal} events={events} onCollapse={togglePanel} />
          </div>
        )}
      </div>

      {/* Mobile context panel — overlay */}
      {deal && !panelCollapsed && (
        <div className="md:hidden fixed inset-0 z-20 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={togglePanel}
            aria-label="Close deal context panel"
          />
          <div className="relative">
            <DealContextPanel deal={deal} events={events} onCollapse={togglePanel} />
          </div>
        </div>
      )}
    </div>
  );
}
