"use client";

import React, { useState } from "react";
import { Download, Printer, Share2, ShieldAlert, Sparkles, X } from "lucide-react";
import type { IntelligenceItem } from "@/lib/types";

interface DetailViewProps {
  item: IntelligenceItem;
  onClose: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({ item, onClose }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [risks, setRisks] = useState<
    { category: string; severity: string; description: string }[] | null
  >(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRisks, setLoadingRisks] = useState(false);

  const handleSummarize = async () => {
    setLoadingSummary(true);
    // UI-only mock: deterministic canned summary
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSummary(
      "This is a mock Gemini summary for presentation purposes. In the full app, this panel will call the Gemini backend to synthesize regulatory, financial, and strategic implications.",
    );
    setLoadingSummary(false);
  };

  const handleRiskAnalysis = async () => {
    setLoadingRisks(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRisks([
      {
        category: "Regulatory",
        severity: "High",
        description:
          "Transaction likely to face close FTC and DG COMP scrutiny based on market concentration and prior enforcement actions.",
      },
      {
        category: "Execution",
        severity: "Medium",
        description:
          "Integration complexity across data systems and compliance workflows may extend beyond initial guidance.",
      },
    ]);
    setLoadingRisks(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-4xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-4">
            <div className="border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-mono text-slate-400">
              {item.source}
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <span className="text-sm font-mono text-slate-500">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 transition-colors hover:text-white">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="p-2 text-slate-400 transition-colors hover:text-white">
              <Printer className="h-4 w-4" />
            </button>
            <button className="p-2 text-slate-400 transition-colors hover:text-white">
              <Download className="h-4 w-4" />
            </button>
            <div className="mx-2 h-6 w-px bg-slate-800" />
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 gap-8 overflow-auto p-8">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold text-white leading-tight">
              {item.title}
            </h1>
            <div className="mb-8 flex gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-primary-400/20 bg-primary-400/10 px-2 py-0.5 text-xs font-medium text-primary-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <div className="prose prose-invert prose-slate max-w-none leading-relaxed">
              <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {item.content}
              </pre>
            </div>
          </div>

          <div className="w-80 shrink-0 space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  AI Synthesis (Mock)
                </h3>
                {!summary && (
                  <button
                    onClick={handleSummarize}
                    disabled={loadingSummary}
                    className="rounded bg-purple-600 px-2 py-1 text-xs text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loadingSummary ? "Generating..." : "Generate"}
                  </button>
                )}
              </div>
              {summary ? (
                <div className="animate-in fade-in text-sm leading-6 text-slate-300">
                  {summary}
                </div>
              ) : (
                <div className="py-4 text-center text-xs italic text-slate-600">
                  For this demo, the content below is generated locally without
                  calling external APIs.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  Risk Radar (Mock)
                </h3>
                {!risks && (
                  <button
                    onClick={handleRiskAnalysis}
                    disabled={loadingRisks}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                  >
                    {loadingRisks ? "Scanning..." : "Scan"}
                  </button>
                )}
              </div>
              {risks ? (
                <div className="space-y-3 animate-in fade-in">
                  {risks.map((risk, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-slate-800 bg-slate-950 p-3"
                    >
                      <div className="mb-1 flex items-start justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {risk.category}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            risk.severity === "High"
                              ? "bg-rose-500/20 text-rose-500"
                              : risk.severity === "Medium"
                                ? "bg-amber-500/20 text-amber-500"
                                : "bg-blue-500/20 text-blue-500"
                          }`}
                        >
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {risk.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs italic text-slate-600">
                  Scan for Regulatory, Financial, and Reputation risks (mocked
                  output).
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-4 text-sm font-semibold text-white">
                Detected Entities
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs border-b border-slate-800 py-1">
                  <span className="text-slate-400">Microsoft</span>
                  <span className="text-emerald-500">ORG</span>
                </div>
                <div className="flex justify-between text-xs border-b border-slate-800 py-1">
                  <span className="text-slate-400">FTC</span>
                  <span className="text-blue-500">GOV</span>
                </div>
                <div className="flex justify-between text-xs border-b border-slate-800 py-1">
                  <span className="text-slate-400">Activision</span>
                  <span className="text-emerald-500">ORG</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
