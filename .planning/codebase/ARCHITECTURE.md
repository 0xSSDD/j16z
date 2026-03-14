# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Next.js 16 Client-Side SPA with Mock-First API Abstraction Layer

**Key Characteristics:**
- Server-Side Rendering (SSR) with isolated client components via `"use client"` directives
- Unified API abstraction layer (`src/lib/api.ts`) that switches between mock data and real API calls via `NEXT_PUBLIC_USE_MOCK_DATA` environment variable
- Domain-driven design with M&A intelligence concepts (Deals, Events, Clauses, Regulatory Flags, Litigation)
- Composite scoring systems for event severity and materiality independent of data source
- Client-side state management via localStorage (theme, read status, filters) and optional Zustand
- React 19 with React Compiler enabled for automatic memoization

## Layers

**Presentation Layer:**
- Purpose: UI components and page containers for user interactions
- Location: `src/app/` and `src/components/`
- Contains: Page routes, layouts, feature components, UI primitives
- Depends on: Service layer (`src/lib/api.ts`), domain types (`src/lib/types.ts`), business logic utilities
- Used by: Next.js App Router

**Service Layer (API Abstraction):**
- Purpose: Unified interface for data access that abstracts between mock and real API
- Location: `src/lib/api.ts`
- Contains: CRUD functions for deals, events, clauses, market snapshots, news (getDeals, getDeal, createDeal, updateDeal, deleteDeal, etc.)
- Depends on: Constants (`src/lib/constants.ts`), types (`src/lib/types.ts`)
- Used by: Page components and feature components

**Domain Model Layer:**
- Purpose: Type definitions and business logic for M&A domain
- Location: `src/lib/types.ts`
- Contains: Deal, Event, Clause, MarketSnapshot, NewsItem types; enums for DealStatus, EventType, Severity, RegulatoryFlag, ConsiderationType
- Depends on: None
- Used by: All other layers

**Business Logic Layer:**
- Purpose: Scoring systems and specialized calculations
- Location: `src/lib/severity-scoring.ts`, `src/lib/materiality-scoring.ts`, `src/lib/alert-triggers.ts`
- Contains: Event severity calculation (0-100 score with context, adjustments for urgency/risk/litigation crowding), materiality scoring, alert trigger evaluation
- Depends on: Types (`src/lib/types.ts`)
- Used by: Components (display-time calculations), future API responses (backend processing)

**Utilities Layer:**
- Purpose: Helper functions for formatting, file handling, state management
- Location: `src/lib/utils.ts`, `src/lib/date-utils.ts`, `src/lib/file-utils.ts`, `src/lib/read-status.ts`
- Contains: Class merging (cn), date formatting, CSV/JSON export, localStorage read status tracking
- Depends on: External libraries (clsx, tailwind-merge, date-fns)
- Used by: Components

**Constants & Mock Data:**
- Purpose: Static mock data for development and testing
- Location: `src/lib/constants.ts` (~1400 lines)
- Contains: MOCK_DEALS, MOCK_EVENTS, MOCK_CLAUSES, MOCK_MARKET_SNAPSHOTS with realistic M&A scenarios
- Depends on: Types (`src/lib/types.ts`)
- Used by: Service layer (api.ts), components

## Data Flow

**Read Flow (Get Deal Details):**

1. User navigates to `/app/deals/[id]`
2. Page route (`src/app/app/deals/[id]/page.tsx`) renders DealCard component
3. DealCard component queries MOCK_DEALS (bypassing api.ts for client-side data)
4. Component derives events, clauses, and market snapshots via MOCK_* lookups
5. Component renders deal info, spreads, events, market data
6. Scoring systems (severity-scoring.ts, materiality-scoring.ts) calculate display scores at render time

**Write Flow (Create/Update Deal):**

1. User submits form in add-deal-modal or updates via deal-card
2. Component calls `createDeal(deal)` or `updateDeal(id, updates)` from `src/lib/api.ts`
3. API layer checks `USE_MOCK_DATA`:
   - If true: Returns mock response with simulated delay (100-200ms)
   - If false: Issues POST/PATCH to `/api/deals` or `/api/deals/{id}`
4. Component receives updated deal object
5. Local state updated, component re-renders

**State Management:**

- **localStorage:** Theme preference, read status markers (via use-local-storage-state), filter selections, command history
- **Component State:** Form fields, modal open/close, UI interactions (React.useState)
- **Zustand (optional):** Available but not heavily used yet; prepared for future global state needs

## Key Abstractions

**Deal:**
- Purpose: Represents an M&A transaction
- Examples: `src/lib/types.ts` (type definition), `src/lib/constants.ts` (MOCK_DEALS)
- Pattern: Immutable type with symbol, acquirer info, regulatory flags, litigation count, spread tracking

**Event:**
- Purpose: Represents a material event affecting deal (filing, court ruling, agency action, spread move, news)
- Examples: `src/lib/types.ts` (type definition), `src/lib/constants.ts` (MOCK_EVENTS)
- Pattern: Immutable type with dealId FK, timestamp, type/subtype hierarchy, severity calculation context

**Severity Scoring:**
- Purpose: Calculate event urgency (0-100) based on type, timing, risk, litigation crowding, analyst feedback
- Examples: `src/lib/severity-scoring.ts` (calculateSeverityScore, getSeverityLevel)
- Pattern: Pure function with context object input; adjustments stack additively; output capped 0-100

**Materiality Scoring:**
- Purpose: Calculate event impact on deal probability/timing (0-100) based on type, timing, risk, analyst feedback
- Examples: `src/lib/materiality-scoring.ts` (similar pattern to severity)
- Pattern: Pure function; supports "material"/"not_material" feedback adjustments

**API Abstraction:**
- Purpose: Unified interface that switches between mock and real API
- Examples: `src/lib/api.ts` (getDeals, getDeal, createDeal, updateDeal, deleteDeals, getEvents, getClauses, getNews)
- Pattern: Environment-based branching; mock calls return immediately after small delay; real calls fetch from endpoints

## Entry Points

**Landing Page:**
- Location: `src/app/page.tsx`
- Triggers: User navigates to `/`
- Responsibilities: Renders LandingPage component (public page, no auth yet)

**App Shell:**
- Location: `src/app/app/layout.tsx` (wraps all `/app/*` routes), renders `AppLayout` component
- Triggers: User navigates to `/app/*`
- Responsibilities: Provides sidebar navigation, header with theme toggle, command palette, badge counts

**Deal List:**
- Location: `src/app/app/deals/page.tsx`
- Triggers: User navigates to `/app/deals`
- Responsibilities: Renders DealBoard component (list/kanban of deals with filtering)

**Deal Detail:**
- Location: `src/app/app/deals/[id]/page.tsx`
- Triggers: User navigates to `/app/deals/{dealId}`
- Responsibilities: Renders DealCard component with spread chart, events timeline, clauses, news section

**Feed:**
- Location: `src/app/app/feed/page.tsx`
- Triggers: User navigates to `/app/feed`
- Responsibilities: Renders IntelligenceFeed component (chronological event stream)

**Inbox:**
- Location: `src/app/app/inbox/page.tsx`
- Triggers: User navigates to `/app/inbox` (default app redirect)
- Responsibilities: Renders NotificationsInbox component with filters, timeline, side panel

**Settings:**
- Location: `src/app/app/settings/page.tsx`
- Triggers: User navigates to `/app/settings`
- Responsibilities: Renders SettingsPage with tabs (Alert Rules, API Keys, Integrations, RSS Feeds, Team)

## Error Handling

**Strategy:** Graceful degradation with try-catch in components; API layer throws on non-ok responses; no global error boundary yet

**Patterns:**
- API functions throw Error on failed fetch (e.g., "Failed to fetch deals")
- Components catch in useEffect with silent failure (event handler setup)
- Component-level loading/error UI not yet standardized (ad-hoc per component)
- Mock data never fails (safe fallback during development)

## Cross-Cutting Concerns

**Logging:** Via console (no external service); informational only during development

**Validation:** React Hook Form + Zod for form inputs; TypeScript strict mode catches type errors at compile time

**Authentication:** Supabase SSR SDK imported but not yet integrated; Auth routes exist (`src/app/(auth)/login/page.tsx`) but not connected to data layer

**Theme:** Dark mode default, light mode opt-in via CSS class on `<html>`, theme stored in localStorage, CSS variables in `globals.css` (--bg-primary, --text-primary, Aurora color palette)

**Internationalization:** None currently; all text in English, hardcoded

---

*Architecture analysis: 2026-02-25*
