# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

J16Z is an M&A (Mergers & Acquisitions) Intelligence Platform — a SaaS terminal for tracking deals, regulatory events, litigation, and intelligence sources. Built as a pnpm monorepo.

### Product Vision (MVP)

The platform tracks public M&A deals end-to-end and turns raw regulatory, legal, and market data into **analyst-ready and client-ready outputs** for merger-arb / event-driven and policy-focused firms.

**End outputs j16z must produce:**
- **Deal board** — all tracked deals with spreads, probabilities, regulatory/litigation status, key dates
- **Deal card** — per-deal terms, clauses, event timeline, spreads, qualitative notes
- **Alerts** — email, Slack, webhook on material events
- **Daily/weekly email digests** — summarising changes and interesting deals
- **Research drafts** — memo skeletons analysts can edit into institutional notes
- **Structured data feeds** — CSV/API for firms to pipe into internal systems

### Data Sources

- **SEC EDGAR** (mandatory) — M&A filings: 8-K, S-4, DEFM14A, 13D/13G
- **CourtListener** (mandatory) — litigation: merger challenges, shareholder suits, antitrust cases
- **FTC/DOJ Antitrust** (essential) — enforcement actions, HSR second requests, press releases
- **Market Data API** (paid/freemium) — spreads, implied consideration computation
- **Curated RSS/News** (optional) — law-firm alerts, specialist newsletters, blogs

### Domain Model (Key Entities)

`Company`, `Deal`, `DealClause`, `Filing`, `CourtCase`, `DocketEntry`, `AgencyEvent`, `MarketSnapshot`, `NewsItem`, `Event`, `User`, `Watchlist`, `AlertRule`

**Deal statuses:** ANNOUNCED, REGULATORY_REVIEW, LITIGATION, TERMINATED, CLOSED, UNKNOWN

**Event types:** FILING, COURT, AGENCY, SPREAD, NEWS — each with sub_types and materiality_score (0-100)

**Analyst fields on Deal:** `p_close_base`, `p_break_regulatory`, `p_break_litigation`, `spread_entry_threshold`, `size_bucket`

### Redesign Architecture (Rehaul)

Navigation was consolidated from 9 items to 4: **Inbox, Deals, Watchlists, Settings**.

**Inbox** (default home) — unified event feed sorted by materiality, with CourtListener-style side panel for event detail without page navigation. Replaces old Dashboard + Live Monitor + Notifications.

**Deals** — deal board with grid/list views + deal card with sticky metrics header, event timeline, key terms, probabilities, spread history.

**Watchlists** — coverage management + attached RSS feeds.

**Settings** — consolidated config: Alert Rules, Integrations (Slack/Email/Webhooks), RSS Feeds, Team, API Keys.

### Materiality Scoring System

Events scored 0-100 with adjustments:
- **CRITICAL (>70):** Email + Slack immediate — FTC complaints (95), injunctions (90), second requests (85), S-4 filings (80)
- **WARNING (50-70):** Slack only same day — motions (70), 8-K amendments (60), regulatory approvals (60)
- **INFO (<50):** Inbox only — docket entries (50), routine filings (40), spread moves (<5%), news (10-40)

**Adjustments:** +20 if <30 days to outside_date, +15 if p_close <40%, +10 if litigation >3 cases, -25 if analyst previously marked "not material"

### Key UX Patterns

- **Side panel (CourtListener pattern):** Event detail slides in from right, preserving inbox context
- **Materiality badges:** Color-coded dots (red/orange/yellow) for instant scan prioritization
- **Unread indicators:** Filled vs hollow dots for new vs read events
- **Inline deal context:** Spread and deal info visible on event cards without clicking through

## Commands

```bash
pnpm dev              # Start all apps in parallel (Next.js dev server)
pnpm build            # Build packages first, then apps
pnpm lint             # Biome check (linting + formatting)
pnpm lint:fix         # Biome auto-fix with --write --unsafe
pnpm check            # TypeScript type-checking (tsc -b)
pnpm test             # Vitest (all projects)
pnpm test:be          # Vitest (backend only)
```

Frontend-specific (from `apps/j16z-frontend/`):
```bash
pnpm dev              # Next.js dev server
pnpm build            # Next.js production build
```

## Monorepo Structure

```
apps/
  j16z-frontend/      # Next.js 16 + React 19 frontend (main app)
packages/              # Shared packages (reserved, currently empty)
  design-system/       # @j16z/design-system (planned)
  utils/               # @j16z/utils (planned)
```

Package manager: **pnpm** (v10.18.3). Workspace config in `pnpm-workspace.yaml`.

## Tech Stack

- **Next.js 16** with App Router, React Compiler enabled (`reactCompiler: true` in next.config.ts)
- **React 19** with `"use client"` directives (most components are client-side)
- **Tailwind CSS v4** — theme defined inline in `globals.css` using `@theme`, no separate tailwind.config
- **shadcn/ui** (new-york style) — components in `src/components/ui/`, configured via `components.json`
- **Biome** for linting/formatting (not ESLint for the monorepo — root `biome.jsonc`)
- **TypeScript strict mode** with `exactOptionalPropertyTypes`, `noUnusedLocals`

## Code Style (Biome)

- Indent: 2 spaces, line width: 120
- Single quotes, trailing commas everywhere
- Self-closing elements required
- No parameter assignment, no inferrable types, no unused template literals

## Frontend Architecture (`apps/j16z-frontend/`)

### Routing

App Router with nested layouts:
- `/` — Public landing page (`landing-page.tsx`)
- `/app/*` — Protected app shell with sidebar + header (`app-layout.tsx`)
- `/app/inbox` — Default redirect from `/app`
- `/app/deals/[id]` — Dynamic deal detail pages
- `/app/watchlists/[id]` — Dynamic watchlist pages

### Data Layer

**API abstraction** (`src/lib/api.ts`): All data fetching goes through this layer which switches between mock data and real API calls based on `NEXT_PUBLIC_USE_MOCK_DATA=true`.

**Mock data** lives in `src/lib/constants.ts` (~1400 lines): `MOCK_DEALS`, `MOCK_EVENTS`, `MOCK_CLAUSES`, `MOCK_MARKET_SNAPSHOTS`, etc.

**Types** are in `src/lib/types.ts`. Key domain types: `Deal`, `Event`, `Clause`, `MarketSnapshot`, `NewsItem`.

### State Management

- **localStorage** (via `use-local-storage-state`): theme, read status, filter preferences, command history
- **Zustand**: available, not heavily used yet
- **React Query** (`@tanstack/react-query`): available for data fetching

### Scoring Systems

- `src/lib/severity-scoring.ts` — Event urgency scoring (0-100 → CRITICAL/WARNING/INFO)
- `src/lib/materiality-scoring.ts` — Event materiality for deal impact
- Both use base scores by event subtype with adjustments for timing, risk, and analyst feedback

### Theme System

Dark mode is default. Theme is set via CSS class on `<html>` (adding `light` class). An inline `<script>` in the root layout prevents flash. CSS variables defined in `globals.css`:
- `--bg-primary`, `--bg-surface`, `--text-primary`, `--text-muted`, `--border-color`
- Aurora accent colors: `--aurora-primary` (amber), `--aurora-secondary` (indigo), `--aurora-tertiary` (pink)

Fonts: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (monospace).

### Path Aliases

`@/` maps to `src/` in the frontend app (e.g., `@/components/ui/button`, `@/lib/types`).

## Environment Variables

Copy `.env.local.example` in `apps/j16z-frontend/`:
- `NEXT_PUBLIC_USE_MOCK_DATA=true` — enables mock data mode (default for dev)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase auth (production)
- `NEXT_PUBLIC_API_URL` — API base URL (production)
