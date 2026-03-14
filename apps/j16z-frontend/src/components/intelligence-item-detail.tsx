'use client';

import { Download, Printer, Share2, ShieldAlert, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { IntelligenceItem } from '@/lib/types';

interface DetailViewProps {
  item: IntelligenceItem;
  onClose: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({ item, onClose }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [risks, setRisks] = useState<{ category: string; severity: string; description: string }[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRisks, setLoadingRisks] = useState(false);

  const handleSummarize = async () => {
    setLoadingSummary(true);
    // UI-only mock: deterministic canned summary
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSummary(
      'This is a mock Gemini summary for presentation purposes. In the full app, this panel will call the Gemini backend to synthesize regulatory, financial, and strategic implications.',
    );
    setLoadingSummary(false);
  };

  const handleRiskAnalysis = async () => {
    setLoadingRisks(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRisks([
      {
        category: 'Regulatory',
        severity: 'High',
        description:
          'Transaction likely to face close FTC and DG COMP scrutiny based on market concentration and prior enforcement actions.',
      },
      {
        category: 'Execution',
        severity: 'Medium',
        description:
          'Integration complexity across data systems and compliance workflows may extend beyond initial guidance.',
      },
    ]);
    setLoadingRisks(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-4xl flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
          <div className="flex items-center gap-4">
            <div className="border border-border bg-surfaceHighlight px-2 py-1 text-xs font-mono text-text-muted">
              {item.source}
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-mono text-text-muted">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-text-muted transition-colors hover:text-text-main">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="p-2 text-text-muted transition-colors hover:text-text-main">
              <Printer className="h-4 w-4" />
            </button>
            <button className="p-2 text-text-muted transition-colors hover:text-text-main">
              <Download className="h-4 w-4" />
            </button>
            <div className="mx-2 h-6 w-px bg-border" />
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-muted transition-all hover:bg-surfaceHighlight hover:text-text-main"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 gap-8 overflow-auto p-8">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold text-text-main leading-tight">{item.title}</h1>
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
            <div className="prose prose-invert max-w-none leading-relaxed">
              <pre className="whitespace-pre-wrap text-sm leading-7 text-text-muted">{item.content}</pre>
            </div>
          </div>

          <div className="w-80 shrink-0 space-y-6">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-text-main">
                  <Sparkles className="h-4 w-4 text-text-muted" />
                  AI Synthesis (Mock)
                </h3>
                {!summary && (
                  <button
                    onClick={handleSummarize}
                    disabled={loadingSummary}
                    className="rounded bg-primary-500 px-2 py-1 text-xs text-background transition-colors hover:bg-primary-600 disabled:opacity-50"
                  >
                    {loadingSummary ? 'Generating...' : 'Generate'}
                  </button>
                )}
              </div>
              {summary ? (
                <div className="animate-in fade-in text-sm leading-6 text-text-muted">{summary}</div>
              ) : (
                <div className="py-4 text-center text-xs italic text-text-dim">
                  For this demo, the content below is generated locally without calling external APIs.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-text-main">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  Risk Radar (Mock)
                </h3>
                {!risks && (
                  <button
                    onClick={handleRiskAnalysis}
                    disabled={loadingRisks}
                    className="rounded border border-border bg-surfaceHighlight px-2 py-1 text-xs text-text-main transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    {loadingRisks ? 'Scanning...' : 'Scan'}
                  </button>
                )}
              </div>
              {risks ? (
                <div className="space-y-3 animate-in fade-in">
                  {risks.map((risk, idx) => (
                    <div key={idx} className="rounded border border-border bg-background p-3">
                      <div className="mb-1 flex items-start justify-between">
                        <span className="text-xs font-bold text-text-main">{risk.category}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            risk.severity === 'High'
                              ? 'bg-red-500/20 text-red-500'
                              : risk.severity === 'Medium'
                                ? 'bg-primary-500/20 text-primary-500'
                                : 'bg-primary-500/10 text-primary-500'
                          }`}
                        >
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">{risk.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs italic text-text-dim">
                  Scan for Regulatory, Financial, and Reputation risks (mocked output).
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-4 text-sm font-semibold text-text-main">Detected Entities</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs border-b border-border py-1">
                  <span className="text-text-muted">Microsoft</span>
                  <span className="text-primary-500">ORG</span>
                </div>
                <div className="flex justify-between text-xs border-b border-border py-1">
                  <span className="text-text-muted">FTC</span>
                  <span className="text-primary-500">GOV</span>
                </div>
                <div className="flex justify-between text-xs border-b border-border py-1">
                  <span className="text-text-muted">Activision</span>
                  <span className="text-primary-500">ORG</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
