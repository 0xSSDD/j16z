'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

const FAQ_ITEMS = [
  {
    q: 'What data sources does J16Z monitor?',
    a: 'SEC EDGAR (8-K, S-4, DEFM14A, 13D/13G), CourtListener dockets, FTC/DOJ enforcement actions, curated RSS feeds, and live market data for spread calculations.',
  },
  {
    q: 'How quickly do alerts fire after a new filing?',
    a: 'Critical events (materiality score 70+) trigger email and Slack alerts within 2 minutes of appearing in source data. Thresholds are configurable per deal and analyst.',
  },
  {
    q: 'What is materiality scoring?',
    a: 'Every event is scored 0\u2013100 based on its likely impact on deal outcome. An FTC complaint scores 90+. A routine 8-K amendment scores 20\u201330. Scores power the prioritized inbox and alert thresholds.',
  },
  {
    q: 'What filing types does the LLM pipeline extract?',
    a: 'S-4, DEFM14A, 8-K, and 13D/13G filings. The pipeline extracts deal terms including consideration structure, reverse termination fees, MAE clauses, outside dates, and regulatory conditions.',
  },
  {
    q: 'Is my firm\u2019s data isolated from other firms?',
    a: 'Yes. J16Z enforces multi-tenant isolation at three layers: database row-level security, API middleware extraction, and query-level filtering. Your watchlists, alerts, and memos are invisible to other firms.',
  },
  {
    q: 'Can I export data for internal risk systems?',
    a: 'All deal data exports as CSV or JSON. Structured terms, event histories, and spread data are available via API. Research memos export to .docx and PDF.',
  },
  {
    q: 'Do I need to configure anything to get started?',
    a: 'Add CIK numbers or watchlist deals and J16Z begins monitoring immediately. No pipeline configuration, no manual data entry, no infrastructure to maintain.',
  },
  {
    q: 'Is J16Z available outside the beta?',
    a: 'We\u2019re working with a small group of merger-arb and event-driven firms during the beta. Contact us for access and custom pricing based on desk size and data requirements.',
  },
];

export const LandingFaq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-16">
          <div className="text-center lg:sticky lg:top-24 lg:col-span-4 lg:self-start lg:text-left">
            <h2 className="font-sans text-3xl font-bold tracking-tight text-text-main md:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 font-body text-base leading-relaxed text-text-muted">
              Everything you need to know about J16Z.
            </p>
          </div>

          <div className="mt-12 lg:col-span-8 lg:mt-0">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={item.q} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="flex w-full items-center justify-between py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="pr-4 font-body text-base font-medium text-text-main">{item.q}</span>
                    <Plus
                      className={`size-4 shrink-0 text-text-dim transition-transform duration-300 ${
                        isOpen ? 'rotate-45' : ''
                      }`}
                    />
                  </button>
                  <div className="faq-content" data-open={isOpen}>
                    <div>
                      <p className="pb-5 font-body text-sm leading-relaxed text-text-muted">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
