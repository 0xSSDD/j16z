import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event } from '@/lib/types';
import { useMemoEventsStore } from '../memo-events-store';

type MemoEventsStoreState = ReturnType<typeof useMemoEventsStore.getState>;
type AddPendingEventInput = Parameters<MemoEventsStoreState['addPendingEvent']>[0];

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

function createPendingInput(overrides: Partial<AddPendingEventInput> = {}): AddPendingEventInput {
  return {
    eventId: 'evt-1',
    event: mockEvent,
    memoId: 'memo-1',
    targetSection: 'Regulatory Status',
    ...overrides,
  };
}

describe('memo-events-store', () => {
  let uuidCounter = 0;

  beforeEach(() => {
    useMemoEventsStore.setState({ pendingEvents: [], sectionTimestamps: [] });
    uuidCounter = 0;
    vi.stubGlobal('crypto', { randomUUID: () => `test-uuid-${++uuidCounter}` });
    vi.useRealTimers();
  });

  it('addPendingEvent adds an event to the store', () => {
    const { addPendingEvent, getPendingForMemo } = useMemoEventsStore.getState();

    addPendingEvent(createPendingInput());

    const pending = getPendingForMemo('memo-1');
    expect(pending).toHaveLength(1);
    expect(pending[0]?.eventId).toBe('evt-1');
    expect(pending[0]?.memoId).toBe('memo-1');
    expect(pending[0]?.id).toBe('test-uuid-1');
  });

  it('addPendingEvent deduplicates by eventId + memoId', () => {
    const { addPendingEvent, getPendingForMemo } = useMemoEventsStore.getState();
    const input = createPendingInput();

    addPendingEvent(input);
    addPendingEvent(input);

    expect(getPendingForMemo('memo-1')).toHaveLength(1);
  });

  it('removePendingEvent removes by id', () => {
    const { addPendingEvent, removePendingEvent, getPendingForMemo } = useMemoEventsStore.getState();

    addPendingEvent(createPendingInput());
    const id = getPendingForMemo('memo-1')[0]?.id;
    if (!id) {
      throw new Error('Expected pending event id');
    }

    removePendingEvent(id);
    expect(getPendingForMemo('memo-1')).toHaveLength(0);
  });

  it('clearPendingForMemo removes only events for specified memoId', () => {
    const { addPendingEvent, clearPendingForMemo, getPendingForMemo } = useMemoEventsStore.getState();

    addPendingEvent(createPendingInput({ memoId: 'memo-1', eventId: 'evt-1' }));
    addPendingEvent(createPendingInput({ memoId: 'memo-2', eventId: 'evt-2', event: { ...mockEvent, id: 'evt-2' } }));

    clearPendingForMemo('memo-1');

    expect(getPendingForMemo('memo-1')).toHaveLength(0);
    expect(getPendingForMemo('memo-2')).toHaveLength(1);
  });

  it('clearPendingForMemo does not remove events for other memoIds', () => {
    const { addPendingEvent, clearPendingForMemo, getPendingForMemo } = useMemoEventsStore.getState();

    addPendingEvent(createPendingInput({ memoId: 'memo-1', eventId: 'evt-1' }));
    addPendingEvent(createPendingInput({ memoId: 'memo-2', eventId: 'evt-2', event: { ...mockEvent, id: 'evt-2' } }));

    clearPendingForMemo('memo-1');

    const memo2Events = getPendingForMemo('memo-2');
    expect(memo2Events).toHaveLength(1);
    expect(memo2Events[0]?.memoId).toBe('memo-2');
  });

  it('setSectionTimestamp creates a new timestamp entry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T10:00:00Z'));

    const { setSectionTimestamp } = useMemoEventsStore.getState();
    setSectionTimestamp('memo-1', 'Regulatory Status');

    const sectionTimestamps = useMemoEventsStore.getState().sectionTimestamps;
    expect(sectionTimestamps).toHaveLength(1);
    expect(sectionTimestamps[0]).toEqual({
      memoId: 'memo-1',
      section: 'Regulatory Status',
      lastRefreshedAt: '2026-03-14T10:00:00.000Z',
    });
  });

  it('setSectionTimestamp updates an existing timestamp entry', () => {
    vi.useFakeTimers();
    const { setSectionTimestamp, getSectionTimestamp } = useMemoEventsStore.getState();

    vi.setSystemTime(new Date('2026-03-14T10:00:00Z'));
    setSectionTimestamp('memo-1', 'Regulatory Status');

    vi.setSystemTime(new Date('2026-03-14T11:00:00Z'));
    setSectionTimestamp('memo-1', 'Regulatory Status');

    const sectionTimestamps = useMemoEventsStore.getState().sectionTimestamps;
    expect(sectionTimestamps).toHaveLength(1);
    expect(getSectionTimestamp('memo-1', 'Regulatory Status')).toBe('2026-03-14T11:00:00.000Z');
  });

  it('getSectionTimestamp returns null for non-existent entry', () => {
    const { getSectionTimestamp } = useMemoEventsStore.getState();
    expect(getSectionTimestamp('memo-1', 'Regulatory Status')).toBeNull();
  });

  it('getSectionTimestamp returns timestamp string for existing entry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T10:00:00Z'));

    const { setSectionTimestamp, getSectionTimestamp } = useMemoEventsStore.getState();
    setSectionTimestamp('memo-1', 'Regulatory Status');

    expect(getSectionTimestamp('memo-1', 'Regulatory Status')).toBe('2026-03-14T10:00:00.000Z');
  });

  it('initSectionTimestamps creates entries for all provided sections', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T10:00:00Z'));

    const { initSectionTimestamps } = useMemoEventsStore.getState();
    initSectionTimestamps('memo-1', ['Regulatory Status', 'Litigation', 'Spread History']);

    const sectionTimestamps = useMemoEventsStore.getState().sectionTimestamps;
    expect(sectionTimestamps).toHaveLength(3);
    expect(sectionTimestamps.map((s) => s.section).sort()).toEqual([
      'Litigation',
      'Regulatory Status',
      'Spread History',
    ]);
  });

  it('initSectionTimestamps does not overwrite existing timestamps', () => {
    vi.useFakeTimers();
    const { setSectionTimestamp, initSectionTimestamps, getSectionTimestamp } = useMemoEventsStore.getState();

    vi.setSystemTime(new Date('2026-03-14T10:00:00Z'));
    setSectionTimestamp('memo-1', 'Regulatory Status');

    vi.setSystemTime(new Date('2026-03-14T12:00:00Z'));
    initSectionTimestamps('memo-1', ['Regulatory Status', 'Litigation']);

    expect(getSectionTimestamp('memo-1', 'Regulatory Status')).toBe('2026-03-14T10:00:00.000Z');
    expect(getSectionTimestamp('memo-1', 'Litigation')).toBe('2026-03-14T12:00:00.000Z');
  });
});
