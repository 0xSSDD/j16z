'use client';

import { format } from 'date-fns';
import { FileText, Newspaper, Scale, Shield, TrendingUp } from 'lucide-react';
import * as React from 'react';
import type { Event } from '@/lib/types';

const EVENT_TYPE_META: Record<string, { icon: typeof FileText; color: string }> = {
  FILING: { icon: FileText, color: 'text-primary-400' },
  COURT: { icon: Scale, color: 'text-text-muted' },
  AGENCY: { icon: Shield, color: 'text-primary-500' },
  SPREAD_MOVE: { icon: TrendingUp, color: 'text-primary-300' },
  NEWS: { icon: Newspaper, color: 'text-text-muted' },
};

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  WARNING: 'bg-primary-500',
  INFO: 'bg-text-dim',
};

interface EventsTabProps {
  events: Event[];
  focusedIndex: number;
  selectedEventId: string | null;
  onSelect: (id: string) => void;
  onFocusChange: (index: number) => void;
}

export function EventsTab({ events, focusedIndex, selectedEventId, onSelect, onFocusChange }: EventsTabProps) {
  const focusedRef = React.useRef<HTMLButtonElement>(null);

  // Scroll focused row into view
  React.useEffect(() => {
    focusedRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-sm text-text-muted font-mono mb-2">No events recorded yet.</p>
          <p className="text-xs text-text-dim font-mono">
            Events will appear here as the deal progresses through regulatory reviews, filings, and court proceedings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {events.map((event, index) => {
        const meta = EVENT_TYPE_META[event.type];
        const Icon = meta?.icon ?? FileText;
        const dotClass = SEVERITY_DOT[event.severity] ?? 'bg-text-dim';
        const isFocused = index === focusedIndex;
        const isSelected = event.id === selectedEventId;

        return (
          <button
            key={event.id}
            ref={isFocused ? focusedRef : undefined}
            type="button"
            onClick={() => {
              onFocusChange(index);
              onSelect(event.id);
            }}
            onMouseEnter={() => onFocusChange(index)}
            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
              isSelected
                ? 'bg-primary-500/10 border-l-2 border-primary-500'
                : isFocused
                  ? 'bg-surfaceHighlight'
                  : 'hover:bg-surface'
            }`}
          >
            {/* Severity dot */}
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotClass}`} />

            {/* Event type icon */}
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${meta?.color ?? 'text-text-muted'}`} />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-text-main truncate">{event.title}</span>
                <span className="text-xs text-text-muted font-mono shrink-0">
                  {format(new Date(event.timestamp), 'MMM d, yyyy')}
                </span>
              </div>
              {event.summary && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{event.summary}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-text-dim">{event.type}</span>
                {event.subtype && <span className="text-xs font-mono text-text-dim opacity-70">· {event.subtype}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
