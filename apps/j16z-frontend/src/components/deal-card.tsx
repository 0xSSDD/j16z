"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MOCK_DEALS, MOCK_EVENTS, MOCK_CLAUSES, MOCK_MARKET_SNAPSHOTS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { SpreadChart } from "@/components/ui/spread-chart";
import { EventTimeline } from "@/components/ui/event-timeline";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { NewsSection } from "@/components/news-section";
import { AlertConfigModal } from "@/components/alert-config-modal";
import { formatDate } from "@/lib/date-utils";

interface DealCardProps {
  dealId: string;
}

export function DealCard({ dealId }: DealCardProps) {
  const router = useRouter();
  const deal = MOCK_DEALS.find((d) => d.id === dealId);
  const events = MOCK_EVENTS.filter((e) => e.dealId === dealId);
  const clauses = MOCK_CLAUSES.filter((c) => c.dealId === dealId);
  const marketSnapshots = MOCK_MARKET_SNAPSHOTS.filter((s) => s.dealId === dealId);

  const [pCloseBase, setPCloseBase] = React.useState(deal?.p_close_base || 0);
  const [spreadThreshold, setSpreadThreshold] = React.useState(deal?.spread_entry_threshold || 0);
  const [eventTypeFilter, setEventTypeFilter] = React.useState<string[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = React.useState(false);
  const [isExportOpen, setIsExportOpen] = React.useState(false);

  const exportDealCSV = () => {
    if (!deal) return;
    const headers = ["Field", "Value"];
    const rows = [
      ["Deal", `${deal.acquirerSymbol} / ${deal.symbol}`],
      ["Status", deal.status],
      ["Spread", `${deal.currentSpread.toFixed(1)}%`],
      ["p_close", `${deal.p_close_base}%`],
      ["EV", `${deal.ev.toFixed(2)}%`],
      ["Deal Value", `$${(deal.reportedEquityTakeoverValue / 1e9).toFixed(1)}B`],
      ["Announced", deal.announcementDate],
      ["Outside Date", deal.outsideDate],
    ];
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `j16z-deal-${deal.acquirerSymbol}-${deal.symbol}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    setIsExportOpen(false);
  };

  const exportDealJSON = () => {
    if (!deal) return;
    const json = JSON.stringify({ deal, events, clauses, marketSnapshots }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `j16z-deal-${deal.acquirerSymbol}-${deal.symbol}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    setIsExportOpen(false);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "d") {
          e.preventDefault();
          router.push(`/app/deals/${dealId}/draft`);
        } else if (e.key === "e") {
          e.preventDefault();
          setIsExportOpen((prev) => !prev);
        } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
          e.preventDefault();
          const sectionId = `section-${e.key}`;
          document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dealId, router]);

  const daysUntilOutside = React.useMemo(() => {
    if (!deal) return 0;
    return Math.ceil(
      (new Date(deal.outsideDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.outsideDate]);

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-mono font-bold text-zinc-100 mb-2">Deal Not Found</h1>
          <p className="text-sm text-zinc-500 font-mono mb-4">The deal you&apos;re looking for doesn&apos;t exist.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md font-mono text-sm transition-colors"
            >
              Alerts
            </button>
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md font-mono text-sm transition-colors"
              >
                Export
              </button>
              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg z-10">
                  <button
                    onClick={exportDealCSV}
                    className="w-full text-left px-4 py-2 text-sm font-mono text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={exportDealJSON}
                    className="w-full text-left px-4 py-2 text-sm font-mono text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    Export JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredEvents = eventTypeFilter.length > 0
    ? events.filter((e) => eventTypeFilter.includes(e.type))
    : events;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/app/deals")}
            className="text-sm text-text-muted hover:text-text-main font-mono mb-2 flex items-center gap-1"
          >
            ← Back to Deals
          </button>
          <h1 className="text-3xl font-mono font-bold text-text-main mb-2">
            {deal.acquirerName} → {deal.companyName}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <StatusBadge status={deal.status} />
            <span className="text-sm text-text-muted font-mono">
              Announced: {formatDate(deal.announcementDate)}
            </span>
            <span className="text-sm text-primary-500 font-mono">
              Outside: {daysUntilOutside > 0 ? `⏱ ${daysUntilOutside}d` : "CLOSED"}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics Panel */}
      <div className="grid grid-cols-5 gap-4 p-4 bg-background border border-border rounded-lg">
        <div>
          <div className="text-xs text-text-muted font-mono uppercase mb-1">Spread</div>
          <div className="text-2xl font-mono font-bold text-primary-500">
            {deal.currentSpread.toFixed(1)}%
          </div>
          <div className="text-xs text-text-muted font-mono">↑ 0.3% (24h)</div>
        </div>
        <div className="group relative">
          <div className="text-xs text-text-muted font-mono uppercase mb-1 flex items-center gap-1">
            p_close_base
            <span className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
          </div>
          <input
            type="number"
            value={pCloseBase}
            onChange={(e) => setPCloseBase(Number(e.target.value))}
            placeholder="Click to edit"
            className="text-2xl font-mono font-bold text-text-main bg-transparent border-b border-transparent hover:border-border focus:border-primary-500 outline-none w-20 transition-colors cursor-text"
          />
          <span className="text-2xl font-mono font-bold text-text-main">%</span>
        </div>
        <div>
          <div className="text-xs text-text-muted font-mono uppercase mb-1">EV</div>
          <div className="text-2xl font-mono font-bold text-green-500">
            {((deal.currentSpread * pCloseBase) / 100).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted font-mono uppercase mb-1">Deal Value</div>
          <div className="text-2xl font-mono font-bold text-text-main">
            ${(deal.reportedEquityTakeoverValue / 1e9).toFixed(1)}B
          </div>
        </div>
        <div className="group relative">
          <div className="text-xs text-text-muted font-mono uppercase mb-1 flex items-center gap-1">
            Entry Threshold
            <span className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
          </div>
          <input
            type="number"
            value={spreadThreshold}
            onChange={(e) => setSpreadThreshold(Number(e.target.value))}
            placeholder="Click to edit"
            className="text-2xl font-mono font-bold text-text-main bg-transparent border-b border-transparent hover:border-border focus:border-primary-500 outline-none w-16 transition-colors cursor-text"
          />
          <span className="text-2xl font-mono font-bold text-text-main">%</span>
        </div>
      </div>

      {/* Deal Terms */}
      <div id="section-1">
      <CollapsibleSection title="Deal Terms" defaultOpen={true}>
        {clauses.length > 0 ? (
          <div className="space-y-3">
            {clauses.map((clause) => (
              <div key={clause.id} className="flex items-start gap-4 p-3 bg-surface rounded-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-medium text-primary-500 uppercase">
                      {clause.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      {clause.sourceFilingType} {clause.sourceSection}
                    </span>
                  </div>
                  <div className="text-sm text-text-main font-mono">{clause.value}</div>
                </div>
                <a
                  href={clause.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-500 hover:text-primary-600 font-mono"
                >
                  →
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted font-mono">No deal terms available.</p>
        )}
      </CollapsibleSection>
      </div>

      {/* Events Timeline */}
      <div id="section-2">
      <CollapsibleSection title="Events" defaultOpen={true}>
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          {["FILING", "COURT", "AGENCY", "SPREAD_MOVE", "NEWS"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setEventTypeFilter((prev) =>
                  prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                );
              }}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-colors ${
                eventTypeFilter.includes(type)
                  ? "bg-primary-500 text-white"
                  : "bg-surface text-text-muted hover:bg-surfaceHighlight"
              }`}
            >
              {type}
            </button>
          ))}
          {eventTypeFilter.length > 0 && (
            <button
              onClick={() => setEventTypeFilter([])}
              className="text-xs font-mono text-text-muted hover:text-text-main underline"
            >
              Clear filters
            </button>
          )}
        </div>
        {filteredEvents.length > 0 ? (
          <EventTimeline events={filteredEvents} />
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted font-mono mb-2">
              {eventTypeFilter.length > 0 ? "No events match the selected filters." : "No events recorded yet."}
            </p>
            {eventTypeFilter.length === 0 && (
              <p className="text-xs text-text-dim font-mono">
                Events will appear here as the deal progresses through regulatory reviews, filings, and court proceedings.
              </p>
            )}
          </div>
        )}
      </CollapsibleSection>
      </div>

      {/* Spread Chart */}
      <div id="section-3">
      <CollapsibleSection title="Spread History" defaultOpen={false}>
        {marketSnapshots.length > 0 ? (
          <SpreadChart data={marketSnapshots} events={events} />
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted font-mono mb-2">No spread history available.</p>
            <p className="text-xs text-text-dim font-mono">
              Historical spread data will be displayed here once market snapshots are recorded.
            </p>
          </div>
        )}
      </CollapsibleSection>
      </div>

      {/* News & Research */}
      <div id="section-4">
      <CollapsibleSection title="News & Research" defaultOpen={false}>
        <NewsSection dealId={dealId} />
      </CollapsibleSection>
      </div>

      {/* Regulatory & Litigation */}
      <div id="section-5">
      <CollapsibleSection title="Regulatory & Litigation" defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-mono font-medium text-text-main mb-2">Regulatory Status</h4>
            {deal.regulatoryFlags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {deal.regulatoryFlags.map((flag) => (
                  <span
                    key={flag}
                    className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md font-mono text-xs"
                  >
                    {flag.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-text-muted font-mono mb-1">No regulatory issues identified.</p>
                <p className="text-xs text-text-dim font-mono">
                  This deal has no active regulatory reviews or concerns flagged.
                </p>
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-mono font-medium text-text-main mb-2">Litigation</h4>
            {deal.litigationCount > 0 ? (
              <p className="text-sm text-text-main font-mono">
                {deal.litigationCount} active {deal.litigationCount === 1 ? "case" : "cases"}
              </p>
            ) : (
              <div>
                <p className="text-sm text-text-muted font-mono mb-1">No active litigation.</p>
                <p className="text-xs text-text-dim font-mono">
                  This deal currently has no pending legal challenges or shareholder lawsuits.
                </p>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>
      </div>

      <AlertConfigModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        dealId={dealId}
      />
    </div>
  );
}
