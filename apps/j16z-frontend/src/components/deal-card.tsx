'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { AlertConfigModal } from '@/components/alert-config-modal';
import { DealCardHeader } from '@/components/deal-card/deal-card-header';
import { DealEventSidePanel } from '@/components/deal-card/deal-event-side-panel';
import { EventsTab } from '@/components/deal-card/tabs/events-tab';
import { NewsResearchTab } from '@/components/deal-card/tabs/news-research-tab';
import { RegLitigationTab } from '@/components/deal-card/tabs/reg-litigation-tab';
import { SpreadHistoryTab } from '@/components/deal-card/tabs/spread-history-tab';
import { TermsTab } from '@/components/deal-card/tabs/terms-tab';
import { getClauses, getFilings } from '@/lib/api';
import { MOCK_CLAUSES, MOCK_DEALS, MOCK_EVENTS, MOCK_MARKET_SNAPSHOTS } from '@/lib/constants';
import type { Clause, Filing } from '@/lib/types';

interface DealCardProps {
  dealId: string;
}

const TABS = ['terms', 'events', 'spread-history', 'news-research', 'reg-litigation'] as const;
type TabValue = (typeof TABS)[number];

const TAB_LABELS: Record<TabValue, string> = {
  terms: 'Terms',
  events: 'Events',
  'spread-history': 'Spread History',
  'news-research': 'News & Research',
  'reg-litigation': 'Reg & Litigation',
};

export function DealCard({ dealId }: DealCardProps) {
  const router = useRouter();
  const deal = MOCK_DEALS.find((d) => d.id === dealId);
  const events = MOCK_EVENTS.filter((e) => e.dealId === dealId);
  const marketSnapshots = MOCK_MARKET_SNAPSHOTS.filter((s) => s.dealId === dealId);

  const [clauses, setClauses] = React.useState<Clause[]>([]);
  const [pCloseBase, setPCloseBase] = React.useState(deal?.p_close_base ?? 0);
  const [spreadThreshold, setSpreadThreshold] = React.useState(deal?.spread_entry_threshold ?? 0);
  const [isAlertModalOpen, setIsAlertModalOpen] = React.useState(false);
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  const [filings, setFilings] = React.useState<Filing[]>([]);

  // New tab + sidebar state
  const [activeTab, setActiveTab] = React.useState<TabValue>('terms');
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [focusedEventIndex, setFocusedEventIndex] = React.useState(0);

  // Fetch clauses from real API (falls back to mock data via getClauses when USE_MOCK_DATA=true)
  React.useEffect(() => {
    if (!dealId) return;
    getClauses(dealId)
      .then(setClauses)
      .catch(() => {
        setClauses(MOCK_CLAUSES.filter((c) => c.dealId === dealId));
      });
  }, [dealId]);

  // Fetch filings for this deal (real data only — no mock fallback)
  React.useEffect(() => {
    if (!dealId) return;
    async function fetchFilings() {
      try {
        const data = await getFilings(dealId);
        setFilings(data);
      } catch {
        setFilings([]);
      }
    }
    fetchFilings();
  }, [dealId]);

  const exportDealCSV = () => {
    if (!deal) return;
    const headers = ['Field', 'Value'];
    const rows = [
      ['Deal', `${deal.acquirerSymbol} / ${deal.symbol}`],
      ['Status', deal.status],
      ['Spread', `${deal.currentSpread.toFixed(1)}%`],
      ['p_close', `${deal.p_close_base}%`],
      ['EV', `${deal.ev.toFixed(2)}%`],
      ['Deal Value', `$${(deal.reportedEquityTakeoverValue / 1e9).toFixed(1)}B`],
      ['Announced', deal.announcementDate],
      ['Outside Date', deal.outsideDate],
    ];
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `j16z-deal-${deal.acquirerSymbol}-${deal.symbol}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setIsExportOpen(false);
  };

  const exportDealJSON = () => {
    if (!deal) return;
    const json = JSON.stringify({ deal, events, clauses, marketSnapshots }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `j16z-deal-${deal.acquirerSymbol}-${deal.symbol}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setIsExportOpen(false);
  };

  // Keyboard shortcuts: 1-5 switch tabs, j/k navigate events, Enter open, Esc close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: skip when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.getAttribute('contenteditable') !== null
      ) {
        return;
      }

      // Keys 1-5: switch tabs
      if (!e.metaKey && !e.ctrlKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const idx = Number.parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < TABS.length) {
          setActiveTab(TABS[idx]);
        }
        return;
      }

      // j/k: navigate events (only when on events tab)
      if (activeTab === 'events') {
        if (e.key === 'j') {
          e.preventDefault();
          setFocusedEventIndex((prev) => Math.min(prev + 1, events.length - 1));
        } else if (e.key === 'k') {
          e.preventDefault();
          setFocusedEventIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const focused = events[focusedEventIndex];
          if (focused) {
            setSelectedEventId(focused.id);
          }
        }
      }

      // Esc: close sidebar
      if (e.key === 'Escape') {
        setSelectedEventId(null);
      }

      // Cmd+D: go to draft
      if (e.metaKey && e.key === 'd') {
        e.preventDefault();
        router.push(`/app/deals/${dealId}/draft`);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, events, focusedEventIndex, dealId, router]);

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-mono font-bold text-text-main mb-2">Deal Not Found</h1>
          <p className="text-sm text-text-muted font-mono mb-4">The deal you&apos;re looking for doesn&apos;t exist.</p>
          <button
            type="button"
            onClick={() => router.push('/app/deals')}
            className="px-4 py-2 bg-surface hover:bg-surfaceHighlight text-text-main rounded-md font-mono text-sm transition-colors border border-border"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  // Suppress unused variable warning — filings available for future filings section
  void filings;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header — does NOT scroll away or change per tab */}
      <DealCardHeader
        deal={deal}
        pCloseBase={pCloseBase}
        onPCloseChange={setPCloseBase}
        spreadThreshold={spreadThreshold}
        onSpreadThresholdChange={setSpreadThreshold}
        isExportOpen={isExportOpen}
        onExportToggle={() => setIsExportOpen((prev) => !prev)}
        onExportCSV={exportDealCSV}
        onExportJSON={exportDealJSON}
        onAlertOpen={() => setIsAlertModalOpen(true)}
      />

      {/* Content area: tabs + optional sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main tab content */}
        <div className={`flex-1 overflow-y-auto ${selectedEventId ? 'pr-[400px]' : ''}`}>
          <Tabs.Root value={activeTab} onValueChange={(val) => setActiveTab(val as TabValue)}>
            {/* Tab list */}
            <Tabs.List className="flex items-center border-b border-border px-4 gap-0">
              {TABS.map((tab) => (
                <Tabs.Trigger
                  key={tab}
                  value={tab}
                  className="px-4 py-2.5 text-sm font-mono font-medium text-text-muted hover:text-text-main data-[state=active]:text-text-main data-[state=active]:border-b-2 data-[state=active]:border-aurora-primary transition-colors -mb-px"
                >
                  {TAB_LABELS[tab]}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {/* Tab panels */}
            <Tabs.Content value="terms">
              <TermsTab clauses={clauses} deal={deal} />
            </Tabs.Content>

            <Tabs.Content value="events">
              <EventsTab
                events={events}
                focusedIndex={focusedEventIndex}
                selectedEventId={selectedEventId}
                onSelect={(id) => setSelectedEventId(id)}
                onFocusChange={setFocusedEventIndex}
              />
            </Tabs.Content>

            <Tabs.Content value="spread-history">
              <SpreadHistoryTab dealId={dealId} marketSnapshots={marketSnapshots} events={events} />
            </Tabs.Content>

            <Tabs.Content value="news-research">
              <NewsResearchTab deal={deal} />
            </Tabs.Content>

            <Tabs.Content value="reg-litigation">
              <RegLitigationTab events={events} deal={deal} />
            </Tabs.Content>
          </Tabs.Root>
        </div>

        {/* Event detail sidebar — slides in from right */}
        {selectedEventId && (
          <div className="fixed right-0 top-0 h-full z-20 transition-transform">
            <DealEventSidePanel eventId={selectedEventId} events={events} onClose={() => setSelectedEventId(null)} />
          </div>
        )}
      </div>

      <AlertConfigModal isOpen={isAlertModalOpen} onClose={() => setIsAlertModalOpen(false)} dealId={dealId} />
    </div>
  );
}
