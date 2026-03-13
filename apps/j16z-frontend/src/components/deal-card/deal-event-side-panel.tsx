'use client';

import { format } from 'date-fns';
import { ExternalLink, FileText, Newspaper, Scale, Shield, TrendingUp, X } from 'lucide-react';
import type { Event } from '@/lib/types';

const SOURCE_LABELS: Record<string, string> = {
  SEC_EDGAR: 'SEC EDGAR',
  COURT_LISTENER: 'CourtListener',
  FTC_GOV: 'FTC.gov',
  DOJ_GOV: 'DOJ.gov',
  RSS: 'RSS Feed',
};

const EVENT_TYPE_META: Record<string, { icon: typeof FileText; color: string; sourceLabel: string }> = {
  FILING: { icon: FileText, color: 'text-primary-400', sourceLabel: 'View on SEC EDGAR' },
  COURT: { icon: Scale, color: 'text-text-muted', sourceLabel: 'View on CourtListener' },
  AGENCY: { icon: Shield, color: 'text-primary-500', sourceLabel: 'View Agency Release' },
  SPREAD_MOVE: { icon: TrendingUp, color: 'text-primary-300', sourceLabel: 'View Market Data' },
  NEWS: { icon: Newspaper, color: 'text-text-muted', sourceLabel: 'View Article' },
};

const SUBTYPE_LABELS: Record<string, string> = {
  FTC_SECOND_REQUEST: 'FTC Second Request',
  HSR_EARLY_TERMINATION: 'HSR Early Termination',
  FTC_PRESS_RELEASE: 'FTC Press Release',
  DOJ_PRESS_RELEASE: 'DOJ Press Release',
  DOJ_CIVIL_CASE: 'DOJ Civil Case',
  RSS_ARTICLE: 'RSS Article',
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  WARNING: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
  INFO: 'bg-surface text-text-muted border-border',
};

interface DealEventSidePanelProps {
  eventId: string;
  events: Event[];
  onClose: () => void;
}

export function DealEventSidePanel({ eventId, events, onClose }: DealEventSidePanelProps) {
  const event = events.find((e) => e.id === eventId) ?? null;

  if (!event) {
    return (
      <div className="w-[400px] border-l border-border bg-surface overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-main">Event Not Found</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">The requested event could not be found.</p>
        </div>
      </div>
    );
  }

  const meta = EVENT_TYPE_META[event.type];
  const Icon = meta?.icon ?? FileText;
  const severityClass = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.INFO;

  return (
    <div className="w-[400px] border-l border-border bg-surface overflow-y-auto flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface p-4">
        <div className="flex items-start justify-between">
          <h2 className="text-base font-bold text-text-main pr-8 leading-snug">{event.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surfaceHighlight hover:text-text-main shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5 flex-1">
        {/* Meta fields */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Date:</span>
            <span className="text-text-main">{format(new Date(event.timestamp), 'MMM d, yyyy, h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Type:</span>
            <span className={`inline-flex items-center gap-1.5 ${meta?.color ?? 'text-text-main'}`}>
              <Icon className="h-3.5 w-3.5" />
              {event.type}
            </span>
          </div>
          {event.subtype && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Subtype:</span>
              <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-500 border border-primary-500/20">
                {SUBTYPE_LABELS[event.subtype] ?? event.subtype}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Severity:</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${severityClass}`}
            >
              {event.severity}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Source:</span>
            <span className="text-text-main">{SOURCE_LABELS[event.sourceType] ?? event.sourceType}</span>
          </div>
          {typeof event.materialityScore === 'number' && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Materiality:</span>
              <span className="text-text-main font-mono">{event.materialityScore}/100</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-bold text-text-main mb-2">SUMMARY</h3>
          <p className="text-sm text-text-muted leading-relaxed">{event.summary || 'No summary available'}</p>
        </div>

        {/* Details */}
        {event.content && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-text-main mb-2">DETAILS</h3>
            <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
              {event.content.slice(0, 500)}
              {event.content.length > 500 && '...'}
            </div>
          </div>
        )}

        {/* Source link */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-bold text-text-main mb-3">SOURCE</h3>
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-border bg-surfaceHighlight px-3 py-2 text-sm text-text-main transition-colors hover:border-primary-500/30"
          >
            <ExternalLink className="h-4 w-4" />
            {meta?.sourceLabel ?? 'View Source Document'}
          </a>
        </div>
      </div>
    </div>
  );
}
