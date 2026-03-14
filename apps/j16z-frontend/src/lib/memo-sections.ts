import type { JSONContent } from '@tiptap/react';
import type { Event, EventType } from '@/lib/types';

// Event type -> memo section mapping
export const EVENT_TYPE_TO_SECTION: Record<EventType, string> = {
  AGENCY: 'Regulatory Status',
  COURT: 'Litigation',
  FILING: 'Key Clauses',
  SPREAD_MOVE: 'Spread History',
  NEWS: 'Analyst Notes',
};

export function getTargetSection(eventType: EventType): string {
  return EVENT_TYPE_TO_SECTION[eventType] ?? 'Analyst Notes';
}

// Sections that show stale badges (excludes Key Clauses and Analyst Notes)
export const STALE_TRACKABLE_SECTIONS = ['Regulatory Status', 'Litigation', 'Spread History'] as const;

// All H2 section titles in a memo (for section picker dropdown)
export const ALL_MEMO_SECTIONS = [
  'Executive Summary',
  'Deal Terms',
  'Regulatory Status',
  'Litigation',
  'Key Clauses',
  'Spread History',
  'Analyst Notes',
] as const;

// Reverse lookup: given a section title, get all event types that map to it
export function getEventTypesForSection(section: string): EventType[] {
  return (Object.entries(EVENT_TYPE_TO_SECTION) as [EventType, string][])
    .filter(([, s]) => s === section)
    .map(([type]) => type);
}

// Count events newer than lastRefreshedAt that belong to the given section
export function countNewEventsForSection(events: Event[], section: string, lastRefreshedAt: string | null): number {
  const relevantTypes = getEventTypesForSection(section);
  return events.filter((e) => {
    if (!relevantTypes.includes(e.type)) return false;
    if (!lastRefreshedAt) return true;
    return new Date(e.timestamp) > new Date(lastRefreshedAt);
  }).length;
}

// Format an event for insertion into a TipTap memo section
export function formatEventForInsertion(event: Event): JSONContent[] {
  const date = new Date(event.timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const summary = event.description.length > 300 ? `${event.description.slice(0, 297)}...` : event.description;

  return [
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', marks: [{ type: 'bold' }], text: `[${date}] ${event.title}` }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: summary }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'italic' }],
              text: `— Source: ${event.source} | Added from inbox`,
            },
          ],
        },
      ],
    },
  ];
}
