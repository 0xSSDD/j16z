'use client';

import { SpreadChart } from '@/components/ui/spread-chart';
import type { Event, MarketSnapshot } from '@/lib/types';

interface SpreadHistoryTabProps {
  dealId: string;
  marketSnapshots: MarketSnapshot[];
  events: Event[];
}

export function SpreadHistoryTab({ marketSnapshots, events }: SpreadHistoryTabProps) {
  if (marketSnapshots.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-sm text-text-muted font-mono mb-2">No spread history available.</p>
          <p className="text-xs text-text-dim font-mono">
            Historical spread data will be displayed here once market snapshots are recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <SpreadChart data={marketSnapshots} events={events} />
    </div>
  );
}
