"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { MOCK_DEALS } from "@/lib/constants";

export function DealDiscovery() {
  const router = useRouter();
  const [ticker, setTicker] = React.useState("");
  const [results, setResults] = React.useState<typeof MOCK_DEALS>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const handleSearch = () => {
    if (!ticker.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      const filtered = MOCK_DEALS.filter(
        (deal) =>
          deal.symbol.toLowerCase().includes(ticker.toLowerCase()) ||
          deal.acquirerSymbol.toLowerCase().includes(ticker.toLowerCase()) ||
          deal.companyName.toLowerCase().includes(ticker.toLowerCase()) ||
          deal.acquirerName.toLowerCase().includes(ticker.toLowerCase())
      );
      setResults(filtered);
      setIsSearching(false);
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-mono font-bold text-text-main">Deal Discovery</h1>
        <p className="text-sm text-text-muted font-mono mt-1">
          Search for M&A deals by ticker or company name
        </p>
      </div>

      <div className="border border-border rounded-lg bg-surface p-6">
        <div className="flex gap-2">
          <Input
            placeholder="Enter ticker (e.g., MSFT, ATVI)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-background border-border text-text-main font-mono uppercase"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !ticker.trim()}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-surface disabled:text-text-dim text-white rounded-md font-mono text-sm transition-colors"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-mono font-medium text-text-main">
            Found {results.length} deal{results.length !== 1 ? "s" : ""}
          </h2>
          {results.map((deal) => (
            <div
              key={deal.id}
              onClick={() => router.push(`/app/deals/${deal.id}`)}
              className="border border-border rounded-lg bg-surface p-4 hover:bg-surfaceHighlight cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-sm font-medium text-text-main">
                    {deal.acquirerSymbol} → {deal.symbol}
                  </div>
                  <div className="text-xs text-text-muted font-mono mt-1">
                    {deal.acquirerName} / {deal.companyName}
                  </div>
                  <div className="text-xs text-text-dim font-mono mt-2">
                    Status: {deal.status} • Spread: {deal.currentSpread.toFixed(1)}%
                  </div>
                </div>
                <div className="text-primary-500 font-mono text-sm">→</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && ticker && !isSearching && (
        <div className="text-center py-12">
          <p className="text-text-muted font-mono text-sm">
            No deals found for &quot;{ticker}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
