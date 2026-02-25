# Codebase Structure

**Analysis Date:** 2026-02-25

## Directory Layout

```
j16z/
├── apps/
│   └── j16z-frontend/              # Next.js 16 frontend SPA
│       ├── src/
│       │   ├── app/                # Next.js App Router pages and layouts
│       │   ├── components/         # React components (UI, feature, containers)
│       │   └── lib/                # Business logic, types, utilities, mock data
│       ├── public/                 # Static assets
│       ├── .next/                  # Build output (generated)
│       ├── next.config.ts          # Next.js config
│       ├── tsconfig.json           # TypeScript config with path aliases
│       ├── package.json            # Dependencies and scripts
│       └── .env.local.example      # Environment template
├── packages/                       # Shared workspace packages (empty, reserved)
│   ├── design-system/              # Planned: @j16z/design-system
│   └── utils/                      # Planned: @j16z/utils
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspace definition
├── biome.jsonc                     # Linting and formatting rules
├── tsconfig.json                   # Root TypeScript config
├── vitest.config.ts                # Test runner config
└── .planning/
    └── codebase/                   # This analysis and future planning docs
```

## Directory Purposes

**apps/j16z-frontend/:**
- Purpose: Main Next.js 16 + React 19 SPA for M&A intelligence platform
- Contains: Source code, configuration, dependencies
- Key files: `src/`, `next.config.ts`, `package.json`

**apps/j16z-frontend/src/app/:**
- Purpose: Next.js App Router pages and nested layouts
- Contains: Route files (`page.tsx`) and layout files (`layout.tsx`)
- Key files: Root layout, auth route group, `/app` shell layout, feature pages

**apps/j16z-frontend/src/components/:**
- Purpose: Reusable React components
- Contains: shadcn/ui primitives, feature components, page containers
- Subdirs: `ui/` (primitives), `settings/` (tabs), `inbox/` (sub-components), `breadcrumb/`
- Key files: app-layout.tsx, deal-card.tsx, deal-board.tsx, dashboard.tsx

**apps/j16z-frontend/src/lib/:**
- Purpose: Business logic, domain types, utilities, mock data, scoring systems
- Contains: Type definitions, API abstraction, constants, helper functions
- Key files: types.ts, api.ts, constants.ts, severity-scoring.ts, materiality-scoring.ts

**apps/j16z-frontend/public/:**
- Purpose: Static files served at root (favicons, images, fonts)
- Contains: Assets not imported in code

**packages/design-system/ and packages/utils/:**
- Purpose: Future shared workspace packages (unused)
- Status: Placeholder for monorepo scalability

## Key File Locations

**Entry Points:**

- `apps/j16z-frontend/src/app/layout.tsx` - Root layout with theme setup, fonts, HTML structure
- `apps/j16z-frontend/src/app/page.tsx` - Public landing page
- `apps/j16z-frontend/src/app/app/layout.tsx` - App shell layout (sidebar, header)
- `apps/j16z-frontend/src/app/app/page.tsx` - Redirect target for /app

**Configuration:**

- `apps/j16z-frontend/next.config.ts` - React Compiler enabled
- `apps/j16z-frontend/tsconfig.json` - Path aliases (@/* → src/*), strict mode
- `apps/j16z-frontend/.env.local.example` - Required variables (NEXT_PUBLIC_USE_MOCK_DATA, Supabase keys, API URL)
- `biome.jsonc` - Root linting config (2 space indent, 120 line width, single quotes)

**Core Logic:**

- `apps/j16z-frontend/src/lib/types.ts` - Domain types (Deal, Event, Clause, MarketSnapshot, NewsItem, enums)
- `apps/j16z-frontend/src/lib/api.ts` - Unified API layer with mock/real branching
- `apps/j16z-frontend/src/lib/constants.ts` - Mock data (MOCK_DEALS, MOCK_EVENTS, MOCK_CLAUSES, MOCK_MARKET_SNAPSHOTS)
- `apps/j16z-frontend/src/lib/severity-scoring.ts` - Event urgency calculation (0-100)
- `apps/j16z-frontend/src/lib/materiality-scoring.ts` - Event impact calculation (0-100)
- `apps/j16z-frontend/src/lib/alert-triggers.ts` - Alert rule evaluation logic

**Utilities:**

- `apps/j16z-frontend/src/lib/utils.ts` - Class merging (cn) for Tailwind
- `apps/j16z-frontend/src/lib/date-utils.ts` - Date formatting helpers
- `apps/j16z-frontend/src/lib/file-utils.ts` - CSV/JSON export helpers
- `apps/j16z-frontend/src/lib/read-status.ts` - localStorage tracking for read status

**Page Routes:**

- `apps/j16z-frontend/src/app/app/deals/page.tsx` - Deal list (DealBoard)
- `apps/j16z-frontend/src/app/app/deals/[id]/page.tsx` - Deal detail (DealCard)
- `apps/j16z-frontend/src/app/app/deals/[id]/draft/page.tsx` - Deal research draft
- `apps/j16z-frontend/src/app/app/watchlists/[id]/page.tsx` - Watchlist detail
- `apps/j16z-frontend/src/app/app/feed/page.tsx` - Intelligence feed
- `apps/j16z-frontend/src/app/app/inbox/page.tsx` - Notifications inbox
- `apps/j16z-frontend/src/app/app/intelligence/page.tsx` - Intelligence aggregation
- `apps/j16z-frontend/src/app/app/discovery/page.tsx` - Deal discovery
- `apps/j16z-frontend/src/app/app/settings/page.tsx` - Settings with tabs
- `apps/j16z-frontend/src/app/(auth)/login/page.tsx` - Login form

**Major Components:**

- `apps/j16z-frontend/src/components/app-layout.tsx` - Sidebar, header, command palette wrapper
- `apps/j16z-frontend/src/components/deal-card.tsx` - Single deal detail with spreads, events, clauses
- `apps/j16z-frontend/src/components/deal-board.tsx` - Deal list with filters
- `apps/j16z-frontend/src/components/intelligence-feed.tsx` - Chronological event stream
- `apps/j16z-frontend/src/components/notifications-inbox.tsx` - Inbox container
- `apps/j16z-frontend/src/components/command-palette.tsx` - Cmd+K search/nav
- `apps/j16z-frontend/src/components/dashboard.tsx` - Summary view

**UI Primitives (shadcn/ui):**

- `apps/j16z-frontend/src/components/ui/button.tsx` - CTAs, actions
- `apps/j16z-frontend/src/components/ui/card.tsx` - Content containers
- `apps/j16z-frontend/src/components/ui/input.tsx` - Text input fields
- `apps/j16z-frontend/src/components/ui/dialog.tsx` - Modals
- `apps/j16z-frontend/src/components/ui/dropdown-menu.tsx` - Menus
- `apps/j16z-frontend/src/components/ui/data-table.tsx` - Tanstack React Table wrapper
- `apps/j16z-frontend/src/components/ui/event-timeline.tsx` - Vertical event timeline
- `apps/j16z-frontend/src/components/ui/spread-chart.tsx` - Recharts-based spread visualization

**Settings Tabs:**

- `apps/j16z-frontend/src/components/settings/alert-rules-tab.tsx`
- `apps/j16z-frontend/src/components/settings/api-keys-tab.tsx`
- `apps/j16z-frontend/src/components/settings/integrations-tab.tsx`
- `apps/j16z-frontend/src/components/settings/rss-feeds-tab.tsx`
- `apps/j16z-frontend/src/components/settings/team-tab.tsx`

**Inbox Sub-components:**

- `apps/j16z-frontend/src/components/inbox/inbox-filters.tsx`
- `apps/j16z-frontend/src/components/inbox/inbox-header.tsx`
- `apps/j16z-frontend/src/components/inbox/inbox-side-panel.tsx`
- `apps/j16z-frontend/src/components/inbox/inbox-timeline.tsx`

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention)
- Layout components: `layout.tsx` (Next.js convention)
- Feature components: kebab-case (e.g., `deal-card.tsx`, `command-palette.tsx`)
- UI primitives: kebab-case (e.g., `status-badge.tsx`, `spread-chart.tsx`)
- Utilities: kebab-case (e.g., `date-utils.ts`, `file-utils.ts`)
- Types: `types.ts` (single file per domain area)
- Scoring systems: `{domain}-scoring.ts` (e.g., `severity-scoring.ts`)

**Directories:**
- Feature-specific subdirs: kebab-case (e.g., `settings/`, `inbox/`, `breadcrumb/`)
- Functional groups: descriptor-plural for collections (e.g., `components/`, `lib/`)
- Domain feature pages: kebab-case under `app/app/{feature}/` (e.g., `/deals`, `/watchlists`, `/feed`)
- Dynamic routes: `[param]` brackets (e.g., `[id]` for deal IDs)

**Functions:**
- camelCase: `getDeals()`, `calculateSeverityScore()`, `formatDate()`
- Hooks: `use*` prefix (React convention, though few custom hooks yet)
- Scoring functions: Verb + subject (e.g., `calculateSeverityScore`, `getSeverityLevel`)

**Types/Enums:**
- Interfaces: PascalCase (e.g., `Deal`, `Event`, `Clause`)
- Enums: PascalCase (e.g., `DealStatus`, `Severity`, `EventType`)
- Type unions: PascalCase (e.g., `ConsiderationType`)

**CSS Classes:**
- Utility-first via Tailwind (no custom CSS classes for layout)
- Theme variables as Tailwind tokens (--bg-primary, --text-primary in globals.css)
- Component-specific classes rare (use Tailwind utilities instead)

## Where to Add New Code

**New Feature (e.g., New Page):**
- Primary code: Create page file in `apps/j16z-frontend/src/app/app/{feature}/page.tsx`
- Feature component: Create container in `apps/j16z-frontend/src/components/{feature}.tsx` or `{feature}/` subdirectory
- Types: Add types to `apps/j16z-frontend/src/lib/types.ts` (if new domain entities)
- API: Add fetch functions to `apps/j16z-frontend/src/lib/api.ts` (if new data)
- Mock data: Add to `apps/j16z-frontend/src/lib/constants.ts` (if using mock mode)
- Tests: Create `apps/j16z-frontend/src/components/{feature}.test.tsx` (co-located with component)

**New Component/Module (within existing feature):**
- Implementation: `apps/j16z-frontend/src/components/{name}.tsx` or `{category}/{name}.tsx`
- Export: If part of component library, consider barrel file `index.ts` in subdirectory
- Props interface: Define inline in component file as `{ComponentName}Props`
- Tests: Create `{name}.test.tsx` next to component file

**Utilities/Helpers:**
- Shared helpers: `apps/j16z-frontend/src/lib/utils.ts` (if small, <50 lines)
- Domain helpers: Separate file (e.g., `date-utils.ts`, `file-utils.ts`)
- Math/scoring: Domain-specific file with pure functions (e.g., `severity-scoring.ts`)
- Services: `apps/j16z-frontend/src/lib/services/` subdirectory (e.g., `gemini.ts` for AI)

**Scoring Systems:**
- Location: `apps/j16z-frontend/src/lib/{domain}-scoring.ts`
- Pattern: Export context interface, BASE_SCORES record, pure calculation functions, enum for result type
- See: `severity-scoring.ts`, `materiality-scoring.ts` as templates

**Types:**
- Domain types: `apps/j16z-frontend/src/lib/types.ts` (single source of truth)
- Component prop types: Defined inline in component file as `{ComponentName}Props` interface
- Never spread types across files

## Special Directories

**src/app/:**
- Purpose: Next.js App Router entry point
- Generated: No
- Committed: Yes
- Pattern: Each file/directory is a route segment; `layout.tsx` wraps children; `page.tsx` renders route

**src/components/ui/:**
- Purpose: shadcn/ui component library (new-york style)
- Generated: Initially generated by `shadcn-ui init`, then manually maintained
- Committed: Yes
- Pattern: Copy-paste components from shadcn/ui registry; customize locally as needed

**(auth):**
- Purpose: Route group for authentication pages (no layout inheritance)
- Generated: No
- Committed: Yes
- Pattern: Next.js convention; parentheses hide segment from URL (auth routes at /login, not /auth/login)

**.next/:**
- Purpose: Build output and type generation
- Generated: Yes (by Next.js)
- Committed: No (in .gitignore)

**lib/constants.ts:**
- Purpose: Mock data for development (1400+ lines)
- Generated: No
- Committed: Yes
- Pattern: MOCK_DEALS, MOCK_EVENTS, MOCK_CLAUSES, MOCK_MARKET_SNAPSHOTS as top-level exports

---

*Structure analysis: 2026-02-25*
