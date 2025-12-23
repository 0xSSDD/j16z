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
        <h1 className="text-2xl font-mono font-bold text-zinc-100">Deal Discovery</h1>
        <p className="text-sm text-zinc-500 font-mono mt-1">
          Search for M&A deals by ticker or company name
        </p>
      </div>

      <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-6">
        <div className="flex gap-2">
          <Input
            placeholder="Enter ticker (e.g., MSFT, ATVI)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-100 font-mono uppercase"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !ticker.trim()}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-md font-mono text-sm transition-colors"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-mono font-medium text-zinc-100">
            Found {results.length} deal{results.length !== 1 ? "s" : ""}
          </h2>
          {results.map((deal) => (
            <div
              key={deal.id}
              onClick={() => router.push(`/app/deals/${deal.id}`)}
              className="border border-zinc-800 rounded-lg bg-zinc-950 p-4 hover:bg-zinc-900 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-sm font-medium text-zinc-100">
                    {deal.acquirerSymbol} → {deal.symbol}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono mt-1">
                    {deal.acquirerName} / {deal.companyName}
                  </div>
                  <div className="text-xs text-zinc-600 font-mono mt-2">
                    Status: {deal.status} • Spread: {deal.currentSpread.toFixed(1)}%
                  </div>
                </div>
                <div className="text-amber-500 font-mono text-sm">→</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && ticker && !isSearching && (
        <div className="text-center py-12">
          <p className="text-zinc-500 font-mono text-sm">
            No deals found for &quot;{ticker}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
