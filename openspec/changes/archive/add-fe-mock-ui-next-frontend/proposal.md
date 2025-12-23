# Change: Migrate j16z-fe-mock UI into Next.js frontend

## Why
The existing `j16z-fe-mock` Vite/React prototype already encodes the desired "dark room, bright screen" institutional UI (landing page, login, terminal shell, dashboard, feeds, AI chat). We want the new `j16z` monorepo frontend (Next.js 16 + Tailwind v4 + shadcn + Supabase) to use that design as the UI source of truth.

This change formalizes the migration of that UI into the new Next.js app so that:
- The new frontend is pixel-close to the prototype.
- We can retire the Vite mock and iterate only in the `j16z` repo.
- Future work (Supabase wiring, AI backends, specs) builds on a stable, shared UI.

## What Changes
- Recreate the `j16z-fe-mock` screens as Next.js App Router pages/components under `apps/j16z-frontend`:
  - Marketing landing page (`/`).
  - Login terminal (`/login`).
  - Authenticated app shell (`/app` layout).
  - Dashboard, Feed Manager, Intelligence Feed + Detail View, Chat Assistant, Settings.
- Preserve visual layout, typography, and interaction patterns as closely as possible, adapting only where the tech stack requires (Next routing, shadcn primitives, Tailwind v4 class naming).
- Centralize shared UI types/constants/services (e.g. `types.ts`, `constants.ts`, `geminiService.ts`) under `src/lib` and/or shared packages.
- Update OpenSpec project context (already done) to reflect the new stack and UI responsibilities.

## Impact
- **Affected specs (new):**
  - `frontend-ui` capability
- **Affected code (implementation stage, not in this proposal):**
  - `apps/j16z-frontend/src/app/**/*`
  - `apps/j16z-frontend/src/components/**/*`
  - `apps/j16z-frontend/src/lib/**/*`
- **Non-goals (for this change):**
  - No backend behavior changes (Supabase, cron, SEC ingestion) beyond what is strictly needed to render UI.
  - No new product features beyond what `j16z-fe-mock` already expresses.
