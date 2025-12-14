## 1. Analysis & Setup
- [ ] 1.1 Confirm current `j16z-fe-mock` routes, components, and shared modules (types, constants, services).
- [ ] 1.2 Confirm current `apps/j16z-frontend` routing and layout structure (`/`, `/login`, `/app`, `/app/*`).
- [ ] 1.3 Decide final route mapping from old Vite router to Next App Router (document in this change).

## 2. Component Migration (UI-only)
- [ ] 2.1 Migrate landing page markup into a Next.js component under `src/components` and wire it to `/`.
- [ ] 2.2 Migrate login terminal markup into `src/components` and wire it to `/login` (Next navigation, no real auth yet).
- [ ] 2.3 Migrate app shell (sidebar + header) into `src/components` and wire as `/app` layout using App Router.
- [ ] 2.4 Migrate Dashboard view into a reusable component and connect to `/app`.
- [ ] 2.5 Migrate Feed Manager view and connect to `/app/feed`.
- [ ] 2.6 Migrate Intelligence Feed + Detail View and connect to `/app/intelligence`.
- [ ] 2.7 Migrate Chat Assistant view and connect to `/app/chat` (still using Gemini mock service).
- [ ] 2.8 Migrate Settings view and connect to `/app/settings`.

## 3. Shared Libraries & Services
- [ ] 3.1 Move shared types (`types.ts`) into `apps/j16z-frontend/src/lib/types.ts` or `@j16z/utils` and update imports.
- [ ] 3.2 Move shared constants (`constants.ts`) into `apps/j16z-frontend/src/lib/constants.ts` or `@j16z/utils` and update imports.
- [ ] 3.3 Move `geminiService` into `apps/j16z-frontend/src/lib/services/gemini.ts` (or shared package), keeping behavior consistent but adapting to Next (no env leaks to client).

## 4. Tailwind / shadcn / Theming
- [ ] 4.1 Ensure Tailwind v4 config and global CSS support the "dark room, bright screen" system (colors, fonts, background effects).
- [ ] 4.2 Replace ad-hoc elements with shadcn/ui primitives where it does not materially change the visual output (buttons, inputs, dialogs) and is consistent with the design system direction.
- [ ] 4.3 Verify responsive behavior for at least large desktop, laptop, and narrow viewport (no layout-breaking regressions from the mock).

## 5. Validation
- [ ] 5.1 Run `pnpm lint` (Biome) and fix any blocking issues introduced by the migration.
- [ ] 5.2 Run `pnpm dev` and manually smoke-test all routes: `/`, `/login`, `/app`, `/app/feed`, `/app/intelligence`, `/app/chat`, `/app/settings`.
- [ ] 5.3 Capture any intentional visual deviations from the Vite mock (due to tech differences) in the relevant spec scenarios.
- [ ] 5.4 Update this checklist to all `[x]` once implementation is complete.
