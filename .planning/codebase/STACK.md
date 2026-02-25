# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- TypeScript 5.9 - Strict mode with `exactOptionalPropertyTypes` and `noUnusedLocals` enforced. Used for entire codebase (`.ts` and `.tsx` files).
- JavaScript - Modern ES modules (`type: "module"` in `package.json`)

**Secondary:**
- CSS - Tailwind CSS v4 with custom theme variables
- HTML - JSX/TSX templates in Next.js

## Runtime

**Environment:**
- Node.js 22.12.0 (verified at time of mapping; compatible with v20+)

**Package Manager:**
- pnpm 10.18.3 (specified in `package.json` packageManager field)
- Lockfile: `pnpm-lock.yaml` (v9.0)

## Frameworks

**Core:**
- Next.js 16.0.10 - App Router with React Compiler enabled (`reactCompiler: true` in `next.config.ts`). Entry point: `apps/j16z-frontend/`

**UI & Styling:**
- React 19.2.1 - Latest stable with Server Components. Most components use `"use client"` directives.
- Tailwind CSS 4.0 - Theme defined inline in `src/app/globals.css` using `@theme` syntax; no separate tailwind.config
- shadcn/ui 0.9.5 - New-york style components from `src/components/ui/`, configured via `components.json`

**Form Handling:**
- react-hook-form 7.69.0 - Form management across components
- @hookform/resolvers 5.2.2 - Validation resolvers for react-hook-form
- zod 4.2.1 - Schema validation and type inference

**UI Components:**
- @radix-ui/react-dialog 1.1.15 - Modal/dialog primitives
- @radix-ui/react-dropdown-menu 2.1.16 - Dropdown menu primitives
- @radix-ui/react-tooltip 1.2.8 - Tooltip primitives
- lucide-react 0.561.0 - Icon library
- class-variance-authority 0.7.1 - Component styling variants
- clsx 2.1.1 - Conditional className utility

**Data & State:**
- @tanstack/react-query 5.90.12 - Data fetching and caching (available but not heavily used)
- @tanstack/react-table 8.21.3 - Headless table component for data grids
- zustand 5.0.9 - State management (available, not heavily used yet)
- use-local-storage-state 19.5.0 - localStorage wrapper for theme, filters, preferences

**Data Processing:**
- date-fns 4.1.0 - Date manipulation and formatting
- papaparse 5.5.3 - CSV parsing and generation
- react-markdown 10.1.0 - Markdown rendering
- recharts 3.5.1 - Charting and visualization library
- docx 9.5.1 - Word document generation
- file-saver 2.0.5 - Client-side file download utility

**Testing:**
- vitest 4.0.2 - Unit testing framework at root level
- @playwright/test 1.57.0 - End-to-end testing framework
- @types/node 24.10.4 - Node.js type definitions

**Development & Build:**
- @tailwindcss/postcss 4.0 - Tailwind CSS PostCSS plugin
- babel-plugin-react-compiler 1.0.0 - React Compiler for optimization
- tw-animate-css 1.4.0 - Animation utilities for Tailwind

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.87.1 - Supabase client for authentication and database (production)
- @supabase/ssr 0.8.0 - Supabase SSR integration for Next.js (production)
- @google/genai 1.33.0 - Google Generative AI client for Claude/Gemini integration

**UI/UX:**
- @radix-ui/react-slot 1.2.4 - Slot component for composable UI

**Code Quality:**
- @biomejs/biome 2.3.8 - Linting and formatting (unified tool, not ESLint for this monorepo)

## Configuration

**Environment:**
- `.env.local.example` in `apps/j16z-frontend/` provides template
- Three modes:
  - **Development (default):** `NEXT_PUBLIC_USE_MOCK_DATA=true` - Uses local mock data from `src/lib/constants.ts`
  - **Production:** Real API integration via `NEXT_PUBLIC_API_URL`
  - **Supabase auth:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Build:**
- `next.config.ts` - Next.js configuration with React Compiler enabled
- `postcss.config.mjs` - PostCSS with Tailwind CSS v4 plugin
- `tsconfig.json` (frontend) - TypeScript strict mode with `@/` alias to `src/`
- `tsconfig.base.json` - Root TypeScript configuration
- `biome.jsonc` - Root linting/formatting config (2 space indent, 120 line width, single quotes, trailing commas)
- `components.json` - shadcn/ui configuration with paths to `@/components`, `@/lib`, `@/hooks`

**Git Integration:**
- VCS enabled in Biome config with git client
- Uses `.gitignore` file

## Platform Requirements

**Development:**
- Node.js v20+ (tested with v22.12.0)
- pnpm v10.18.3
- macOS/Linux/Windows with shell support
- Modern web browser for frontend testing

**Production:**
- Node.js v20+ for Next.js server
- Browser support: Modern browsers (Chrome, Firefox, Safari, Edge)
- Deployment target: Vercel, AWS, or any Node.js-compatible platform
- Supabase account (for authentication/database in production)
- Google Cloud account with Generative AI API access

---

*Stack analysis: 2026-02-25*
