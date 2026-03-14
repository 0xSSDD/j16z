'use client';

import { FileText, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { generateMemoContent } from '@/components/memo/memo-scaffold';
import { createMemo, getAllMemos, getClauses, getDeals, getEvents } from '@/lib/api';
import type { Deal, Memo } from '@/lib/types';

type MemoWithDeal = Memo & { dealTitle: string };

export default function MemosPage() {
  const router = useRouter();
  const [memos, setMemos] = React.useState<MemoWithDeal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dealPickerOpen, setDealPickerOpen] = React.useState(false);
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [dealsLoading, setDealsLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const data = await getAllMemos();
        data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setMemos(data);
      } catch (err) {
        console.error('Failed to load memos:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openDealPicker = async () => {
    setDealPickerOpen(true);
    setDealsLoading(true);
    try {
      const d = await getDeals();
      setDeals(d);
    } catch (err) {
      console.error('Failed to load deals:', err);
    } finally {
      setDealsLoading(false);
    }
  };

  const handlePickDeal = async (deal: Deal) => {
    setCreating(true);
    try {
      const [clauses, events] = await Promise.all([getClauses(deal.id), getEvents(deal.id)]);
      const content = generateMemoContent(deal, clauses, events);
      const memo = await createMemo({
        dealId: deal.id,
        title: `${deal.acquirer} / ${deal.target} — Deal Memo`,
        content: content as Record<string, unknown>,
      });
      router.push(`/app/memos/${memo.id}`);
    } catch (err) {
      console.error('Failed to create memo:', err);
      setCreating(false);
      setDealPickerOpen(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-text-main">Memos</h1>
          <p className="text-sm text-text-muted font-mono mt-1">
            {loading ? '...' : `${memos.length} memo${memos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={openDealPicker}
            disabled={creating}
            className="whitespace-nowrap px-4 py-2 bg-primary-500 hover:bg-primary-600 text-background rounded-md font-mono text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {creating ? 'Creating...' : 'New Memo'}
          </button>

          {dealPickerOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default bg-transparent border-0"
                onClick={() => setDealPickerOpen(false)}
                aria-label="Close deal picker"
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-border bg-surface shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Select Deal</span>
                  <button
                    type="button"
                    onClick={() => setDealPickerOpen(false)}
                    className="text-text-dim hover:text-text-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {dealsLoading ? (
                    <div className="px-3 py-4 text-center text-sm text-text-dim font-mono">Loading deals...</div>
                  ) : deals.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-text-dim font-mono">No deals found</div>
                  ) : (
                    deals.map((deal) => (
                      <button
                        type="button"
                        key={deal.id}
                        onClick={() => handlePickDeal(deal)}
                        disabled={creating}
                        className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-surfaceHighlight transition-colors disabled:opacity-50 border-b border-border last:border-b-0"
                      >
                        <span className="text-sm text-text-main font-medium">
                          {deal.acquirer} / {deal.target}
                        </span>
                        <span className="text-xs text-text-dim font-mono">
                          {deal.symbol} → {deal.symbol}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-text-dim font-mono">Loading memos...</div>
        </div>
      ) : memos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FileText className="h-8 w-8 text-text-dim" />
          <p className="text-sm text-text-dim font-mono">No memos yet. Create one from a deal.</p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_100px_100px_80px] gap-4 px-4 py-2.5 bg-surface border-b border-border">
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Deal</span>
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Title</span>
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Visibility</span>
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Updated</span>
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider text-right">Ver</span>
          </div>

          {memos.map((memo) => (
            <button
              type="button"
              key={memo.id}
              onClick={() => router.push(`/app/memos/${memo.id}`)}
              className="grid grid-cols-[1fr_1fr_100px_100px_80px] gap-4 px-4 py-3 w-full text-left hover:bg-surfaceHighlight transition-colors border-b border-border last:border-b-0"
            >
              <span className="text-sm text-text-muted truncate">{memo.dealTitle}</span>
              <span className="text-sm text-text-main font-medium truncate">{memo.title}</span>
              <span>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono ${
                    memo.visibility === 'firm'
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'bg-surface text-text-dim border border-border'
                  }`}
                >
                  {memo.visibility}
                </span>
              </span>
              <span className="text-xs text-text-dim font-mono self-center">{formatDate(memo.updatedAt)}</span>
              <span className="text-xs text-text-dim font-mono text-right self-center">v{memo.version}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
