# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

J16Z is an AI-powered M&A intelligence platform designed to reduce analyst time spent on information gathering. This frontend application is part of a pnpm monorepo located at `/Users/arpan/Documents/j16z`.

**Core Value:** Automatically synthesize SEC filings, court cases, news, and prediction market data into actionable intelligence.

## Development Commands

### From Monorepo Root (`/Users/arpan/Documents/j16z`)
```bash
# Run all apps in development mode
pnpm dev

# Build entire monorepo (packages first, then apps)
pnpm build

# Run tests
pnpm test

# Lint with Biome
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# TypeScript type checking
pnpm check
```

### From Frontend Directory (`/Users/arpan/Documents/j16z/apps/j16z-frontend`)
```bash
# Development server (runs on http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint with ESLint
pnpm lint
```

**Package Manager:** This is a pnpm workspace. Always use `pnpm` (not npm or yarn).

## Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router with React 19)
- **Styling:** Tailwind CSS v4 with custom design tokens
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Icons:** lucide-react
- **Data Fetching:** @tanstack/react-query (configured but not yet integrated)
- **Backend Integration:** @supabase/supabase-js and @supabase/ssr (for auth and data)
- **AI Integration:** @google/genai (Gemini) - implementation pending

### Compiler Features
- **React Compiler:** Enabled (`reactCompiler: true` in next.config.ts)
- Automatically optimizes React components for performance

### Directory Structure
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (no layout)
│   │   └── login/                # Login page
│   ├── app/                      # Protected app route group
│   │   ├── layout.tsx            # Wraps all /app/* routes with AppLayout
│   │   ├── page.tsx              # Dashboard
│   │   ├── chat/                 # AI Analyst chat interface
│   │   ├── feed/                 # Live feed manager
│   │   ├── intelligence/         # Deal intelligence feed
│   │   └── settings/             # User settings
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── page.tsx                  # Landing page (unauthenticated)
│   └── globals.css               # Tailwind imports & design tokens
├── components/
│   ├── ui/                       # shadcn components (button, card, etc.)
│   ├── app-layout.tsx            # Main app shell (sidebar, header)
│   ├── chat-assistant.tsx        # AI chat interface component
│   ├── dashboard.tsx             # Dashboard view
│   ├── feed-manager.tsx          # Feed management UI
│   ├── intelligence-feed.tsx     # Intelligence items display
│   ├── intelligence-item-detail.tsx
│   ├── landing-page.tsx          # Unauthenticated landing
│   ├── login-form.tsx            # Login form component
│   └── settings.tsx              # Settings UI
└── lib/
    ├── constants.ts              # Mock data (MOCK_ITEMS, DATA_SOURCES)
    ├── types.ts                  # TypeScript interfaces (IntelligenceItem, etc.)
    ├── utils.ts                  # Utility functions
    └── services/
        └── gemini.ts             # AI service (TODO: implementation needed)
```

### Routing & Layouts
- **Route Groups:** `(auth)` and `app` directories create logical groups
- **Nested Layouts:** `/app/*` routes automatically get wrapped by `AppLayout` component
- **Client Components:** Most components use `"use client"` directive for interactivity
- **Path Alias:** Use `@/*` to import from `src/*` (configured in tsconfig.json)

### Design System
**Color Variables** (defined in globals.css):
- Uses OKLCH color space for perceptually uniform colors
- Custom design tokens: `--color-text-main`, `--color-text-muted`, `--color-text-dim`
- Surface colors: `--color-background`, `--color-surface`, `--color-surfaceHighlight`
- Theme switching: `.dark` and `.light` classes with CSS custom properties

**Component Library:**
- Based on shadcn/ui "new-york" style
- Components in `src/components/ui/`
- Configured with `components.json` for CLI usage

**Fonts:**
- Geist Sans (primary)
- Geist Mono (code/monospace)
- Loaded via next/font/google in root layout

## Data Model

### Core Types (src/lib/types.ts)
```typescript
// Filing/content types
enum ItemType {
  SEC_FILING, NEWS, LITIGATION, PREDICTION
}

// Priority levels for intelligence items
enum Priority {
  CRITICAL, HIGH, MEDIUM, LOW
}

// Main data structure for M&A intelligence
interface IntelligenceItem {
  id: string
  type: ItemType
  title: string
  source: string
  timestamp: string
  priority: Priority
  ticker?: string
  summary?: string
  content: string
  tags: string[]
  metadata?: { /* filing-specific fields */ }
}

// Data source status tracking
interface DataSource {
  id: string
  name: string
  status: "active" | "pending" | "error"
  type: "api" | "rss" | "websocket"
  itemsToday: number
  lastUpdate: string
}

// Chat interface
interface ChatMessage {
  id: string
  role: "user" | "model"
  content: string
  timestamp: number
  isThinking?: boolean
}
```

### Mock Data
Currently using mock data from `src/lib/constants.ts`:
- `MOCK_ITEMS`: Sample intelligence items (litigation, SEC filings, news, predictions)
- `DATA_SOURCES`: Sample data source statuses

**Important:** Replace mock data with real API calls as backend is implemented.

## State Management

- **Client State:** React hooks (useState, useEffect)
- **Server State (planned):** TanStack Query for data fetching and caching
- **Theme State:** localStorage + CSS classes (dark/light mode in AppLayout)

## Styling Guidelines

### Tailwind Conventions
- Use design tokens from globals.css (e.g., `text-text-main`, `bg-surface`)
- Responsive: Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints
- Dark mode support: Colors automatically adjust via CSS variables

### Component Patterns
- Shadcn components for base UI (Button, Card, Dialog, etc.)
- Custom components build on top of shadcn primitives
- Consistent spacing: Use Tailwind spacing scale (p-4, gap-2, etc.)

## Key Features Currently Implemented

1. **Landing Page** - Unauthenticated homepage
2. **Login Flow** - Basic login UI (auth logic needs Supabase integration)
3. **App Shell** - Sidebar navigation, header, theme toggle
4. **Dashboard** - Stats cards, activity feed, charts (uses mock data)
5. **Intelligence Feed** - Filterable list of M&A intelligence items
6. **AI Chat** - Mock chat interface with "deep research" toggle
7. **Feed Manager** - Data source management UI
8. **Settings** - User preferences and configuration

## Integration Points (To Be Implemented)

### Supabase (Backend & Auth)
- **Dependencies:** `@supabase/supabase-js`, `@supabase/ssr`
- **Usage:** See TechStack.md for database schema and RLS policies
- **Auth Flow:** Email/password, magic links, OAuth (Google)
- **Client Setup:** Create Supabase clients in `src/lib/supabase/`

### Gemini AI Service
- **File:** `src/lib/services/gemini.ts` (currently empty stub)
- **TODO:** Port logic from `j16z-fe-mock/services/geminiService.ts`
- **Integration:** Server Actions or Route Handlers (Next.js API routes)

### TanStack Query
- **Dependency:** Already installed (`@tanstack/react-query`)
- **Setup Needed:** Create QueryClientProvider wrapper in app layout
- **Use Cases:** Fetching intelligence items, company summaries, user watchlists

## Code Conventions

### TypeScript
- Strict mode enabled (`"strict": true`)
- Use interfaces for data structures (see `src/lib/types.ts`)
- Prefer type inference where obvious
- Export types alongside implementation

### React
- Use functional components with hooks
- Mark client components with `"use client"` at top of file
- Server components by default (no directive needed)
- Async Server Components for data fetching (when implemented)

### Imports
- Use `@/` alias for absolute imports from `src/`
- Group imports: external deps → internal modules → components → types
- Example:
  ```typescript
  import { useState } from "react";
  import { Button } from "@/components/ui/button";
  import type { IntelligenceItem } from "@/lib/types";
  ```

### File Naming
- Components: PascalCase (e.g., `AppLayout.tsx`)
- Utilities/libs: kebab-case (e.g., `utils.ts`)
- Pages: Next.js convention (e.g., `page.tsx`, `layout.tsx`)

## Testing

**Current State:** No tests implemented yet
**Monorepo Setup:** Uses Vitest (`pnpm test` from root)

When adding tests:
- Place unit tests alongside source files (e.g., `button.test.tsx`)
- E2E tests: Use Playwright (configured in monorepo root)

## Environment Variables

Required for full functionality (see TechStack.md for complete list):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Server-side only

# Perplexity AI
PERPLEXITY_API_KEY=

# Helicone (AI Monitoring)
HELICONE_API_KEY=

# Resend (Email)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

## Common Workflows

### Adding a New Page
1. Create file in `src/app/[route]/page.tsx`
2. If under `/app/*`, it automatically gets AppLayout
3. Add to sidebar navigation in `src/components/app-layout.tsx`

### Adding a shadcn Component
```bash
cd /Users/arpan/Documents/j16z/apps/j16z-frontend
pnpm dlx shadcn@latest add [component-name]
```

### Creating a New Component
1. Create in `src/components/[name].tsx`
2. Add `"use client"` if it needs interactivity
3. Import types from `@/lib/types`
4. Export as named or default export

### Styling Best Practices
- Use existing color variables (e.g., `text-text-main`, not arbitrary colors)
- Match the monospace/terminal aesthetic (see existing components)
- Dark mode by default (light mode as secondary)

## Project-Specific Patterns

### Theme Implementation
- Uses custom CSS variables in globals.css
- Toggle implemented in AppLayout with localStorage persistence
- Classes: `.dark` (default) and `.light`

### Navigation Structure
Platform section: Dashboard, Live Monitor, Deal Intelligence
Research section: AI Analyst, Prediction Markets, Risk Radar
Bottom: System Config, user profile

### Data Flow (Current Mock Pattern)
1. Component reads from `MOCK_ITEMS` or `DATA_SOURCES` constants
2. State managed locally with useState
3. **Future:** Replace with TanStack Query → Supabase → PostgreSQL

### AI Chat Pattern
- Messages array with `role: "user" | "model"`
- "Thinking" state with animated indicator
- "Deep Research" toggle for enhanced analysis
- Mock responses currently; will integrate Gemini via server routes

## Deployment

**Platform:** Vercel (configured for Next.js)
**Build Command:** `pnpm build`
**Output Directory:** `.next/`
**Node Version:** 20.x (specified in package.json engines if present)

## Related Documentation

- **Monorepo Root:** `/Users/arpan/Documents/j16z/`
- **MVP Spec:** `/Users/arpan/Documents/j16z/j16z-docs/MVP.md`
- **Tech Stack:** `/Users/arpan/Documents/j16z/j16z-docs/TechStack.md`
- **Agent Rules:** `/Users/arpan/Documents/j16z/AGENTS.md` (OpenSpec proposals)
- **README:** `README.md` (basic Next.js template info)

When making architectural changes or adding major features, consult the MVP and TechStack documentation for alignment with overall project goals.
