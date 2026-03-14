# J16Z Frontend — Next.js 16 + React 19

**Generated:** 2026-03-07

## OVERVIEW

Dark-mode intelligence terminal UI. App Router, shadcn/ui (new-york), Tailwind v4. All components are client-side ("use client"). React Compiler enabled — no manual memoization.

## STRUCTURE

```
src/
├── app/                     # App Router pages
│   ├── layout.tsx           # Root layout (fonts, theme script) — RSC
│   ├── page.tsx             # Landing page (/)
│   ├── (auth)/login/        # Login page (route group, no layout)
│   ├── auth/                # Supabase callbacks (confirm, signout)
│   └── app/                 # Protected routes (/app/*)
│       ├── layout.tsx       # App shell — wraps AppLayout (RSC)
│       ├── inbox/           # Default home — materiality-scored event feed
│       ├── deals/           # Deal board + deal card (/deals/[id])
│       ├── watchlists/      # Watchlist management (/watchlists/[id])
│       ├── settings/        # Settings tabs
│       ├── intelligence/    # Intelligence feed
│       ├── discovery/       # Deal discovery pool
│       ├── chat/            # AI chat (mock)
│       └── onboarding/      # First-time firm creation
├── components/
│   ├── ui/                  # Shadcn/Radix primitives (button, card, dialog, data-table...)
│   ├── inbox/               # Inbox sub-components (header, filters, timeline, side-panel)
│   ├── settings/            # Settings tabs (team, api-keys, integrations, rss, alerts)
│   └── [root-level]         # Page-level components (deal-board, deal-card, landing-page...)
├── lib/
│   ├── api.ts               # Mock/real API abstraction (authFetch + JWT)
│   ├── types.ts             # Domain types: Deal, Event, Clause, Filing, MarketSnapshot
│   ├── constants.ts         # Mock data (1381 lines — 52 deals, 11 events, 8 clauses...)
│   ├── materiality-scoring.ts  # Client-side materiality (fallback if DB score missing)
│   ├── severity-scoring.ts  # Event severity (CRITICAL ≥70, WARNING ≥50, INFO <50)
│   ├── read-status.ts       # localStorage read/unread tracking
│   ├── supabase/client.ts   # Browser Supabase client
│   └── supabase/server.ts   # Server Supabase client
└── middleware.ts            # Auth + session refresh on every request
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add page | `src/app/app/{name}/page.tsx` | Must be "use client" |
| Add component | `src/components/{name}.tsx` | "use client" directive required |
| Add shadcn primitive | `src/components/ui/` | `npx shadcn@latest add <name>` from app dir |
| Add API function | `src/lib/api.ts` | Mock branch + real branch |
| Add domain type | `src/lib/types.ts` | Must mirror backend schema.ts |
| Modify mock data | `src/lib/constants.ts` | Grouped by type (deals, events, clauses...) |
| Add scoring logic | `src/lib/materiality-scoring.ts` | Must match Python version exactly |
| Auth config | `src/lib/supabase/` | client.ts (browser), server.ts (middleware) |

## CONVENTIONS

- **All components are "use client"** — no RSC except layouts
- **Shadcn/ui**: new-york style, Lucide icons, CVA for variants
- **Path alias**: `@/` → `src/`
- **Theme**: Dark default. CSS variables in globals.css. Light mode via `.light` class on `<html>`
- **Fonts**: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (mono)
- **State**: localStorage for persistence, useState for local, window events for cross-component (legacy)
- **API abstraction**: `NEXT_PUBLIC_USE_MOCK_DATA=true` returns mock data, `false` calls real API with JWT
- **No React Query / Zustand in use** — both installed but dormant. Use Zustand for new state needs.

## ANTI-PATTERNS

- **NO** new `window.dispatchEvent` usage — use Zustand instead
- **NO** `useRouter` from `next/router` — use `next/navigation`
- **NO** manual `useMemo`/`useCallback` — React Compiler handles it
- **NO** Server Components for interactive pages — use "use client"
- **NO** direct localStorage without error handling — wrap in try/catch

## COMPONENT PATTERNS

**Modal**: Radix Dialog wrapper → props: `isOpen`, `onClose`, optional `onSave`
**Side Panel**: Fixed 400px right panel, Escape to close, auto-read after 5s (inbox)
**Data Table**: TanStack React Table via `<DataTable>` wrapper with column defs
**Filters**: Multi-select dropdowns + FilterChips display, state in localStorage
**Keyboard Shortcuts**: Cmd+K (palette), Shift+? (help), g+x (nav), Cmd+D/E (deal actions)

## SUPABASE AUTH

### Env Vars (March 2026 — new naming)

| Env Var | Purpose |
|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public client key (was `ANON_KEY`), format `sb_publishable_...` |
| `NEXT_PUBLIC_USE_MOCK_DATA` | `true` = mock data, `false` = real API + Supabase auth |
| `NEXT_PUBLIC_API_URL` | Hono API server URL (`http://localhost:3001` in dev) |

### Auth Flow

- `createBrowserClient(URL, PUBLISHABLE_KEY)` in `lib/supabase/client.ts` for client components
- `createServerClient(URL, PUBLISHABLE_KEY)` in `lib/supabase/server.ts` for server components + middleware
- Middleware (`middleware.ts`) refreshes session cookies on every request
- Signout route (`/auth/signout`) clears all `sb-*` cookies

## NOTES

- Landing page (758 lines) has parallax scroll with Recharts — performance sensitive
- Deal card (568 lines) fetches clauses + filings via api.ts, falls back to mock silently
- Deal board (508 lines) uses TanStack Table with pagination, CSV/JSON export
- Middleware skips `/auth/*` routes to avoid interfering with signout flow
- Pre-existing TS errors in `notifications-inbox.tsx` and `event-timeline.tsx` (`.materiality` field)
