"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MOCK_DEALS } from "@/lib/constants";
import { Deal } from "@/lib/types";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";

interface WatchlistDetailProps {
  watchlistId: string;
}

interface Watchlist {
  id: string;
  name: string;
  description: string;
  dealIds: string[];
  createdAt: string;
}

export function WatchlistDetail({ watchlistId }: WatchlistDetailProps) {
  const router = useRouter();
  const [watchlist, setWatchlist] = React.useState<Watchlist | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("watchlists");
      if (stored) {
        const watchlists: Watchlist[] = JSON.parse(stored);
        const found = watchlists.find((w) => w.id === watchlistId);
        setWatchlist(found || null);
      }
    }
  }, [watchlistId]);

  const columns: ColumnDef<Deal>[] = [
    {
      accessorKey: "companyName",
      header: "Deal",
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "currentSpread",
      header: "Spread",
      cell: ({ row }) => (
        <div className="font-medium text-primary-500">
          {row.original.currentSpread.toFixed(1)}%
        </div>
      ),
    },
    {
      accessorKey: "p_close_base",
      header: "p_close",
      cell: ({ row }) => (
        <div className="font-medium text-text-main">
          {row.original.p_close_base}%
        </div>
      ),
    },
    {
      accessorKey: "ev",
      header: "EV",
      cell: ({ row }) => (
        <div className="font-medium text-text-main">
          {row.original.ev.toFixed(2)}%
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/app/deals/${row.original.id}`)}
          className="text-sm text-primary-500 hover:text-primary-400 font-mono"
        >
          View →
        </button>
      ),
    },
  ];

  if (!watchlist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-mono font-bold text-foreground mb-2">
            Watchlist Not Found
          </h1>
          <button
            onClick={() => router.push("/app/deals")}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 dark:text-zinc-950 rounded-md font-mono text-sm transition-colors"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  const filteredDeals = MOCK_DEALS.filter((deal) =>
    watchlist.dealIds?.includes(deal.id) || false
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/app/deals")}
            className="text-sm text-muted-foreground hover:text-foreground font-mono flex items-center gap-1"
          >
            ← Back to Deals
          </button>
          <div>
            <h1 className="text-lg font-mono font-bold text-foreground">
              {watchlist.name}
            </h1>
            {watchlist.description && (
              <p className="text-sm text-muted-foreground font-mono mt-1">
                {watchlist.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-mono">
            {filteredDeals.length} {filteredDeals.length === 1 ? "deal" : "deals"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredDeals.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground font-mono mb-4">
                No deals in this watchlist yet.
              </p>
              <button
                onClick={() => router.push("/app/deals")}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 dark:text-zinc-950 rounded-md font-mono text-sm transition-colors"
              >
                Browse Deals
              </button>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={filteredDeals} />
        )}
      </div>
    </div>
  );
}
