import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Event } from '@/lib/types';

// A queued event waiting to be inserted into a memo
interface PendingMemoEvent {
  id: string;
  eventId: string;
  event: Event;
  memoId: string;
  targetSection: string;
  addedAt: string;
}

// Per-section refresh timestamp
interface SectionTimestamp {
  memoId: string;
  section: string;
  lastRefreshedAt: string;
}

interface MemoEventsState {
  pendingEvents: PendingMemoEvent[];
  sectionTimestamps: SectionTimestamp[];
}

interface MemoEventsActions {
  addPendingEvent: (item: Omit<PendingMemoEvent, 'id' | 'addedAt'>) => void;
  removePendingEvent: (id: string) => void;
  clearPendingForMemo: (memoId: string) => void;
  getPendingForMemo: (memoId: string) => PendingMemoEvent[];
  setSectionTimestamp: (memoId: string, section: string) => void;
  getSectionTimestamp: (memoId: string, section: string) => string | null;
  initSectionTimestamps: (memoId: string, sections: readonly string[]) => void;
}

export const useMemoEventsStore = create<MemoEventsState & MemoEventsActions>()(
  persist(
    (set, get) => ({
      pendingEvents: [],
      sectionTimestamps: [],

      addPendingEvent: (item) => {
        set((state) => {
          // Deduplicate by eventId + memoId
          const exists = state.pendingEvents.some((pe) => pe.eventId === item.eventId && pe.memoId === item.memoId);
          if (exists) return state;
          return {
            pendingEvents: [
              ...state.pendingEvents,
              { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() },
            ],
          };
        });
      },

      removePendingEvent: (id) => {
        set((state) => ({
          pendingEvents: state.pendingEvents.filter((pe) => pe.id !== id),
        }));
      },

      clearPendingForMemo: (memoId) => {
        set((state) => ({
          pendingEvents: state.pendingEvents.filter((pe) => pe.memoId !== memoId),
        }));
      },

      getPendingForMemo: (memoId) => {
        return get().pendingEvents.filter((pe) => pe.memoId === memoId);
      },

      setSectionTimestamp: (memoId, section) => {
        set((state) => {
          const filtered = state.sectionTimestamps.filter((st) => !(st.memoId === memoId && st.section === section));
          return {
            sectionTimestamps: [...filtered, { memoId, section, lastRefreshedAt: new Date().toISOString() }],
          };
        });
      },

      getSectionTimestamp: (memoId, section) => {
        const entry = get().sectionTimestamps.find((st) => st.memoId === memoId && st.section === section);
        return entry?.lastRefreshedAt ?? null;
      },

      initSectionTimestamps: (memoId, sections) => {
        set((state) => {
          const existing = state.sectionTimestamps.filter((st) => st.memoId === memoId);
          const existingSections = new Set(existing.map((st) => st.section));
          const now = new Date().toISOString();
          const newEntries = sections
            .filter((s) => !existingSections.has(s))
            .map((section) => ({ memoId, section, lastRefreshedAt: now }));
          if (newEntries.length === 0) return state;
          return {
            sectionTimestamps: [...state.sectionTimestamps, ...newEntries],
          };
        });
      },
    }),
    {
      name: 'j16z-memo-events',
      partialize: (state) => ({
        pendingEvents: state.pendingEvents,
        sectionTimestamps: state.sectionTimestamps,
      }),
    },
  ),
);
