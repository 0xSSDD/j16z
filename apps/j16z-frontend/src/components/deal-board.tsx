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
import { SimpleDropdown } from "@/components/ui/simple-dropdown";
import { AlertTriangle, Scale, Search } from "lucide-react";
import { daysUntil, formatDateForFilename } from "@/lib/date-utils";
import { exportToCSV, exportToJSON } from "@/lib/file-utils";

export function DealBoard() {
  const router = useRouter();
  const [deals, setDeals] = React.useState<Deal[]>(MOCK_DEALS);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = React.useState(false);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = React.useState(false);
  const [spreadFilter, setSpreadFilter] = React.useState<string[]>([]);
  const [pCloseFilter, setPCloseFilter] = React.useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = React.useState<string[]>([]);
  const [watchlistOnly, setWatchlistOnly] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pageSize, setPageSize] = React.useState(20);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Filter options
  const spreadOptions = [
    { id: "2", name: "Spread > 2%" },
    { id: "3", name: "Spread > 3%" },
    { id: "5", name: "Spread > 5%" },
  ];

  const pCloseOptions = [
    { id: "40", name: "p_close > 40%" },
    { id: "50", name: "p_close > 50%" },
    { id: "60", name: "p_close > 60%" },
  ];

  const sectorOptions = [
    { id: "Technology", name: "Technology" },
    { id: "Healthcare", name: "Healthcare" },
    { id: "Retail", name: "Retail" },
  ];

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
      header: "Regulation/Litigation",
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
                  {row.original.regulatoryFlags.length} Regulation
                </span>
              </div>
            )}
            {hasLitigation && (
              <div className="flex items-center gap-1">
                <Scale className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-500 font-medium">
                  {row.original.litigationCount} Litigation
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

  const toggleSpreadFilter = (id: string) => {
    setSpreadFilter(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const togglePCloseFilter = (id: string) => {
    setPCloseFilter(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const toggleSectorFilter = (id: string) => {
    setSectorFilter(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const filteredDeals = React.useMemo(() => {
    return deals.filter((deal) => {
      // Watchlist filter
      if (watchlistOnly) {
        // Check if deal is in any watchlist (using localStorage)
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("watchlists");
          if (stored) {
            try {
              const watchlists = JSON.parse(stored);
              const isInWatchlist = watchlists.some((w: any) =>
                w.dealIds?.includes(deal.id)
              );
              if (!isInWatchlist) return false;
            } catch (error) {
              console.error("Failed to check watchlist:", error);
            }
          } else {
            // No watchlists exist, filter out all deals
            return false;
          }
        }
      }

      // Spread filter - if any spread filter is selected, deal must meet at least one
      if (spreadFilter.length > 0) {
        const meetsSpread = spreadFilter.some(threshold => deal.currentSpread >= parseFloat(threshold));
        if (!meetsSpread) return false;
      }

      // p_close filter - if any p_close filter is selected, deal must meet at least one
      if (pCloseFilter.length > 0) {
        const meetsPClose = pCloseFilter.some(threshold => deal.p_close_base >= parseFloat(threshold));
        if (!meetsPClose) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSymbol = deal.symbol.toLowerCase().includes(query);
        const matchesAcquirer = deal.acquirerSymbol.toLowerCase().includes(query);
        const matchesCompany = deal.companyName.toLowerCase().includes(query);
        const matchesAcquirerName = deal.acquirerName.toLowerCase().includes(query);
        if (!matchesSymbol && !matchesAcquirer && !matchesCompany && !matchesAcquirerName) {
          return false;
        }
      }
      return true;
    });
  }, [deals, spreadFilter, pCloseFilter, watchlistOnly, searchQuery]);

  const activeFilters = React.useMemo(() => {
    const filters = [];
    spreadFilter.forEach(f => {
      filters.push({ label: "Spread", value: `>${f}%`, onRemove: () => toggleSpreadFilter(f) });
    });
    pCloseFilter.forEach(f => {
      filters.push({ label: "p_close", value: `>${f}%`, onRemove: () => togglePCloseFilter(f) });
    });
    sectorFilter.forEach(f => {
      filters.push({ label: "Sector", value: f, onRemove: () => toggleSectorFilter(f) });
    });
    if (watchlistOnly) filters.push({ label: "Watchlist", value: "Only", onRemove: () => setWatchlistOnly(false) });
    return filters;
  }, [spreadFilter, pCloseFilter, sectorFilter, watchlistOnly]);

  const totalPages = Math.ceil(filteredDeals.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDeals = filteredDeals.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, spreadFilter, pCloseFilter, sectorFilter, watchlistOnly]);

  const handleRowClick = (deal: Deal) => {
    router.push(`/app/deals/${deal.id}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals by symbol or company..."
            className="w-full rounded-md border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <SimpleDropdown
          label="Spread"
          items={spreadOptions}
          selectedIds={spreadFilter}
          onToggle={toggleSpreadFilter}
        />

        <SimpleDropdown
          label="p_close"
          items={pCloseOptions}
          selectedIds={pCloseFilter}
          onToggle={togglePCloseFilter}
        />

        <SimpleDropdown
          label="Sector"
          items={sectorOptions}
          selectedIds={sectorFilter}
          onToggle={toggleSectorFilter}
        />

        <button
          onClick={() => setWatchlistOnly(!watchlistOnly)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            watchlistOnly
              ? "border-primary-500/30 bg-primary-500/10 text-primary-400"
              : "border-border bg-surface text-text-muted hover:bg-surfaceHighlight"
          }`}
        >
          Watchlist Only
        </button>
      </div>

      {activeFilters.length > 0 && (
        <FilterChips
          filters={activeFilters}
          onClearAll={() => {
            setSpreadFilter([]);
            setPCloseFilter([]);
            setSectorFilter([]);
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
              const startIndex = (currentPage - 1) * pageSize;
              handleRowClick(paginatedDeals[index - 1]);
            }
          }
        }}
      >
        <DataTable columns={columns} data={paginatedDeals} />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageSizeChange(20)}
            className={`rounded border px-3 py-1 text-sm font-medium transition-colors ${
              pageSize === 20
                ? "border-primary-500 bg-primary-500/10 text-primary-400"
                : "border-border bg-surface text-text-main hover:bg-surfaceHighlight"
            }`}
          >
            20
          </button>
          <button
            onClick={() => handlePageSizeChange(30)}
            className={`rounded border px-3 py-1 text-sm font-medium transition-colors ${
              pageSize === 30
                ? "border-primary-500 bg-primary-500/10 text-primary-400"
                : "border-border bg-surface text-text-main hover:bg-surfaceHighlight"
            }`}
          >
            30
          </button>
          <button
            onClick={() => handlePageSizeChange(50)}
            className={`rounded border px-3 py-1 text-sm font-medium transition-colors ${
              pageSize === 50
                ? "border-primary-500 bg-primary-500/10 text-primary-400"
                : "border-border bg-surface text-text-main hover:bg-surfaceHighlight"
            }`}
          >
            50
          </button>
          <span className="text-sm text-text-muted">per page</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded border border-border bg-surface px-3 py-1 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="text-sm text-text-main">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded border border-border bg-surface px-3 py-1 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
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
