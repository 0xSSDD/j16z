'use client';

import { Check, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createMemo, getClauses, getDeal, getEvents, getMemos } from '@/lib/api';
import { ALL_MEMO_SECTIONS, getTargetSection } from '@/lib/memo-sections';
import { useMemoEventsStore } from '@/lib/stores/memo-events-store';
import type { Deal, Event, Memo } from '@/lib/types';

interface AddToMemoDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function sortByRecent(memos: Memo[]): Memo[] {
  return [...memos].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function formatEventDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AddToMemoDialog({ event, open, onOpenChange }: AddToMemoDialogProps) {
  const router = useRouter();
  const addPendingEvent = useMemoEventsStore((state) => state.addPendingEvent);

  const [memos, setMemos] = useState<Memo[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [selectedMemoId, setSelectedMemoId] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>(ALL_MEMO_SECTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMemos = useCallback(async () => {
    if (!event) return;

    setLoading(true);
    setError(null);

    try {
      const [fetchedMemos, fetchedDeal] = await Promise.all([getMemos(event.dealId), getDeal(event.dealId)]);
      const sortedMemos = sortByRecent(fetchedMemos);

      setDeal(fetchedDeal);
      setMemos(sortedMemos);
      setSelectedMemoId(sortedMemos[0]?.id ?? '');
      setSelectedSection(getTargetSection(event.type));
    } catch {
      setMemos([]);
      setSelectedMemoId('');
      setError('Failed to load memos');
    } finally {
      setLoading(false);
    }
  }, [event]);

  const handleCreateMemo = async () => {
    if (!event || !deal) return;
    setCreating(true);
    try {
      const [clauses, events] = await Promise.all([getClauses(event.dealId), getEvents(event.dealId)]);
      const { generateMemoContent } = await import('@/components/memo/memo-scaffold');
      const content = generateMemoContent(deal, clauses, events);
      const memo = await createMemo({
        dealId: event.dealId,
        title: `${deal.acquirer} / ${deal.target} Memo`,
        content: content as Record<string, unknown>,
      });

      addPendingEvent({
        eventId: event.id,
        event,
        memoId: memo.id,
        targetSection: getTargetSection(event.type),
      });

      onOpenChange(false);
      router.push(`/app/memos/${memo.id}`);
    } catch {
      setError('Failed to create memo');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!open || !event) return;

    void loadMemos();
  }, [open, event, loadMemos]);

  useEffect(() => {
    if (open) return;

    setMemos([]);
    setDeal(null);
    setSelectedMemoId('');
    setSelectedSection(ALL_MEMO_SECTIONS[0]);
    setLoading(false);
    setCreating(false);
    setError(null);
    setAdded(false);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleAdd = () => {
    if (!event || !selectedMemoId || added) return;

    addPendingEvent({
      eventId: event.id,
      event,
      memoId: selectedMemoId,
      targetSection: selectedSection,
    });

    setAdded(true);

    closeTimerRef.current = setTimeout(() => {
      onOpenChange(false);
      closeTimerRef.current = null;
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-surface sm:max-w-[560px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-text-main">Add to Memo</DialogTitle>
          <DialogDescription className="text-text-muted">
            Queue this event for insertion into a memo section.
          </DialogDescription>
        </DialogHeader>

        {event ? (
          <div className="space-y-4">
            <p className="text-sm text-text-main">
              Deal:{' '}
              <span className="text-text-muted">
                {deal ? `${deal.acquirer} / ${deal.target}` : event.dealId}
              </span>
            </p>

            {loading ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-surfaceHighlight p-3 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading memos...
              </div>
            ) : error ? (
              <div className="space-y-3 rounded-md border border-border bg-surfaceHighlight p-3">
                <p className="text-sm text-text-main">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadMemos()}
                  className="rounded-md border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface"
                >
                  Retry
                </button>
              </div>
            ) : memos.length === 0 ? (
              <div className="rounded-md border border-border bg-surfaceHighlight p-3 space-y-3">
                <p className="text-sm text-text-muted">No memos for this deal yet.</p>
                <button
                  type="button"
                  onClick={() => void handleCreateMemo()}
                  disabled={creating || !deal}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {creating ? 'Creating...' : 'Create Memo & Add Event'}
                </button>
              </div>
            ) : (
              <>
                <label className="block space-y-1">
                  <span className="text-sm text-text-main">Memo</span>
                  <select
                    value={selectedMemoId}
                    onChange={(e) => setSelectedMemoId(e.target.value)}
                    className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-main"
                  >
                    {memos.map((memo) => (
                      <option key={memo.id} value={memo.id}>
                        {memo.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-text-main">Section</span>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-main"
                  >
                    {ALL_MEMO_SECTIONS.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <div className="space-y-2">
              <p className="text-sm text-text-main">Preview</p>
              <blockquote className="bg-surfaceHighlight border border-border rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium text-text-main">
                  [{formatEventDate(event.timestamp)}] {event.title}
                </p>
                <p className="text-sm text-text-muted">{event.description}</p>
                <p className="text-xs text-text-muted">- Source: {event.source}</p>
              </blockquote>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No event selected.</p>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surfaceHighlight"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!event || loading || !!error || memos.length === 0 || !selectedMemoId || added}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm text-background transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                Added!
              </>
            ) : (
              'Add to Memo'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
