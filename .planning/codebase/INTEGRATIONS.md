# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**AI/LLM:**
- Google Generative AI (Gemini) - Planned for intelligence synthesis and analysis
  - SDK/Client: `@google/genai` (1.33.0)
  - Usage: Demo-only output currently in `src/components/chat-assistant.tsx` and `src/components/intelligence-item-detail.tsx`
  - Status: Planned for production integration via server routes

**Authentication & Identity:**
- Supabase - Complete authentication and database solution
  - SDK/Client: `@supabase/supabase-js` (2.87.1) for client-side
  - SSR Integration: `@supabase/ssr` (0.8.0) for Next.js Server Components
  - Environment Variables:
    - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key for client (public)
    - `SUPABASE_SERVICE_ROLE_KEY` - Service role for server-side operations (private)
  - Configuration: Supabase SDK configured for SSR in Next.js

## Data Storage

**Database:**
- Supabase PostgreSQL
  - Connection: Via `@supabase/supabase-js` with environment variables
  - Client: `@supabase/supabase-js` with Supabase SDK
  - Status: Production deployment target; not used in dev mode

**File Storage:**
- Local filesystem - Files generated/downloaded client-side
  - Document export: Word documents via `docx` package (9.5.1)
  - CSV export: Via `papaparse` package (5.5.3)
  - Download handling: `file-saver` package (2.0.5)

**Caching:**
- Browser localStorage (via `use-local-storage-state` 19.5.0)
  - Stores: Theme preference, read status, filter preferences, alert rules, team members, API keys
  - Keys used: `inbox_filters`, `watchlists`, `theme`, `alert_rules`, `team_members`, `api_keys`, `collapsible-*`, `news-notes-*`
- React Query - Available for server state caching (installed but not heavily configured yet)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: Row-level security (RLS) via Supabase PostgreSQL
  - Client-side: Via `@supabase/supabase-js` with SSR support
  - Status: Configured for production; mock data used in development

**Development Mode:**
- `NEXT_PUBLIC_USE_MOCK_DATA=true` - Bypasses API/auth in development
- Mock data location: `src/lib/constants.ts` (~1400 lines)
- Mock data includes: `MOCK_DEALS`, `MOCK_EVENTS`, `MOCK_CLAUSES`, `MOCK_MARKET_SNAPSHOTS`

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service configured

**Logs:**
- Browser console - Direct console logging used in components
- No structured logging service configured

## CI/CD & Deployment

**Hosting:**
- Vercel (primary target for Next.js 16)
- Other Node.js-compatible platforms supported

**CI Pipeline:**
- Not detected - No GitHub Actions/GitLab CI configured in repository
- Biome linting available locally via `pnpm lint` and `pnpm lint:fix`

**Testing:**
- Vitest (4.0.2) - Unit/integration testing at monorepo root
- Playwright (1.57.0) - E2E testing available
- Run via `pnpm test` and `pnpm test:be` (backend only)

## Environment Configuration

**Required env vars (Production):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `NEXT_PUBLIC_API_URL` - Backend API base URL (for non-mock mode)

**Optional env vars (Development):**
- `NEXT_PUBLIC_USE_MOCK_DATA=true` - Enables mock data mode (default for dev)

**Secrets location:**
- `.env.local` files (never committed, listed in `.gitignore`)
- Example template: `apps/j16z-frontend/.env.local.example`

## API Data Fetching

**API Abstraction Layer:**
- Location: `src/lib/api.ts`
- Approach: Conditional switching between mock data (dev) and real API (production)
- Implemented functions:
  - `getDeals()` - Fetch all deals
  - `getDeal(id)` - Fetch single deal
  - `getEvents(dealId)` - Fetch events for deal
  - `getAllEvents()` - Fetch all events
  - `getClauses(dealId)` - Fetch deal clauses
  - `getMarketSnapshots(dealId)` - Fetch market spread history
  - `getNews(dealId)` - Fetch news items (currently returns empty array in mock mode)
  - `createDeal(deal)` - Create new deal
  - `updateDeal(id, updates)` - Update existing deal
  - `deleteDeal(id)` - Delete deal
- Status: Framework in place; production endpoints marked with `TODO` comments
- Simulated latency: 100ms for reads, 200ms for writes

**State Query/Management:**
- React Query available for caching (`@tanstack/react-query` 5.90.12)
- Zustand available for client state (`zustand` 5.0.9)
- Currently: Data fetching happens directly in components with manual caching via localStorage

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook receivers configured

**Outgoing:**
- Not detected - No outgoing webhook integrations configured

## Type System

**Core Types Location:**
- `src/lib/types.ts` - Domain types

**Key types:**
- `Deal` - M&A deal information
- `Event` - Regulatory/business events
- `Clause` - Deal clause tracking
- `MarketSnapshot` - Spread history points
- `NewsItem` - News articles

---

*Integration audit: 2026-02-25*
