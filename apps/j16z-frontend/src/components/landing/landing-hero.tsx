'use client';

import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

const SPREAD_DATA = [
  { d: 1, v: 8.2 },
  { d: 2, v: 7.8 },
  { d: 3, v: 9.1 },
  { d: 4, v: 7.4 },
  { d: 5, v: 6.9 },
  { d: 6, v: 7.2 },
  { d: 7, v: 6.5 },
  { d: 8, v: 6.1 },
  { d: 9, v: 5.8 },
  { d: 10, v: 6.2 },
  { d: 11, v: 5.5 },
  { d: 12, v: 5.9 },
];

const MOCK_EVENTS = [
  {
    score: 95,
    color: 'bg-red-500',
    title: 'FTC Issues Second Request — Kroger/Albertsons',
    source: 'FTC',
    time: '2 min ago',
  },
  {
    score: 80,
    color: 'bg-primary-500',
    title: 'DEFM14A Filed — Revised Consideration Structure',
    source: 'EDGAR',
    time: '18 min ago',
  },
  {
    score: 40,
    color: 'bg-emerald-500',
    title: 'Routine 8-K Amendment — Outside Date Extension',
    source: 'EDGAR',
    time: '1 hr ago',
  },
];

const SOURCES = ['SEC EDGAR', 'CourtListener', 'FTC', 'DOJ', 'PACER'];

const MockTerminal = () => (
  <div className="overflow-hidden rounded-xl border border-border shadow-sm">
    <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
      <span className="size-3 rounded-full bg-text-dim/30" />
      <span className="size-3 rounded-full bg-text-dim/30" />
      <span className="size-3 rounded-full bg-text-dim/30" />
      <span className="ml-3 font-mono text-xs text-text-dim">j16z — intelligence inbox</span>
    </div>

    <div className="bg-background p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-sans text-xs font-medium uppercase tracking-wider text-text-dim">Event Feed</span>
        <span className="font-mono text-xs text-text-dim">3 events</span>
      </div>

      <div className="space-y-1">
        {MOCK_EVENTS.map((evt) => (
          <div
            key={evt.title}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface"
          >
            <span className={`size-2 shrink-0 rounded-full ${evt.color}`} />
            <span className="w-8 font-mono text-xs font-medium text-text-muted">{evt.score}</span>
            <span className="min-w-0 flex-1 truncate font-body text-sm text-text-main">{evt.title}</span>
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
              {evt.source}
            </span>
            <span className="shrink-0 font-body text-xs text-text-dim">{evt.time}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3">
          <span className="font-body text-xs text-text-dim">Active Deals</span>
          <p className="mt-1 font-sans text-xl font-bold text-text-main">52</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <span className="font-body text-xs text-text-dim">Avg. Spread</span>
          <p className="mt-1 font-sans text-xl font-bold text-primary-500">6.2%</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <span className="font-body text-xs text-text-dim">Spread History</span>
          <div className="mt-1 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SPREAD_DATA}>
                <defs>
                  <linearGradient id="heroSpread" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  fill="url(#heroSpread)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TrustBar = () => (
  <div className="border-t border-border">
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-16">
        <span className="size-2 shrink-0 rounded-full bg-primary-500 max-lg:hidden" />
        <p className="shrink-0 font-body text-sm font-medium uppercase tracking-widest text-text-dim">
          Built on primary sources
        </p>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4 lg:gap-x-14">
          {SOURCES.map((src) => (
            <span key={src} className="font-mono text-lg font-medium tracking-wider text-text-muted">
              {src}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const LandingHero = () => (
  <section className="overflow-hidden pt-16">
    <div className="py-20 md:py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="text-center lg:col-span-6 lg:text-left">
            <div className="lg:border-l-2 lg:border-primary-500 lg:pl-6">
              <h1 className="font-sans text-5xl font-extrabold leading-[0.95] tracking-tight text-text-main md:text-6xl lg:text-[4rem]">
                Deal intelligence,
                <br />
                <span className="text-primary-500">made faster.</span>
              </h1>
            </div>

            <p className="mx-auto mt-8 max-w-xl font-body text-lg leading-relaxed text-text-muted lg:mx-0">
              J16Z turns SEC filings, court dockets, and regulatory actions into analyst-ready intelligence,
              automatically.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg bg-primary-500 px-6 py-3 font-body text-sm font-medium text-primary-950 transition-colors hover:bg-primary-400"
              >
                Get Started
                <span className="ml-2">&rarr;</span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-lg border border-border px-6 py-3 font-body text-sm font-medium text-text-main transition-colors hover:bg-surface"
              >
                See How it Works
              </a>
            </div>
          </div>

          <div className="mt-16 lg:col-span-6 lg:mt-0">
            <MockTerminal />
          </div>
        </div>
      </div>
    </div>

    <TrustBar />
  </section>
);
