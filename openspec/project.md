# Project Context

## Purpose
J16Z is an AI-powered M&A intelligence terminal.

The goal is to:
- Monitor SEC filings, court dockets, news, and prediction markets.
- Synthesize those sources into actionable, analyst-grade summaries.
- Deliver signal via a web dashboard, daily digests, and alerting workflows.
- Be credible for institutional / $25k-seat-style users (PE, hedge funds, corp dev).

This repo is the **frontend + app shell** for that terminal, structured as a Curator-style monorepo.

## Tech Stack

- **Language**
  - TypeScript, strict mode

- **Monorepo / Tooling**
  - pnpm workspace (`j16z` root)
  - Biome (`@biomejs/biome`) for formatting + lint
  - OpenSpec for spec-driven development (`openspec/`)

- **Frontend**
  - Next.js 16 (App Router, React 19, React Compiler)
  - Tailwind CSS v4
  - shadcn/ui (via new `shadcn` CLI, `components.json`)
  - Lucide icons
  - Recharts for data viz
  - React Query (`@tanstack/react-query`) [planned wiring]

- **Backend / Data**
  - Supabase (Postgres, Auth, storage, RLS) [planned wiring from TechStack.md]
  - Vercel (Next app hosting, Edge functions, cron) [planned]

- **Testing (planned)**
  - Vitest unit tests
  - Playwright E2E

## Project Conventions

### Code Style

- **General**
  - TypeScript everywhere; avoid `any` unless explicitly justified.
  - Prefer functional React components with hooks.
  - Co-locate feature code under `src/app` / `src/components` / `src/lib`.

- **Lint / Format**
  - Biome is the source of truth:
    - `pnpm lint` → `biome check`
    - `pnpm lint:fix` → `biome check --write --unsafe`
  - Tailwind utility classes with semantic groupings (layout → typography → state).

- **Naming**
  - Files: `kebab-case.ts(x)` for components and lib modules.
  - React components: `PascalCase`.
  - Route segments: use Next App Router conventions
    - e.g. `src/app/app/page.tsx`, `src/app/app/feed/page.tsx`.

### Architecture Patterns

- **Monorepo**
  - `apps/` for deployable frontends/backends.
    - `apps/j16z-frontend` — Next.js app.
    - `apps/j16z-backend` — planned Node/TS service (tsup + tsx).
  - `packages/` for shared libraries:
    - `packages/design-system` — shared UI primitives (planned).
    - `packages/utils` — shared domain logic (SEC, RSS, etc.; planned).
  - TS path aliases configured in `tsconfig.base.json`:
    - `@j16z/design-system`, `@j16z/utils`.

- **Frontend routing**
  - App Router:
    - `/` → marketing/landing page (hero “terminal” aesthetic).
    - `/login` → auth screen (“terminal” style login).
    - `/app` → authenticated shell with sidebar + header.
    - `/app/*` → feature pages:
      - `/app` (dashboard)
      - `/app/feed` (data feed manager)
      - `/app/intelligence` (raw intelligence feed)
      - `/app/chat` (AI analyst)
      - `/app/settings` (system configuration).

- **State / Data**
  - Server-side data via Next server components + Supabase client (`@supabase/ssr`) [to be wired].
  - Client-side caching via React Query where interactive filtering is needed.
  - Mock data lives in `src/lib/constants.ts` during early development.

### Testing Strategy

_Currently being set up; target conventions:_

- **Unit tests**
  - Vitest for TypeScript/React units in `apps` and `packages`.
  - One test file per module: `*.test.ts` / `*.test.tsx`.

- **Integration / E2E**
  - Playwright for full flows (login → dashboard → intelligence feed).
  - E2E lives under `apps/j16z-frontend/tests/e2e` (or similar).

- **Contract**
  - When specs exist in `openspec/specs`, tests should map to **Scenarios**.

### Git Workflow

- Single main branch for now: `main`.
- Short-lived feature branches:
  - `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- Prefer squash-and-merge.
- Commit messages:
  - `feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `docs: ...`.
- For spec-driven work:
  - Use `changes/<change-id>` from OpenSpec in branch names when appropriate:
    - e.g. `feat/add-intel-feed-spec`.

## Domain Context

- Sector: **M&A / finance**.
- Primary users:
  - PE / hedge fund analysts.
  - Investment bankers.
  - Corporate development.
- Core workflows:
  - Maintain watchlists of companies.
  - Monitor SEC filings (10-K, 10-Q, 8-K, DEFM14A, 13D/G, etc.).
  - Monitor litigation (CourtListener) and prediction markets (Polymarket, Kalshi).
  - Consume AI-generated summaries + risk analyses.
  - Receive daily digests via email.

## Important Constraints

- **Regulatory / Risk**
  - Output must be grounded in sources (filings, news, court docs).
  - Avoid hallucinated financial claims; include citation surfaces in UI.

- **UX / Brand**
  - “Dark room, bright screen” institutional aesthetic (see `j16z-docs/Design2.md`).
  - High data density; no playful SaaS styling.
  - Layouts must work well on large desktop monitors; mobile is secondary.

- **Technical**
  - Must support React 19 + React Compiler.
  - Tailwind v4 and new shadcn CLI (`shadcn`) are the default.

## External Dependencies

- **Data / Backend**
  - Supabase (Postgres, Auth, storage, RLS; schema + policies from `j16z-docs/TechStack.md`).
  - SEC EDGAR APIs.
  - CourtListener APIs.
  - RSS (likely via Miniflux / internal fetchers).
  - Prediction markets:
    - Polymarket Gamma & CLOB APIs.
    - Kalshi APIs.

- **AI / Email / Observability**
  - Gemini models via `@google/genai` / custom client (currently in the Vite prototype).
  - Perplexity via Helicone gateway (for filing / company summaries).
  - Resend for email (daily digest & alerts).

- **Tooling**
  - OpenSpec CLI (`openspec`) for specs/changes.
  - Biome for lint/format.
  - pnpm as the only package manager.
