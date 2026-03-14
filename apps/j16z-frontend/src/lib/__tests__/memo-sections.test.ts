import { describe, expect, it } from 'vitest';
import {
  countNewEventsForSection,
  formatEventForInsertion,
  getEventTypesForSection,
  getTargetSection,
  STALE_TRACKABLE_SECTIONS,
} from '@/lib/memo-sections';
import type { Event } from '@/lib/types';

const mockEvent: Event = {
  id: 'evt-1',
  dealId: 'deal-1',
  timestamp: '2026-03-14T00:00:00Z',
  type: 'AGENCY',
  subType: 'FTC Filing',
  severity: 'CRITICAL',
  title: 'FTC Issues Second Request',
  description: 'FTC has issued a Second Request for additional information.',
  content: '',
  sourceUrl: 'https://ftc.gov',
  source: 'FTC_GOV',
  materialityScore: 0.9,
};

function createEvent(overrides: Partial<Event>): Event {
  return {
    ...mockEvent,
    ...overrides,
  };
}

describe('memo-sections', () => {
  it('maps AGENCY to Regulatory Status', () => {
    expect(getTargetSection('AGENCY')).toBe('Regulatory Status');
  });

  it('maps COURT to Litigation', () => {
    expect(getTargetSection('COURT')).toBe('Litigation');
  });

  it('maps FILING to Key Clauses', () => {
    expect(getTargetSection('FILING')).toBe('Key Clauses');
  });

  it('maps SPREAD_MOVE to Spread History', () => {
    expect(getTargetSection('SPREAD_MOVE')).toBe('Spread History');
  });

  it('maps NEWS to Analyst Notes', () => {
    expect(getTargetSection('NEWS')).toBe('Analyst Notes');
  });

  it('returns AGENCY for Regulatory Status section', () => {
    expect(getEventTypesForSection('Regulatory Status')).toEqual(['AGENCY']);
  });

  it('returns COURT for Litigation section', () => {
    expect(getEventTypesForSection('Litigation')).toEqual(['COURT']);
  });

  it('returns 0 when no events match section', () => {
    const events = [createEvent({ type: 'NEWS', id: 'evt-news' })];
    expect(countNewEventsForSection(events, 'Regulatory Status', null)).toBe(0);
  });

  it('counts all matching events when lastRefreshedAt is null', () => {
    const events = [
      createEvent({ id: 'evt-a1', type: 'AGENCY', timestamp: '2026-03-10T00:00:00Z' }),
      createEvent({ id: 'evt-a2', type: 'AGENCY', timestamp: '2026-03-11T00:00:00Z' }),
      createEvent({ id: 'evt-c1', type: 'COURT' }),
    ];

    expect(countNewEventsForSection(events, 'Regulatory Status', null)).toBe(2);
  });

  it('counts only events newer than lastRefreshedAt', () => {
    const events = [
      createEvent({ id: 'evt-old', type: 'AGENCY', timestamp: '2026-03-09T00:00:00Z' }),
      createEvent({ id: 'evt-new', type: 'AGENCY', timestamp: '2026-03-15T00:00:00Z' }),
    ];

    expect(countNewEventsForSection(events, 'Regulatory Status', '2026-03-10T00:00:00Z')).toBe(1);
  });

  it('ignores events with wrong type when counting', () => {
    const events = [
      createEvent({ id: 'evt-a', type: 'AGENCY', timestamp: '2026-03-15T00:00:00Z' }),
      createEvent({ id: 'evt-c', type: 'COURT', timestamp: '2026-03-15T00:00:00Z' }),
      createEvent({ id: 'evt-f', type: 'FILING', timestamp: '2026-03-15T00:00:00Z' }),
    ];

    expect(countNewEventsForSection(events, 'Regulatory Status', null)).toBe(1);
  });

  it('tracks stale badges only for selected sections', () => {
    expect(STALE_TRACKABLE_SECTIONS).not.toContain('Analyst Notes');
    expect(STALE_TRACKABLE_SECTIONS).not.toContain('Key Clauses');
    expect(STALE_TRACKABLE_SECTIONS).toContain('Regulatory Status');
    expect(STALE_TRACKABLE_SECTIONS).toContain('Litigation');
    expect(STALE_TRACKABLE_SECTIONS).toContain('Spread History');
  });

  it('formats event for insertion as blockquote node', () => {
    const formatted = formatEventForInsertion(mockEvent);

    expect(formatted).toHaveLength(1);
    expect(formatted[0]?.type).toBe('blockquote');
  });

  it('truncates summary over 300 chars when formatting for insertion', () => {
    const longSummary = 'x'.repeat(400);
    const formatted = formatEventForInsertion(createEvent({ id: 'evt-long', description: longSummary }));

    const block = formatted[0];
    if (!block || !Array.isArray(block.content)) {
      throw new Error('Expected formatted blockquote content');
    }

    const summaryParagraph = block.content[1];
    if (!summaryParagraph || !Array.isArray(summaryParagraph.content)) {
      throw new Error('Expected summary paragraph content');
    }

    const summaryTextNode = summaryParagraph.content[0];
    expect(summaryTextNode?.text).toBeTypeOf('string');
    expect(summaryTextNode?.text).toHaveLength(300);
    expect(summaryTextNode?.text?.endsWith('...')).toBe(true);
  });
});
