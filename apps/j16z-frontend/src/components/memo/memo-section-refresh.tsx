'use client';

import type { Editor, JSONContent } from '@tiptap/react';
import { RefreshCw } from 'lucide-react';
import * as React from 'react';
import { getDeal, getEvents, getMarketSnapshots } from '@/lib/api';
import type { Deal, Event, MarketSnapshot } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RefreshableSection = 'Deal Terms' | 'Regulatory Status' | 'Litigation' | 'Spread History';

interface SectionRefreshButtonProps {
  editor: Editor;
  sectionTitle: RefreshableSection;
  dealId: string;
}

// ---------------------------------------------------------------------------
// Helpers — mirror the scaffold builder shapes
// ---------------------------------------------------------------------------

function paragraph(text?: string): JSONContent {
  if (!text) return { type: 'paragraph' };
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

function bulletList(items: string[]): JSONContent {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraph(item)],
    })),
  };
}

function dealTermsTable(deal: Deal): JSONContent {
  const rows: [string, string][] = [
    ['Acquirer', deal.acquirerName ?? '—'],
    ['Target', deal.companyName ?? '—'],
    ['Consideration', deal.considerationType ?? '—'],
    ['Value', deal.reportedEquityTakeoverValue ? `$${(deal.reportedEquityTakeoverValue / 1e9).toFixed(1)}B` : '—'],
    ['Premium', deal.p_close_base ? `${deal.p_close_base}%` : '—'],
    ['Outside Date', deal.outsideDate ?? '—'],
    ['Status', deal.status ?? '—'],
  ];

  return {
    type: 'table',
    content: rows.map(([field, value]) => ({
      type: 'tableRow',
      content: [
        { type: 'tableHeader', content: [paragraph(field)] },
        { type: 'tableCell', content: [paragraph(value)] },
      ],
    })),
  };
}

function spreadTable(snapshots: MarketSnapshot[]): JSONContent {
  if (snapshots.length === 0) return paragraph('No spread history available.');

  const sorted = [...snapshots].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latest = sorted[0];

  const lines = [
    `Latest spread: ${latest.spread.toFixed(2)}%`,
    `Target price: $${latest.targetPrice.toFixed(2)}`,
    `Offer price: $${latest.offerPrice.toFixed(2)}`,
    `As of: ${new Date(latest.timestamp).toLocaleDateString()}`,
  ];

  return bulletList(lines);
}

// ---------------------------------------------------------------------------
// Build replacement nodes for a section (heading + body)
// ---------------------------------------------------------------------------

async function buildSectionNodes(sectionTitle: RefreshableSection, dealId: string): Promise<JSONContent[]> {
  const heading: JSONContent = {
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: sectionTitle }],
  };

  switch (sectionTitle) {
    case 'Deal Terms': {
      const deal = await getDeal(dealId);
      if (!deal) return [heading, paragraph('Deal not found.')];
      return [heading, dealTermsTable(deal)];
    }
    case 'Regulatory Status': {
      const events: Event[] = await getEvents(dealId);
      const agency = events.filter((e) => e.type === 'AGENCY');
      const body =
        agency.length > 0
          ? bulletList(agency.map((e) => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.title}: ${e.summary}`))
          : paragraph('No regulatory events recorded.');
      return [heading, body];
    }
    case 'Litigation': {
      const events: Event[] = await getEvents(dealId);
      const court = events.filter((e) => e.type === 'COURT');
      const body =
        court.length > 0
          ? bulletList(court.map((e) => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.title}: ${e.summary}`))
          : paragraph('No litigation events recorded.');
      return [heading, body];
    }
    case 'Spread History': {
      const snapshots: MarketSnapshot[] = await getMarketSnapshots(dealId);
      return [heading, spreadTable(snapshots)];
    }
  }
}

// ---------------------------------------------------------------------------
// Find section boundaries in the editor doc
// ---------------------------------------------------------------------------

interface SectionBounds {
  from: number;
  to: number;
}

function findSectionBounds(editor: Editor, sectionTitle: string): SectionBounds | null {
  const doc = editor.state.doc;
  let from = -1;
  let to = -1;

  doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.level === 2) {
      const nodeText = node.textContent;
      if (nodeText === sectionTitle) {
        from = pos;
      } else if (from !== -1 && to === -1) {
        // Found the next H2 — section ends here
        to = pos;
        return false; // stop traversal
      }
    }
    return true;
  });

  if (from === -1) return null;
  if (to === -1) to = doc.content.size; // last section — end of doc

  return { from, to };
}

// ---------------------------------------------------------------------------
// SectionRefreshButton
// ---------------------------------------------------------------------------

export function SectionRefreshButton({ editor, sectionTitle, dealId }: SectionRefreshButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setLoading(true);
    try {
      // Save cursor position
      const savedSelection = editor.state.selection;

      // Build fresh content nodes
      const newNodes = await buildSectionNodes(sectionTitle, dealId);

      // Find section in document
      const bounds = findSectionBounds(editor, sectionTitle);
      if (!bounds) {
        console.warn(`Section "${sectionTitle}" not found in document`);
        return;
      }

      // Create ProseMirror nodes from JSONContent
      const schema = editor.schema;
      const resolvedNodes = newNodes.map((nodeJson) => schema.nodeFromJSON(nodeJson));

      // Build and dispatch transaction
      const tr = editor.state.tr.replaceWith(bounds.from, bounds.to, resolvedNodes);

      // Restore cursor: if inside refreshed section, place at end of section; otherwise restore
      const wasInside = savedSelection.from >= bounds.from && savedSelection.from <= bounds.to;
      if (wasInside) {
        // Place cursor at end of newly inserted content
        const newEnd = bounds.from + resolvedNodes.reduce((acc, n) => acc + n.nodeSize, 0);
        const clampedPos = Math.min(newEnd, tr.doc.content.size);
        const { TextSelection } = await import('@tiptap/pm/state');
        tr.setSelection(TextSelection.near(tr.doc.resolve(clampedPos)));
      }

      editor.view.dispatch(tr);
    } catch (err) {
      console.error(`Refresh failed for section "${sectionTitle}":`, err);
    } finally {
      setLoading(false);
    }
  }, [editor, sectionTitle, dealId]);

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={loading}
      title={`Refresh ${sectionTitle}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono text-text-muted hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SectionRefreshBar — renders all refresh buttons in a grouped row
// ---------------------------------------------------------------------------

interface SectionRefreshBarProps {
  editor: Editor;
  dealId: string;
}

const REFRESHABLE_SECTIONS: RefreshableSection[] = ['Deal Terms', 'Regulatory Status', 'Litigation', 'Spread History'];

export function SectionRefreshBar({ editor, dealId }: SectionRefreshBarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs font-mono text-text-dim mr-1">Refresh:</span>
      {REFRESHABLE_SECTIONS.map((section) => (
        <SectionRefreshButton key={section} editor={editor} sectionTitle={section} dealId={dealId} />
      ))}
    </div>
  );
}
