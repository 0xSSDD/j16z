'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import type { WatchlistWithDeals } from '@/lib/api';
import { getWatchlist } from '@/lib/api';
import type { Deal } from '@/lib/types';

interface WatchlistDetailProps {
  watchlistId: string;
}

export function WatchlistDetail({ watchlistId }: WatchlistDetailProps) {
  const router = useRouter();
  const [watchlist, setWatchlist] = React.useState<WatchlistWithDeals | null>(null);
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const loadWatchlist = async () => {
      setLoading(true);
      try {
        const data = await getWatchlist(watchlistId);
        if (!cancelled) {
          setWatchlist(data);
          setDeals(data?.deals ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadWatchlist();

    return () => {
      cancelled = true;
    };
  }, [watchlistId]);

  const columns: ColumnDef<Deal>[] = [
    {
      accessorKey: 'companyName',
      header: 'Deal',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="font-medium text-text-main">
            {row.original.acquirerSymbol} → {row.original.symbol}
          </div>
          <div className="text-xs text-text-muted">
            {row.original.acquirerName} / {row.original.companyName}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'currentSpread',
      header: 'Spread',
      cell: ({ row }) => <div className="font-medium text-primary-500">{row.original.currentSpread.toFixed(1)}%</div>,
    },
    {
      accessorKey: 'p_close_base',
      header: 'p_close',
      cell: ({ row }) => <div className="font-medium text-text-main">{row.original.p_close_base}%</div>,
    },
    {
      accessorKey: 'ev',
      header: 'EV',
      cell: ({ row }) => <div className="font-medium text-text-main">{row.original.ev.toFixed(2)}%</div>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => router.push(`/app/deals/${row.original.id}`)}
          className="text-sm text-primary-500 hover:text-primary-400 font-mono"
        >
          View →
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-mono font-bold text-text-main mb-2">Loading watchlist...</h1>
        </div>
      </div>
    );
  }

  if (!watchlist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-mono font-bold text-text-main mb-2">Watchlist Not Found</h1>
          <button
            type="button"
            onClick={() => router.push('/app/deals')}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-background rounded-md font-mono text-sm transition-colors"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/app/deals')}
            className="text-sm text-text-muted hover:text-text-main font-mono flex items-center gap-1"
          >
            ← Back to Deals
          </button>
          <div>
            <h1 className="text-lg font-mono font-bold text-text-main">{watchlist.name}</h1>
            {watchlist.description && <p className="text-sm text-text-muted font-mono mt-1">{watchlist.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted font-mono">
            {deals.length} {deals.length === 1 ? 'deal' : 'deals'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {deals.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-text-muted font-mono mb-4">No deals in this watchlist yet.</p>
              <button
                type="button"
                onClick={() => router.push('/app/deals')}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-background rounded-md font-mono text-sm transition-colors"
              >
                Browse Deals
              </button>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={deals} />
        )}
      </div>
    </div>
  );
}
