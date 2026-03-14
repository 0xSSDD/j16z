/**
 * memo-scaffold.ts
 *
 * Generates a tiptap JSON document pre-filled with live deal data.
 * Used when creating a new memo from a deal card.
 */

import type { JSONContent } from '@tiptap/react';
import type { Clause, Deal, Event } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

function heading(level: 1 | 2 | 3, text: string): JSONContent {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

function paragraph(text?: string): JSONContent {
  if (!text) {
    return { type: 'paragraph' };
  }
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
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

function blockquote(text: string, citation?: string): JSONContent {
  const content: JSONContent[] = [paragraph(text)];
  if (citation) {
    content.push(paragraph(`— ${citation}`));
  }
  return {
    type: 'blockquote',
    content,
  };
}

function dealTermsTable(deal: Deal): JSONContent {
  const rows = [
    ['Acquirer', deal.acquirer ?? '—'],
    ['Target', deal.target ?? '—'],
    ['Consideration', deal.considerationType ?? '—'],
    ['Value', deal.dealValue ? `$${(deal.dealValue / 1e9).toFixed(1)}B` : '—'],
    ['Premium', deal.pCloseBase ? `${deal.pCloseBase}%` : '—'],
    ['Outside Date', deal.outsideDate ?? '—'],
    ['Status', deal.status ?? '—'],
  ];

  const tableRows: JSONContent[] = rows.map(([field, value]) => ({
    type: 'tableRow',
    content: [
      {
        type: 'tableHeader',
        content: [paragraph(field)],
      },
      {
        type: 'tableCell',
        content: [paragraph(value)],
      },
    ],
  }));

  return {
    type: 'table',
    content: tableRows,
  };
}

// ---------------------------------------------------------------------------
// Main scaffold generator
// ---------------------------------------------------------------------------

/**
 * Generates a tiptap JSON document pre-filled with live deal data.
 *
 * Sections (per CONTEXT.md locked decision):
 *   H1: "{acquirer} / {target} -- Deal Memo"
 *   H2: Executive Summary
 *   H2: Deal Terms (table)
 *   H2: Regulatory Status (bullet list of AGENCY events)
 *   H2: Litigation (bullet list of COURT events)
 *   H2: Key Clauses (blockquotes with verbatim text + citation)
 *   H2: Spread History (placeholder)
 *   H2: Analyst Notes (empty paragraph — cursor target)
 */
export function generateMemoContent(deal: Deal, clauses: Clause[], events: Event[]): JSONContent {
  const agencyEvents = events.filter((e) => e.type === 'AGENCY');
  const courtEvents = events.filter((e) => e.type === 'COURT');

  // Executive Summary narrative
  const announcedDate = deal.announcedDate
    ? new Date(deal.announcedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'unknown date';
  const dealValueStr = deal.dealValue ? `$${(deal.dealValue / 1e9).toFixed(1)}B` : 'undisclosed consideration';
  const summaryText = `${deal.acquirer} announced its acquisition of ${deal.target} on ${announcedDate} in a ${deal.considerationType.toLowerCase()} transaction valued at ${dealValueStr}. The deal is currently ${deal.status.toLowerCase().replace(/_/g, ' ')} with an outside date of ${deal.outsideDate ?? 'TBD'}.`;

  const docContent: JSONContent[] = [
    // Title
    heading(1, `${deal.acquirer} / ${deal.target} -- Deal Memo`),

    // Executive Summary
    heading(2, 'Executive Summary'),
    paragraph(summaryText),

    // Deal Terms
    heading(2, 'Deal Terms'),
    dealTermsTable(deal),

    // Regulatory Status
    heading(2, 'Regulatory Status'),
    agencyEvents.length > 0
      ? bulletList(
          agencyEvents.map((e) => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.title}: ${e.description}`),
        )
      : paragraph('No regulatory events recorded.'),

    // Litigation
    heading(2, 'Litigation'),
    courtEvents.length > 0
      ? bulletList(
          courtEvents.map((e) => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.title}: ${e.description}`),
        )
      : paragraph('No litigation events recorded.'),

    // Key Clauses
    heading(2, 'Key Clauses'),
    ...(clauses.length > 0
      ? clauses.flatMap((clause) => {
          const nodes: JSONContent[] = [];
          const verbatim = clause.verbatimText ?? clause.value;
          const title = clause.title ?? clause.type.replace(/_/g, ' ');
          if (verbatim) {
            const citation = clause.sourceLocation ? `${title} — ${clause.sourceLocation}` : title;
            nodes.push(blockquote(verbatim, citation));
          } else {
            nodes.push(paragraph(`${title}: ${clause.summary ?? '—'}`));
          }
          return nodes;
        })
      : [paragraph('No key clauses extracted yet.')]),

    // Spread History
    heading(2, 'Spread History'),
    paragraph('[Refresh to load latest spread data]'),

    // Analyst Notes
    heading(2, 'Analyst Notes'),
    paragraph(), // empty paragraph — cursor starts here after creation
  ];

  return {
    type: 'doc',
    content: docContent,
  };
}
