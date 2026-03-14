'use client';

import { ArrowRight } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

const DEAL_SPREAD = [
  { d: 1, v: 12.1 },
  { d: 2, v: 11.4 },
  { d: 3, v: 10.8 },
  { d: 4, v: 9.2 },
  { d: 5, v: 8.6 },
  { d: 6, v: 7.9 },
  { d: 7, v: 7.1 },
  { d: 8, v: 6.8 },
  { d: 9, v: 6.5 },
  { d: 10, v: 6.2 },
  { d: 11, v: 5.9 },
  { d: 12, v: 6.2 },
];

const INBOX_EVENTS = [
  {
    score: 95,
    dot: 'bg-red-500',
    title: 'FTC Second Request — Kroger/Albertsons',
    source: 'FTC',
    time: '2 min ago',
  },
  {
    score: 80,
    dot: 'bg-primary-500',
    title: 'DEFM14A Filed — Revised Terms',
    source: 'EDGAR',
    time: '18 min ago',
  },
  {
    score: 40,
    dot: 'bg-emerald-500',
    title: '8-K Amendment — Outside Date Extension',
    source: 'EDGAR',
    time: '1 hr ago',
  },
];

const MockInbox = () => (
  <div className="overflow-hidden rounded-xl border border-border">
    <div className="border-b border-border bg-surface px-4 py-2.5">
      <span className="font-sans text-xs font-medium uppercase tracking-wider text-text-dim">Intelligence Inbox</span>
    </div>
    <div className="divide-y divide-border bg-background">
      {INBOX_EVENTS.map((evt) => (
        <div key={evt.title} className="flex items-center gap-3 px-4 py-3">
          <span className={`size-2 shrink-0 rounded-full ${evt.dot}`} />
          <span className="w-8 font-mono text-xs font-medium text-text-muted">{evt.score}</span>
          <span className="min-w-0 flex-1 truncate font-body text-sm text-text-main">{evt.title}</span>
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
            {evt.source}
          </span>
          <span className="shrink-0 font-body text-xs text-text-dim">{evt.time}</span>
        </div>
      ))}
    </div>
  </div>
);

const MockDealCard = () => (
  <div className="overflow-hidden rounded-xl border border-border">
    <div className="border-b border-border bg-surface px-4 py-2.5">
      <span className="font-sans text-xs font-medium uppercase tracking-wider text-text-dim">Deal Card</span>
    </div>
    <div className="bg-background p-4">
      <div className="flex items-baseline justify-between">
        <h4 className="font-sans text-sm font-bold text-text-main">Kroger / Albertsons</h4>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-dim">S-4</span>
      </div>
      <p className="mt-1 font-body text-xs text-text-dim">$24.6B all-cash merger — FTC litigation pending</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border p-2.5 text-center">
          <span className="block font-body text-[10px] text-text-dim">Spread</span>
          <span className="mt-0.5 block font-mono text-base font-bold text-primary-500">6.2%</span>
        </div>
        <div className="rounded-lg border border-border p-2.5 text-center">
          <span className="block font-body text-[10px] text-text-dim">p(close)</span>
          <span className="mt-0.5 block font-mono text-base font-bold text-text-main">38%</span>
        </div>
        <div className="rounded-lg border border-border p-2.5 text-center">
          <span className="block font-body text-[10px] text-text-dim">Outside</span>
          <span className="mt-0.5 block font-mono text-base font-bold text-text-main">28d</span>
        </div>
      </div>

      <div className="mt-3 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DEAL_SPREAD}>
            <defs>
              <linearGradient id="featSpread" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={1.5} fill="url(#featSpread)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between font-mono text-xs">
          <span className="text-text-dim">Consideration</span>
          <span className="text-text-muted">$34.10/sh all-cash</span>
        </div>
        <div className="flex justify-between font-mono text-xs">
          <span className="text-text-dim">Rev. Term. Fee</span>
          <span className="text-text-muted">$600M (2.4%)</span>
        </div>
        <div className="flex justify-between font-mono text-xs">
          <span className="text-text-dim">MAE Clause</span>
          <span className="text-text-muted">Standard + pandemic carve-out</span>
        </div>
      </div>
    </div>
  </div>
);

const MockMemo = () => (
  <div className="overflow-hidden rounded-xl border border-border">
    <div className="border-b border-border bg-surface px-4 py-2.5">
      <span className="font-sans text-xs font-medium uppercase tracking-wider text-text-dim">Research Memo</span>
    </div>
    <div className="bg-background p-4">
      <div className="space-y-3 font-mono text-xs leading-relaxed text-text-muted">
        <div>
          <span className="font-bold text-primary-500">## Regulatory Analysis</span>
          <p className="mt-1 text-text-dim">
            FTC issued Second Request on 12/6. Parties in active litigation since 2/26. Divestiture proposal rejected.
            Probability of injunction estimated at 55-65%.
          </p>
        </div>
        <div>
          <span className="font-bold text-primary-500">## Spread Thesis</span>
          <p className="mt-1 text-text-dim">
            Current spread of 6.2% implies 38% p(close). We see risk/reward skewing negative given FTC posture.
            Recommend monitoring docket 3:24-cv-00347 for hearing schedule updates.
          </p>
        </div>
        <div>
          <span className="font-bold text-primary-500">## Key Dates</span>
          <p className="mt-1 text-text-dim">
            Outside date: April 15, 2026. Trial date: TBD. Next FTC status conference: March 22, 2026.
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <span className="rounded border border-border px-2 py-1 font-body text-[10px] text-text-dim transition-colors hover:text-text-muted">
          Export .docx
        </span>
        <span className="rounded border border-border px-2 py-1 font-body text-[10px] text-text-dim transition-colors hover:text-text-muted">
          Export PDF
        </span>
      </div>
    </div>
  </div>
);

const MockPipeline = () => (
  <div className="overflow-hidden rounded-xl border border-border">
    <div className="border-b border-border bg-surface px-4 py-2.5">
      <span className="font-sans text-xs font-medium uppercase tracking-wider text-text-dim">Data Pipeline</span>
    </div>
    <div className="bg-background p-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-0">
        <div className="flex flex-col gap-2 sm:flex-1">
          {['SEC EDGAR', 'CourtListener', 'FTC / DOJ'].map((src) => (
            <div
              key={src}
              className="rounded-lg border border-border px-3 py-2 text-center font-mono text-xs text-text-muted"
            >
              {src}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center sm:px-4">
          <div className="hidden sm:flex sm:flex-col sm:items-center sm:gap-1">
            <ArrowRight className="size-4 text-text-dim" />
            <ArrowRight className="size-4 text-text-dim" />
            <ArrowRight className="size-4 text-text-dim" />
          </div>
          <div className="flex gap-1 sm:hidden">
            <ArrowRight className="size-4 rotate-90 text-text-dim" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center sm:flex-1">
          <div className="rounded-lg border border-primary-500/30 bg-primary-500/5 px-4 py-3 text-center">
            <span className="block font-sans text-xs font-bold text-primary-500">LangExtract</span>
            <span className="mt-0.5 block font-mono text-[10px] text-text-dim">parse + score + structure</span>
          </div>
        </div>

        <div className="flex items-center justify-center sm:px-4">
          <ArrowRight className="size-4 rotate-90 text-text-dim sm:rotate-0" />
        </div>

        <div className="sm:flex-1">
          <div className="rounded-lg border border-border px-4 py-3 text-center">
            <span className="block font-sans text-xs font-bold text-text-main">Deal Intelligence</span>
            <span className="mt-0.5 block font-mono text-[10px] text-text-dim">terms + events + scores</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const FeatureLabel = ({ number, category }: { number: string; category: string }) => (
  <div className="mb-3 flex items-center gap-2.5">
    <span className="size-1.5 rounded-full bg-primary-500" />
    <span className="font-mono text-sm text-text-dim">[{number}]</span>
    <span className="font-body text-xs font-medium uppercase tracking-widest text-text-dim">/ {category}</span>
  </div>
);

export const LandingFeatures = () => (
  <section id="features" className="py-16 lg:py-24">
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2 lg:p-10">
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <FeatureLabel number="01" category="monitoring" />
              <h3 className="font-sans text-2xl font-bold tracking-tight text-text-main md:text-3xl lg:text-4xl">
                Never miss an event.
              </h3>
              <p className="mt-4 max-w-lg font-body text-base leading-relaxed text-text-muted">
                Every filing, docket, and regulatory action scored 0-100 for materiality. Critical alerts fire via email
                and Slack in under 2 minutes.
              </p>
            </div>
            <div className="mt-8 lg:mt-0">
              <MockInbox />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 lg:p-6">
          <MockDealCard />
          <div className="mt-5">
            <FeatureLabel number="02" category="analytics" />
            <h3 className="font-sans text-xl font-bold tracking-tight text-text-main">Every deal at a glance.</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-text-muted">
              Spreads, probability of close, outside date countdowns, and LLM-extracted terms — all on a single card per
              deal.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 lg:p-6">
          <MockMemo />
          <div className="mt-5">
            <FeatureLabel number="03" category="research" />
            <h3 className="font-sans text-xl font-bold tracking-tight text-text-main">
              From filing to memo in minutes.
            </h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-text-muted">
              Auto-drafted research memos with deal context pre-loaded. Edit in the browser, export to .docx or PDF,
              share with your desk.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2 lg:p-8">
          <div className="lg:grid lg:grid-cols-5 lg:items-center lg:gap-10">
            <div className="lg:col-span-2">
              <FeatureLabel number="04" category="infrastructure" />
              <h3 className="font-sans text-2xl font-bold tracking-tight text-text-main md:text-3xl">
                Powered by LangExtract. Zero manual entry.
              </h3>
              <p className="mt-4 font-body text-base leading-relaxed text-text-muted">
                Our LangExtract pipeline ingests EDGAR filings as-filed and extracts deal terms, clauses, and conditions
                automatically. CourtListener dockets, FTC/DOJ actions, and RSS feeds flow in continuously — structured,
                scored, and ready.
              </p>
            </div>
            <div className="mt-8 lg:col-span-3 lg:mt-0">
              <MockPipeline />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
