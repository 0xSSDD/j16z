'use client';

import Link from 'next/link';

export const MidPageCta = () => (
  <section id="how-it-works" className="bg-surface py-16 lg:py-24">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center lg:text-left">
        <h2 className="font-sans text-3xl font-bold tracking-tight text-text-main md:text-4xl">
          Start with beta access.
        </h2>
        <p className="mt-3 font-body text-base text-text-muted">No credit card. No setup overhead.</p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-primary-500 px-6 py-3 font-body text-sm font-medium text-primary-950 transition-colors hover:bg-primary-400"
          >
            Get Started
            <span className="ml-2">&rarr;</span>
          </Link>
          <a
            href="mailto:hello@j16z.com"
            className="inline-flex items-center rounded-lg border border-border px-6 py-3 font-body text-sm font-medium text-text-main transition-colors hover:bg-surface"
          >
            Contact Us
          </a>
        </div>

        <p className="mt-8 font-mono text-xs tracking-wide text-text-dim">
          Monitoring 500+ active deals across 3 data sources
        </p>
      </div>
    </div>
  </section>
);

export const FinalCta = () => (
  <section id="pricing" className="py-24 lg:py-32">
    <div className="mx-auto max-w-3xl px-6 text-center">
      <h2 className="font-sans text-2xl font-semibold tracking-tight text-text-muted md:text-3xl">
        The intelligence platform for merger-arb desks.
      </h2>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex items-center rounded-lg bg-primary-500 px-6 py-3 font-body text-sm font-medium text-primary-950 transition-colors hover:bg-primary-400"
        >
          Get Started
          <span className="ml-2">&rarr;</span>
        </Link>
        <a
          href="mailto:hello@j16z.com"
          className="inline-flex items-center rounded-lg border border-border px-6 py-3 font-body text-sm font-medium text-text-main transition-colors hover:bg-surface"
        >
          Contact Us
        </a>
      </div>
    </div>
  </section>
);
