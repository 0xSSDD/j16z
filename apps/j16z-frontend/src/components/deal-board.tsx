"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Deal } from "@/lib/types";
import { MOCK_DEALS } from "@/lib/constants";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterChips } from "@/components/ui/filter-chips";
import { WatchlistModal } from "@/components/watchlist-modal";
import { AddDealModal } from "@/components/add-deal-modal";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { AlertTriangle, Scale } from "lucide-react";
import { daysUntil, formatDateForFilename } from "@/lib/date-utils";
import { exportToCSV, exportToJSON } from "@/lib/file-utils";

export function DealBoard() {
  const router = useRouter();
  const [deals, setDeals] = React.useState<Deal[]>(MOCK_DEALS);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = React.useState(false);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = React.useState(false);
  const [spreadFilter, setSpreadFilter] = React.useState<string>("");
  const [pCloseFilter, setPCloseFilter] = React.useState<string>("");
  const [sectorFilter, setSectorFilter] = React.useState<string>("");
  const [watchlistOnly, setWatchlistOnly] = React.useState(false);

  // Listen for command palette events
  React.useEffect(() => {
    const handleOpenAddDeal = () => setIsAddDealModalOpen(true);
    const handleOpenWatchlist = () => setIsWatchlistModalOpen(true);

    window.addEventListener("openAddDealModal", handleOpenAddDeal);
    window.addEventListener("openWatchlistModal", handleOpenWatchlist);

    return () => {
      window.removeEventListener("openAddDealModal", handleOpenAddDeal);
      window.removeEventListener("openWatchlistModal", handleOpenWatchlist);
    };
  }, []);

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
      header: () => (
        <Tooltip content="The difference between the deal price and current trading price. Higher spreads indicate greater uncertainty or risk.">
          <span className="cursor-help border-b border-dotted border-text-muted">Spread</span>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <div className="font-medium text-primary-500">
            {row.original.currentSpread.toFixed(1)}%
          </div>
          <div className="text-xs text-text-muted">
            {row.original.currentSpread > 3 ? "↑" : "↓"} 0.3%
          </div>
        </div>
      ),
    },
    {
      accessorKey: "p_close_base",
      header: () => (
        <Tooltip content="Probability of close: The estimated likelihood that the deal will successfully complete based on regulatory, financial, and market factors.">
          <span className="cursor-help border-b border-dotted border-text-muted">p_close</span>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.p_close_base}%</span>
      ),
    },
    {
      accessorKey: "ev",
      header: () => (
        <Tooltip content="Expected Value: The risk-adjusted return calculated as (Spread × p_close) - (Downside × (1 - p_close)). Represents the average expected return.">
          <span className="cursor-help border-b border-dotted border-text-muted">EV</span>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-green-500">
          {row.original.ev.toFixed(2)}%
        </span>
      ),
    },
    {
      accessorKey: "regulatoryFlags",
      header: "Reg/Lit",
      cell: ({ row }) => {
        const hasRegulatory = row.original.regulatoryFlags.length > 0;
        const hasLitigation = row.original.litigationCount > 0;

        if (!hasRegulatory && !hasLitigation) {
          return <span className="text-text-dim text-xs">—</span>;
        }

        return (
          <div className="flex flex-col gap-1">
            {hasRegulatory && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-500 font-medium">
                  {row.original.regulatoryFlags.length} Reg
                </span>
              </div>
            )}
            {hasLitigation && (
              <div className="flex items-center gap-1">
                <Scale className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-500 font-medium">
                  {row.original.litigationCount} Lit
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "outsideDate",
      header: "Outside Date",
      cell: ({ row }) => {
        const days = daysUntil(row.original.outsideDate);
        if (days < 0) return <span className="text-text-muted">CLOSED</span>;
        return (
          <span className="text-primary-500">
            ⏱ {days}d
          </span>
        );
      },
    },
  ];

  const filteredDeals = React.useMemo(() => {
    return deals.filter((deal) => {
      if (spreadFilter && deal.currentSpread < parseFloat(spreadFilter)) return false;
      if (pCloseFilter && deal.p_close_base < parseFloat(pCloseFilter)) return false;
      return true;
    });
  }, [deals, spreadFilter, pCloseFilter]);

  const activeFilters = React.useMemo(() => {
    const filters = [];
    if (spreadFilter) filters.push({ label: "Spread", value: `>${spreadFilter}%`, onRemove: () => setSpreadFilter("") });
    if (pCloseFilter) filters.push({ label: "p_close", value: `>${pCloseFilter}%`, onRemove: () => setPCloseFilter("") });
    if (sectorFilter) filters.push({ label: "Sector", value: sectorFilter, onRemove: () => setSectorFilter("") });
    if (watchlistOnly) filters.push({ label: "Watchlist", value: "Only", onRemove: () => setWatchlistOnly(false) });
    return filters;
  }, [spreadFilter, pCloseFilter, sectorFilter, watchlistOnly]);

  const handleRowClick = (deal: Deal) => {
    router.push(`/app/deals/${deal.id}`);
  };

  const exportCSV = () => {
    const data = filteredDeals.map((deal) => ({
      Deal: `${deal.acquirerSymbol}/${deal.symbol}`,
      Status: deal.status,
      Spread: `${deal.currentSpread.toFixed(1)}%`,
      p_close: `${deal.p_close_base}%`,
      EV: `${deal.ev.toFixed(2)}%`,
      "Outside Date": deal.outsideDate,
    }));
    exportToCSV(data, `deals-${formatDateForFilename()}.csv`);
  };

  const exportJSON = () => {
    exportToJSON(filteredDeals, `deals-${formatDateForFilename()}.json`);
  };

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-text-main">Deals</h1>
          <p className="text-sm text-text-muted font-mono mt-1">
            {filteredDeals.length} of {deals.length} deals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddDealModalOpen(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md font-mono text-sm transition-colors"
          >
            + Add Deal
          </button>
          <button
            onClick={() => setIsWatchlistModalOpen(true)}
            className="px-4 py-2 border border-border bg-surface hover:bg-surfaceHighlight text-text-main rounded-md font-mono text-sm transition-colors"
          >
            Watchlists
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 border border-border bg-surface hover:bg-surfaceHighlight text-text-main rounded-md font-mono text-sm transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={exportJSON}
            className="px-4 py-2 border border-border bg-surface hover:bg-surfaceHighlight text-text-main rounded-md font-mono text-sm transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={spreadFilter}
          onChange={(e) => setSpreadFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-md text-text-main font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Spreads</option>
          <option value="2">Spread &gt; 2%</option>
          <option value="3">Spread &gt; 3%</option>
          <option value="5">Spread &gt; 5%</option>
        </select>

        <select
          value={pCloseFilter}
          onChange={(e) => setPCloseFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-md text-text-main font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All p_close</option>
          <option value="40">p_close &gt; 40%</option>
          <option value="50">p_close &gt; 50%</option>
          <option value="60">p_close &gt; 60%</option>
        </select>

        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-md text-text-main font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Sectors</option>
          <option value="Technology">Technology</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Retail">Retail</option>
        </select>

        <label className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-md text-text-main font-mono text-sm cursor-pointer hover:bg-surfaceHighlight transition-colors">
          <input
            type="checkbox"
            checked={watchlistOnly}
            onChange={(e) => setWatchlistOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-background text-primary-500 focus:ring-primary-500"
          />
          <span>Watchlist Only</span>
        </label>
      </div>

      {activeFilters.length > 0 && (
        <FilterChips
          filters={activeFilters}
          onClearAll={() => {
            setSpreadFilter("");
            setPCloseFilter("");
            setSectorFilter("");
            setWatchlistOnly(false);
          }}
        />
      )}

      <div
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const row = target.closest("tr");
          if (row && row.dataset.state !== undefined) {
            const index = Array.from(row.parentElement?.children || []).indexOf(row);
            if (index > 0) {
              handleRowClick(filteredDeals[index - 1]);
            }
          }
        }}
      >
        <DataTable columns={columns} data={filteredDeals} />
      </div>

      <div className="text-center text-sm text-text-muted font-mono">
        Sort: Spread ▾ • CMD+K for actions • Space for peek
      </div>

      <WatchlistModal
        isOpen={isWatchlistModalOpen}
        onClose={() => setIsWatchlistModalOpen(false)}
        onSave={() => {}}
      />

      <AddDealModal
        isOpen={isAddDealModalOpen}
        onClose={() => setIsAddDealModalOpen(false)}
        onAdd={(newDeal) => {
          setDeals([newDeal, ...deals]);
        }}
      />
    </div>
    </TooltipProvider>
  );
}
