'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/date-utils';
import type { Deal } from '@/lib/types';

interface DealCardHeaderProps {
  deal: Deal;
  pCloseBase: number;
  onPCloseChange: (value: number) => void;
  spreadThreshold: number;
  onSpreadThresholdChange: (value: number) => void;
  isExportOpen: boolean;
  onExportToggle: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onAlertOpen: () => void;
}

export function DealCardHeader({
  deal,
  pCloseBase,
  onPCloseChange,
  spreadThreshold,
  onSpreadThresholdChange,
  isExportOpen,
  onExportToggle,
  onExportCSV,
  onExportJSON,
  onAlertOpen,
}: DealCardHeaderProps) {
  const router = useRouter();

  const daysUntilOutside = React.useMemo(() => {
    return Math.ceil((new Date(deal.outsideDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [deal.outsideDate]);

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4 md:px-6">
      {/* Back + Title row */}
      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push('/app/deals')}
            className="text-sm text-text-muted hover:text-text-main font-mono mb-1 flex items-center gap-1"
          >
            ← Back to Deals
          </button>
          <h1 className="text-xl font-mono font-bold text-text-main leading-tight md:text-2xl">
            {deal.acquirerName} → {deal.companyName}
          </h1>
          <div className="flex items-center gap-3 flex-wrap mt-1">
            <StatusBadge status={deal.status} />
            <span className="text-sm text-text-muted font-mono">Announced: {formatDate(deal.announcementDate)}</span>
            <span className="text-sm text-primary-500 font-mono">
              Outside: {daysUntilOutside > 0 ? `${daysUntilOutside}d` : 'CLOSED'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAlertOpen}
            className="px-3 py-1.5 bg-surface hover:bg-surfaceHighlight text-text-main rounded-md font-mono text-xs transition-colors border border-border"
          >
            Alerts
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onExportToggle}
              className="px-3 py-1.5 bg-surface hover:bg-surfaceHighlight text-text-main rounded-md font-mono text-xs transition-colors border border-border"
            >
              Export
            </button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-surface border border-border rounded-md shadow-lg z-20">
                <button
                  type="button"
                  onClick={onExportCSV}
                  className="w-full text-left px-4 py-2 text-xs font-mono text-text-main hover:bg-surfaceHighlight transition-colors"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={onExportJSON}
                  className="w-full text-left px-4 py-2 text-xs font-mono text-text-main hover:bg-surfaceHighlight transition-colors"
                >
                  Export JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
        <div>
          <div className="text-xs text-text-muted font-mono uppercase mb-1">Spread</div>
          <div className="text-xl font-mono font-bold text-primary-500">{deal.currentSpread.toFixed(1)}%</div>
          <div className="text-xs text-text-muted font-mono">↑ 0.3% (24h)</div>
        </div>
        <div className="group relative">
          <div className="text-xs text-text-muted font-mono uppercase mb-1 flex items-center gap-1">p_close_base</div>
          <div className="flex items-baseline">
            <input
              type="number"
              value={pCloseBase}
              onChange={(e) => onPCloseChange(Number(e.target.value))}
              className="text-xl font-mono font-bold text-text-main bg-transparent border-b border-transparent hover:border-border focus:border-primary-500 outline-none w-16 transition-colors cursor-text"
            />
            <span className="text-xl font-mono font-bold text-text-main">%</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted font-mono uppercase mb-1">EV</div>
          <div className="text-xl font-mono font-bold text-primary-500">
            {((deal.currentSpread * pCloseBase) / 100).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted font-mono uppercase mb-1">Deal Value</div>
          <div className="text-xl font-mono font-bold text-text-main">
            ${(deal.reportedEquityTakeoverValue / 1e9).toFixed(1)}B
          </div>
        </div>
        <div className="group relative">
          <div className="text-xs text-text-muted font-mono uppercase mb-1">Entry Threshold</div>
          <div className="flex items-baseline">
            <input
              type="number"
              value={spreadThreshold}
              onChange={(e) => onSpreadThresholdChange(Number(e.target.value))}
              className="text-xl font-mono font-bold text-text-main bg-transparent border-b border-transparent hover:border-border focus:border-primary-500 outline-none w-14 transition-colors cursor-text"
            />
            <span className="text-xl font-mono font-bold text-text-main">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
