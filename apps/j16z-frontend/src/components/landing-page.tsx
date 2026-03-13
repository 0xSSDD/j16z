'use client';

import {
  ArrowRight,
  Bell,
  Building2,
  Database,
  FileText,
  Globe,
  Mail,
  Moon,
  Scale,
  Search,
  Sun,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

// --- MOCK DATA ---
const SPREAD_DATA = [
  { t: '9am', v: 3.2 },
  { t: '10am', v: 3.5 },
  { t: '11am', v: 4.1 },
  { t: '12pm', v: 3.8 },
  { t: '1pm', v: 4.6 },
  { t: '2pm', v: 5.1 },
  { t: '3pm', v: 4.9 },
  { t: '4pm', v: 6.2 },
];

// --- SUBCOMPONENTS ---

const LandingLogo = () => (
  <div className="flex items-center gap-2.5">
    <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-zinc-700 bg-gradient-to-br from-zinc-800 to-black shadow-inner">
      <div className="flex h-4 items-end gap-[2px]">
        <div className="h-2.5 w-1 rounded-sm bg-primary-500/40" />
        <div className="h-4 w-1 rounded-sm bg-primary-500" />
        <div className="h-3 w-1 rounded-sm bg-primary-500/70" />
      </div>
    </div>
    <span className="font-sans text-xl font-bold tracking-tight text-text-main">J16Z</span>
  </div>
);

// --- PRODUCT MOCKUP COMPONENTS ---

/** Inbox mockup — materiality-scored event feed */
const InboxMockup = () => (
  <div className="w-full overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
      <Bell className="h-4 w-4 text-text-muted" />
      <span className="text-sm font-semibold text-text-main">Inbox</span>
      <span className="ml-auto rounded-full bg-primary-500/20 px-2 py-0.5 text-[10px] font-bold text-primary-500">
        3 unread
      </span>
    </div>
    <div className="divide-y divide-border">
      <div className="flex items-start gap-3 bg-primary-500/5 px-4 py-3">
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-text-main">FTC files complaint — Kroger / Albertsons</span>
            <span className="shrink-0 rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-mono text-red-500">
              95
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-text-muted">AGENCY · 2 min ago</p>
        </div>
      </div>
      <div className="flex items-start gap-3 bg-primary-500/5 px-4 py-3">
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-text-main">S-4 registration filed — Adobe / Figma</span>
            <span className="shrink-0 rounded border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-mono text-orange-500">
              80
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-text-muted">FILING · 18 min ago</p>
        </div>
      </div>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full border border-border bg-transparent" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-text-muted">Docket update — Microsoft / Activision case #4921</span>
            <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-text-dim">
              40
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-text-dim">COURT · 1h ago</p>
        </div>
      </div>
    </div>
  </div>
);

/** Deal card mockup — spread chart + key terms */
const DealCardMockup = () => (
  <div className="w-full overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
    <div className="border-b border-border bg-surface px-4 py-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Deal Card</p>
          <p className="text-sm font-bold text-text-main">Kroger / Albertsons</p>
        </div>
        <span className="rounded border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono text-orange-500">
          REGULATORY
        </span>
      </div>
    </div>
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded border border-border bg-surface p-2 text-center">
          <p className="text-[10px] text-text-dim">Spread</p>
          <p className="text-sm font-bold text-emerald-500">6.2%</p>
        </div>
        <div className="rounded border border-border bg-surface p-2 text-center">
          <p className="text-[10px] text-text-dim">p(close)</p>
          <p className="text-sm font-bold text-text-main">38%</p>
        </div>
        <div className="rounded border border-border bg-surface p-2 text-center">
          <p className="text-[10px] text-text-dim">Outside</p>
          <p className="text-sm font-bold text-red-400">28d</p>
        </div>
      </div>
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={SPREAD_DATA}>
            <defs>
              <linearGradient id="spreadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#spreadGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 font-mono text-[10px]">
        <div className="flex justify-between">
          <span className="text-text-dim">Consideration</span>
          <span className="text-text-main">$34.10 / share cash</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-dim">RTF</span>
          <span className="text-text-main">$600M</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-dim">MAE</span>
          <span className="text-primary-500">Standard carve-outs</span>
        </div>
      </div>
    </div>
  </div>
);

/** Alert delivery mockup — email preview style */
const AlertMockup = () => (
  <div className="w-full overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
      <Mail className="h-4 w-4 text-text-muted" />
      <span className="text-sm font-semibold text-text-main">Alert delivery</span>
    </div>
    <div className="space-y-3 p-4">
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Critical Alert</span>
        </div>
        <p className="text-xs font-bold text-text-main">FTC filed complaint — Kroger / Albertsons</p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
          Materiality: 95 · +20 outside date adj · Sent via Email + Slack
        </p>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-dim">
        <Zap className="h-3 w-3" />
        <span>Delivered in &lt;2 min of SEC filing timestamp</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-border bg-surface px-3 py-2 text-center text-[10px]">
          <p className="font-bold text-text-main">Email</p>
          <p className="text-text-dim">via Resend</p>
        </div>
        <div className="rounded border border-border bg-surface px-3 py-2 text-center text-[10px]">
          <p className="font-bold text-text-main">Slack</p>
          <p className="text-text-dim">via Webhook</p>
        </div>
      </div>
    </div>
  </div>
);

/** Memo editor mockup */
const MemoMockup = () => (
  <div className="w-full overflow-hidden rounded-xl border border-border bg-background font-mono shadow-2xl">
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
      <FileText className="h-4 w-4 text-text-muted" />
      <span className="font-body text-sm font-semibold text-text-main">Research Memo</span>
      <span className="ml-auto text-[10px] text-text-dim">Auto-saved</span>
    </div>
    <div className="space-y-3 p-4 text-[11px]">
      <div>
        <p className="font-bold text-primary-500">## Regulatory Analysis</p>
        <p className="mt-1 leading-relaxed text-text-muted">
          The FTC complaint filed 2024-02-26 alleges substantial lessening of competition in 17 states. Based on
          precedent in <span className="text-text-main">FTC v. Sysco (2015)</span>, injunction probability is elevated.
        </p>
      </div>
      <div>
        <p className="font-bold text-primary-500">## Spread Thesis</p>
        <p className="mt-1 leading-relaxed text-text-muted">
          At 6.2% gross spread with 38% p(close), risk-adjusted return implies{' '}
          <span className="text-text-main">-2.3% expected value</span>. Outside date in 28 days.
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="rounded bg-text-main px-3 py-1.5 font-body text-[10px] font-bold text-background"
        >
          Export .docx
        </button>
        <button
          type="button"
          className="rounded border border-border px-3 py-1.5 font-body text-[10px] text-text-muted"
        >
          Export PDF
        </button>
      </div>
    </div>
  </div>
);

// Existing components kept for hero visual
const PolymarketCard = () => (
  <div className="relative w-72 overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-2xl">
    <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-blue-500 to-emerald-500" />
    <div className="mb-2 flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
          P
        </div>
        <span className="text-xs font-bold text-text-main">Prediction Market</span>
      </div>
      <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald-500">
        LIVE
      </span>
    </div>
    <div className="mb-1 text-sm font-bold leading-tight text-text-main">Kroger / Albertsons closes?</div>
    <div className="mb-3 flex items-end gap-2">
      <span className="text-2xl font-bold text-emerald-500">38%</span>
      <span className="mb-1 text-xs text-text-muted">Yes</span>
      <span className="mb-1 ml-auto flex items-center gap-0.5 text-xs text-red-400">
        <TrendingUp className="h-3 w-3" /> -12%
      </span>
    </div>
    <div className="-mx-1 h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={SPREAD_DATA}>
          <defs>
            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#heroGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const SearchResultsCard = () => (
  <div className="flex w-80 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
    <div className="flex items-center gap-3 border-b border-border bg-surfaceHighlight/50 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
        <Search className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          EDGAR · CourtListener · FTC
        </div>
        <div className="text-xs font-medium text-text-main">&quot;reverse termination fee&quot;</div>
      </div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
    </div>
    <div className="space-y-2 p-3">
      <div className="group cursor-pointer rounded border border-border bg-background p-2 transition-colors hover:border-primary-500/30">
        <div className="mb-1 flex items-start justify-between">
          <span className="text-[10px] text-text-muted transition-colors group-hover:text-primary-500">
            SEC EDGAR · 8-K Filing
          </span>
          <FileText className="h-3 w-3 text-text-muted" />
        </div>
        <div className="line-clamp-2 text-xs text-text-main">
          ...Agreement contains a{' '}
          <span className="rounded bg-primary-500/20 px-0.5 text-primary-500">reverse termination fee</span> of
          $1,000,000,000 payable by Parent...
        </div>
      </div>
      <div className="group cursor-pointer rounded border border-border bg-background p-2 transition-colors hover:border-primary-500/30">
        <div className="mb-1 flex items-start justify-between">
          <span className="text-[10px] text-text-muted transition-colors group-hover:text-primary-500">
            CourtListener · Docket
          </span>
          <Globe className="h-3 w-3 text-text-muted" />
        </div>
        <div className="line-clamp-2 text-xs text-text-main">
          Motion to Dismiss DENIED. Court finds plaintiff adequately alleged antitrust injury...
        </div>
      </div>
    </div>
  </div>
);

const SynthesisTerminal = () => (
  <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-background font-mono text-[10px] shadow-2xl sm:text-xs">
    <div className="flex h-8 items-center gap-2 border-b border-border bg-surface px-3">
      <div className="flex gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-zinc-600/50" />
        <div className="h-2.5 w-2.5 rounded-full bg-zinc-600/50" />
      </div>
      <span className="ml-2 text-[10px] text-text-dim">j16z · deal intelligence</span>
      <div className="ml-auto flex items-center gap-2 text-[10px] text-text-muted">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> MONITORING
      </div>
    </div>
    <div className="flex flex-1 flex-col space-y-4 p-6 text-text-muted">
      <div className="flex gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-500/10 text-primary-500">
          <Zap className="h-3 w-3" />
        </div>
        <div className="space-y-1">
          <div className="font-bold text-text-main">Intelligence Ready · Kroger / Albertsons</div>
          <p className="leading-relaxed">
            FTC complaint filed. Spread widened to 6.2%. Outside date 28 days out. p(close) revised to 38%.
          </p>
        </div>
      </div>
      <div className="ml-9 rounded border border-border bg-surfaceHighlight/30 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-dim">Material Events</div>
        <ul className="list-disc space-y-1.5 pl-3">
          <li>
            <span className="text-text-main">FTC:</span> Complaint filed 2024-02-26 · score 95
          </li>
          <li>
            <span className="text-text-main">EDGAR:</span> 8-K amendment filed · score 60
          </li>
          <li>
            <span className="text-text-main">Court:</span> Preliminary injunction briefing scheduled
          </li>
        </ul>
      </div>
      <div className="ml-9 flex gap-2">
        <button type="button" className="rounded bg-text-main px-3 py-1.5 font-bold text-background hover:opacity-90">
          Generate Memo
        </button>
        <button type="button" className="rounded border border-border px-3 py-1.5 hover:bg-surface">
          Export CSV
        </button>
      </div>
    </div>
  </div>
);

// --- MAIN PAGE COMPONENT ---

export const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (!newMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  };

  const yFloat1 = scrollY * -0.1;
  const yFloat2 = scrollY * -0.15;
  const yFloat3 = scrollY * -0.05;

  return (
    <div className="min-h-screen overflow-hidden bg-background font-body text-text-main selection:bg-primary-500/20 selection:text-primary-600">
      {/* Nav */}
      <nav
        className={`fixed top-0 z-50 h-16 w-full transition-all duration-300 ${
          scrolled ? 'border-b border-border bg-background/80 backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <LandingLogo />
          <div className="hidden items-center gap-8 text-sm font-medium text-text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-text-main">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-text-main">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-text-main">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full p-2 text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-main"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              href="/login"
              className="hidden text-sm font-medium text-text-muted transition-colors hover:text-text-main sm:block"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-primary-500 px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          Problem-first: pain → solution → CTA
      ════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative overflow-visible px-6 pb-48 pt-36 preserve-3d lg:pb-64 lg:pt-52">
        {/* Aurora Background */}
        <div className="hero-glow pointer-events-none absolute left-[-10%] top-[-20%] h-[120vh] w-[120%] translate-z-0" />
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.03]" />

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Hero Text */}
          <div className="relative z-10 space-y-8">
            {/* Problem badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surfaceHighlight px-3 py-1 text-xs font-medium text-text-muted backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Analysts spend 3–5 hrs/day chasing fragmented M&amp;A data
            </div>

            <h1 className="font-sans text-5xl font-extrabold leading-[1.0] tracking-tight text-text-main lg:text-7xl">
              Deal intelligence,
              <br />
              <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                made faster.
              </span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-text-muted">
              Stop chasing filings across EDGAR, CourtListener, and FTC press releases. j16z turns fragmented M&amp;A
              data into analyst-ready intelligence — automatically.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-8 py-4 text-sm font-bold text-black shadow-xl shadow-primary-500/20 transition-all hover:scale-105 hover:opacity-90"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface/50 px-8 py-4 text-sm font-bold text-text-main backdrop-blur-sm transition-colors hover:bg-surface"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Hero Visual — floating card stack */}
          <div className="relative hidden h-[680px] perspective-2000 lg:block">
            <div
              className="absolute left-1/2 top-1/2 z-10 h-[380px] w-[480px] -translate-x-1/2 -translate-y-1/2 shadow-2xl"
              style={{ transform: `translate(-50%, -50%) translateY(${yFloat1}px) rotateY(-8deg) rotateX(4deg)` }}
            >
              <SynthesisTerminal />
            </div>
            <div
              className="absolute right-[-5%] top-[8%] z-20 animate-float shadow-xl"
              style={{ animationDelay: '0s', transform: `translateY(${yFloat2}px)` }}
            >
              <PolymarketCard />
            </div>
            <div
              className="absolute bottom-[8%] left-[-10%] z-20 animate-float shadow-xl"
              style={{ animationDelay: '1.5s', transform: `translateY(${yFloat3}px)` }}
            >
              <SearchResultsCard />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-full bg-primary-500/20 opacity-20 blur-[100px] mix-blend-screen" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — FEATURE SHOWCASE
          Rendered product mockups, not static screenshots
      ════════════════════════════════════════════════════════ */}
      <section id="features" className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary-500">Product</p>
            <h2 className="font-sans text-4xl font-bold tracking-tight text-text-main">
              Everything an M&amp;A desk needs,
              <br className="hidden md:block" />
              <span className="text-text-muted"> in one terminal.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Inbox */}
            <div className="flex flex-col gap-4">
              <InboxMockup />
              <div>
                <p className="font-sans text-base font-bold text-text-main">Materiality-scored inbox</p>
                <p className="mt-1 text-sm text-text-muted">
                  All EDGAR, CourtListener, FTC, and market events — ranked by impact so critical signals surface
                  instantly.
                </p>
              </div>
            </div>

            {/* Deal Card */}
            <div className="flex flex-col gap-4">
              <DealCardMockup />
              <div>
                <p className="font-sans text-base font-bold text-text-main">Deal card with live spreads</p>
                <p className="mt-1 text-sm text-text-muted">
                  Spread history, p(close), outside date countdown, auto-extracted terms — all on one card per deal.
                </p>
              </div>
            </div>

            {/* Alerts */}
            <div className="flex flex-col gap-4">
              <AlertMockup />
              <div>
                <p className="font-sans text-base font-bold text-text-main">Instant alert delivery</p>
                <p className="mt-1 text-sm text-text-muted">
                  Critical events fire email + Slack within minutes of appearing in source data. Configurable per deal
                  and analyst.
                </p>
              </div>
            </div>

            {/* Memo */}
            <div className="flex flex-col gap-4">
              <MemoMockup />
              <div>
                <p className="font-sans text-base font-bold text-text-main">Research memos, auto-drafted</p>
                <p className="mt-1 text-sm text-text-muted">
                  Deal context pre-loaded into structured memo templates. Edit, export to .docx or PDF, share with
                  clients.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — HOW IT WORKS
          3-step flow with scroll anchor
      ════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="border-t border-border bg-surface/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary-500">Workflow</p>
            <h2 className="font-sans text-4xl font-bold tracking-tight text-text-main">
              From raw filings to ready intelligence
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-text-muted">
              Three steps. No configuration overhead. No pipeline to maintain.
            </p>
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Connecting line — desktop only */}
            <div className="pointer-events-none absolute left-[33%] right-[33%] top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

            {/* Step 1 */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-500/20 bg-primary-500/10">
                <span className="font-sans text-3xl font-extrabold text-primary-500">1</span>
              </div>
              <h3 className="mb-3 font-sans text-xl font-bold text-text-main">Connect your deal universe</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                Add CIK numbers, watchlist deals, or RSS feeds. j16z begins monitoring from the first setup — no manual
                data entry.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-500/20 bg-primary-500/10">
                <span className="font-sans text-3xl font-extrabold text-primary-500">2</span>
              </div>
              <h3 className="mb-3 font-sans text-xl font-bold text-text-main">We monitor everything</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                SEC EDGAR, CourtListener, FTC/DOJ press releases, and market data polled continuously. Every event
                scored for materiality (0–100).
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-500/20 bg-primary-500/10">
                <span className="font-sans text-3xl font-extrabold text-primary-500">3</span>
              </div>
              <h3 className="mb-3 font-sans text-xl font-bold text-text-main">Get intelligence, not noise</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                Critical alerts via email and Slack. Deal cards with live spreads and extracted terms. Memo drafts and
                CSV exports ready when you need them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — DATA SOURCES
          Authoritative sources, muted/informational
      ════════════════════════════════════════════════════════ */}
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary-500">Data</p>
            <h2 className="font-sans text-4xl font-bold tracking-tight text-text-main">
              Built on authoritative sources
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-text-muted">
              No scraped news aggregators. Primary-source data with full provenance.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* SEC EDGAR */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <p className="mb-1 font-sans font-bold text-text-main">SEC EDGAR</p>
              <p className="text-sm text-text-muted">
                8-K, S-4, DEFM14A, 13D/13G filings ingested as-filed. Deal terms auto-extracted with LLM pipeline.
              </p>
            </div>

            {/* CourtListener */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Scale className="h-5 w-5 text-purple-400" />
              </div>
              <p className="mb-1 font-sans font-bold text-text-main">CourtListener</p>
              <p className="text-sm text-text-muted">
                Merger challenges, shareholder suits, and injunction orders monitored via docket alerts.
              </p>
            </div>

            {/* FTC / DOJ */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <Building2 className="h-5 w-5 text-red-400" />
              </div>
              <p className="mb-1 font-sans font-bold text-text-main">FTC / DOJ Antitrust</p>
              <p className="text-sm text-text-muted">
                Enforcement actions, HSR second requests, and press releases tracked and scored.
              </p>
            </div>

            {/* Market Data */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="mb-1 font-sans font-bold text-text-main">Market Data</p>
              <p className="text-sm text-text-muted">
                Live quotes for gross spread and implied consideration. Spread history charted per deal.
              </p>
            </div>

            {/* RSS / News */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Globe className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mb-1 font-sans font-bold text-text-main">Curated RSS / News</p>
              <p className="text-sm text-text-muted">
                Law-firm alerts, specialist newsletters, and M&amp;A blogs surfaced with materiality scores.
              </p>
            </div>

            {/* Database */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                <Database className="h-5 w-5 text-primary-400" />
              </div>
              <p className="mb-1 font-sans font-bold text-text-main">Structured Exports</p>
              <p className="text-sm text-text-muted">
                CSV exports and API feeds so firms can pipe clean data into internal risk systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — PRICING
          Beta messaging — no tier grid
      ════════════════════════════════════════════════════════ */}
      <section id="pricing" className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary-500">Pricing</p>
            <h2 className="font-sans text-4xl font-bold tracking-tight text-text-main">Pricing</h2>
          </div>

          <div className="mx-auto max-w-md">
            <div className="relative overflow-hidden rounded-2xl border border-primary-500/20 bg-surface p-10 text-center shadow-xl">
              <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-500/8 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-xs font-bold text-primary-500">
                  Currently in beta
                </div>
                <p className="mb-6 text-xl font-bold text-text-main">Reach out for pricing</p>
                <p className="mb-8 text-sm leading-relaxed text-text-muted">
                  We&apos;re working with a small group of merger-arb and event-driven firms during the beta. Pricing is
                  customised per desk size and data requirements.
                </p>
                <a
                  href="mailto:hello@j16z.com"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-8 py-3.5 text-sm font-bold text-black shadow-lg shadow-primary-500/20 transition-all hover:opacity-90"
                >
                  Contact us
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — CTA FOOTER HOOK
      ════════════════════════════════════════════════════════ */}
      <section className="border-t border-border px-6 py-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface px-8 py-20 text-center">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent" />
          <div className="relative z-10 space-y-6">
            <h2 className="font-sans text-4xl font-bold tracking-tight text-text-main md:text-5xl">
              Ready to stop chasing filings?
            </h2>
            <p className="mx-auto max-w-md text-lg text-text-muted">
              Get the full picture on every deal — spreads, filings, court orders, and regulatory actions — before the
              market does.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg bg-primary-500 px-8 py-4 text-sm font-bold text-black shadow-lg shadow-primary-500/20 transition-all hover:scale-105 hover:opacity-90"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:hello@j16z.com"
                className="rounded-lg border border-border bg-background px-8 py-4 text-sm font-bold text-text-main transition-colors hover:bg-surface"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-sm md:flex-row">
          <LandingLogo />
          <div className="flex items-center gap-6 text-text-muted">
            <a href="/privacy" className="transition-colors hover:text-text-main">
              Privacy
            </a>
            <a href="/terms" className="transition-colors hover:text-text-main">
              Terms
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-text-main"
            >
              GitHub
            </a>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-text-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            SYSTEMS OPERATIONAL
          </div>
        </div>
      </footer>
    </div>
  );
};
