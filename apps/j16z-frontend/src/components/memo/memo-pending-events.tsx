'use client';

import type { Editor } from '@tiptap/react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import * as React from 'react';
import { formatEventForInsertion } from '@/lib/memo-sections';
import { useMemoEventsStore } from '@/lib/stores/memo-events-store';
import { findSectionBounds } from './memo-section-refresh';

interface PendingEventsBarProps {
  editor: Editor;
  memoId: string;
  dealId: string;
}

export function PendingEventsBar({ editor, memoId, dealId }: PendingEventsBarProps) {
  const [expanded, setExpanded] = React.useState(false);

  const pendingEvents = useMemoEventsStore((state) => state.pendingEvents);
  const clearPendingForMemo = useMemoEventsStore((state) => state.clearPendingForMemo);
  const setSectionTimestamp = useMemoEventsStore((state) => state.setSectionTimestamp);

  const pendingForMemo = pendingEvents.filter((event) => event.memoId === memoId);

  if (pendingForMemo.length === 0) {
    return null;
  }

  const handleInsertAll = (clickEvent: React.MouseEvent<HTMLButtonElement>) => {
    clickEvent.stopPropagation();

    const groupedBySection = pendingForMemo.reduce<Record<string, typeof pendingForMemo>>((groups, pendingEvent) => {
      if (!groups[pendingEvent.targetSection]) {
        groups[pendingEvent.targetSection] = [];
      }
      groups[pendingEvent.targetSection].push(pendingEvent);
      return groups;
    }, {});

    const insertedSections = new Set<string>();

    for (const [sectionTitle, sectionEvents] of Object.entries(groupedBySection)) {
      const bounds = findSectionBounds(editor, sectionTitle);
      if (!bounds) {
        console.warn(`[PendingEventsBar] Section "${sectionTitle}" not found for deal ${dealId}`);
        continue;
      }

      const formattedNodes = sectionEvents.flatMap((pendingEvent) => formatEventForInsertion(pendingEvent.event));
      if (formattedNodes.length === 0) {
        continue;
      }

      const inserted = editor.chain().insertContentAt(bounds.to, formattedNodes, { updateSelection: false }).run();
      if (inserted) {
        insertedSections.add(sectionTitle);
      }
    }

    for (const sectionTitle of insertedSections) {
      setSectionTimestamp(memoId, sectionTitle);
    }

    clearPendingForMemo(memoId);
  };

  const handleDismiss = (clickEvent: React.MouseEvent<HTMLButtonElement>) => {
    clickEvent.stopPropagation();
    clearPendingForMemo(memoId);
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-2 text-amber-400 text-sm font-mono"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>
            {pendingForMemo.length} event{pendingForMemo.length === 1 ? '' : 's'} pending insertion
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
          )}
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleInsertAll}
            className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-3 py-1 rounded text-xs font-mono transition-colors"
          >
            Insert All
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-text-muted hover:text-text-main px-3 py-1 rounded text-xs font-mono transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {expanded && (
        <ul className="mt-2 border-t border-amber-500/20 pt-2 space-y-1">
          {pendingForMemo.map((pendingEvent) => {
            const eventDate = new Date(pendingEvent.event.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <li key={pendingEvent.id} className="text-xs font-mono text-text-muted">
                <span className="text-amber-400">[{pendingEvent.targetSection}]</span> {pendingEvent.event.title} -{' '}
                {eventDate}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
