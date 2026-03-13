'use client';

import { format } from 'date-fns';
import { Scale, Shield } from 'lucide-react';
import * as React from 'react';
import type { Deal, Event } from '@/lib/types';

interface RegLitigationTabProps {
  events: Event[];
  deal: Deal;
}

export function RegLitigationTab({ events, deal }: RegLitigationTabProps) {
  const courtEvents = events.filter((e) => e.type === 'COURT');
  const agencyEvents = events.filter((e) => e.type === 'AGENCY');

  return (
    <div className="divide-y divide-border">
      {/* Regulatory status from deal flags */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-mono font-semibold text-text-muted uppercase tracking-wider">
            Regulatory Status
          </h3>
        </div>
        {deal.regulatoryFlags.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {deal.regulatoryFlags.map((flag) => (
              <span
                key={flag}
                className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md font-mono text-xs"
              >
                {flag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted font-mono mb-3">No regulatory issues identified.</p>
        )}

        {/* Agency events */}
        {agencyEvents.length > 0 && (
          <div className="space-y-2 mt-3">
            {agencyEvents.map((event) => (
              <div key={event.id} className="p-3 bg-surface rounded-md border border-border">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-text-main">{event.title}</span>
                  <span className="text-xs text-text-muted font-mono shrink-0">
                    {format(new Date(event.timestamp), 'MMM d, yyyy')}
                  </span>
                </div>
                {event.summary && <p className="text-xs text-text-muted">{event.summary}</p>}
                {event.subtype && (
                  <span className="inline-block mt-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {event.subtype}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Litigation */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-mono font-semibold text-text-muted uppercase tracking-wider">Litigation</h3>
        </div>

        {deal.litigationCount > 0 ? (
          <p className="text-sm text-text-main font-mono mb-3">
            {deal.litigationCount} active {deal.litigationCount === 1 ? 'case' : 'cases'}
          </p>
        ) : (
          <p className="text-sm text-text-muted font-mono mb-3">No active litigation.</p>
        )}

        {/* Court events */}
        {courtEvents.length > 0 ? (
          <div className="space-y-2">
            {courtEvents.map((event) => (
              <div key={event.id} className="p-3 bg-surface rounded-md border border-border">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-text-main">{event.title}</span>
                  <span className="text-xs text-text-muted font-mono shrink-0">
                    {format(new Date(event.timestamp), 'MMM d, yyyy')}
                  </span>
                </div>
                {event.summary && <p className="text-xs text-text-muted">{event.summary}</p>}
                {event.subtype && (
                  <span className="inline-block mt-1 text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                    {event.subtype}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-dim font-mono">No court events recorded.</p>
        )}
      </div>
    </div>
  );
}
