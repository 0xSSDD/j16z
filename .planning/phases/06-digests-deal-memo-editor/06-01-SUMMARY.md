---
phase: 06-digests-deal-memo-editor
plan: 01
subsystem: api, ui
tags: [react-email, bullmq, resend, drizzle, digest, email, settings]

# Dependency graph
requires:
  - phase: 05-alert-delivery-market-data
    provides: Resend SDK singleton pattern, email delivery patterns, BullMQ scheduler and worker registry patterns

provides:
  - digest_daily and digest_weekly BullMQ cron jobs (8 AM ET daily, 5 PM ET Friday)
  - react-email dark-themed templates (DailyDigestEmail, WeeklyDigestEmail) with j16z Aurora palette
  - queryOvernightEvents() and queryWeeklyDealChanges() query functions
  - GET/PUT /api/digest-preferences CRUD endpoints
  - DigestPreferences Settings tab with three auto-saving toggles

affects:
  - future digest testing and email content iteration
  - Settings page (Digests tab now present between Alert Rules and Integrations)

# Tech tracking
tech-stack:
  added:
    - "@react-email/components@1.0.9 — server-side email rendering in API package"
    - "react@19.2.1 + react-dom@19.2.1 — react-email peer deps (server-side only)"
    - "@types/react@19 + @types/react-dom@19 — TypeScript declarations for react-email templates"
  patterns:
    - "react-email templates as .tsx files in apps/api/src/digests/templates/ — rendered server-side via render()"
    - "Digest handlers follow alert-worker pattern — loop firms → members → prefs → skip-or-send"
    - "Empty digest guard: queryOvernightEvents returns [] → skip, no 'nothing happened' emails"
    - "Weekend suppression: isTodayWeekendInEt() using Intl.DateTimeFormat — consistent with market-poller.ts pattern"

key-files:
  created:
    - apps/api/src/digests/daily-digest.ts
    - apps/api/src/digests/weekly-digest.ts
    - apps/api/src/digests/digest-handler.ts
    - apps/api/src/digests/templates/daily-digest.tsx
    - apps/api/src/digests/templates/weekly-digest.tsx
    - apps/api/src/routes/digest-preferences.ts
    - apps/j16z-frontend/src/components/settings/digest-preferences-tab.tsx
  modified:
    - apps/api/src/db/schema.ts (digestPreferences table added)
    - apps/api/src/queues/scheduler.ts (digest_daily + digest_weekly schedules)
    - apps/api/src/worker.ts (handler registry entries)
    - apps/api/src/routes/index.ts (digestPreferences route exported)
    - apps/api/src/index.ts (route mounted + firmContextMiddleware applied)
    - apps/api/package.json (react-email dependencies)
    - apps/j16z-frontend/src/lib/types.ts (DigestPreferences interface)
    - apps/j16z-frontend/src/lib/api.ts (getDigestPreferences + updateDigestPreferences)
    - apps/j16z-frontend/src/app/app/settings/page.tsx (Digests tab added)

key-decisions:
  - "react-email installed in apps/api (not frontend) — server-side render() for email HTML, not browser rendering"
  - "Digest cron schedules use tz: 'America/New_York' in BullMQ upsertJobScheduler — explicit timezone, not UTC arithmetic"
  - "resolveEmail() uses Supabase admin.getUserById() lazily imported — avoids circular deps, falls back gracefully if Supabase unreachable"
  - "Digest preferences GET returns defaults (all enabled) if no row exists — no row creation on first load, avoids ghost rows"
  - "Weekend suppression uses Intl.DateTimeFormat weekday check in ET — consistent with market-poller.ts timezone pattern"

patterns-established:
  - "Digest handlers: getFirmsWithMembers() → per-member loop → getDigestPrefs() → skip-or-render-and-send"
  - "react-email templates: template literals with ${} for number interpolation in JSX (avoids Number vs ReactNode type error)"

requirements-completed:
  - DIGEST-01
  - DIGEST-02
  - DIGEST-03
  - DIGEST-04

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 6 Plan 01: Digest System Summary

**Daily (8 AM ET) and weekly (5 PM ET Friday) email digests via react-email + Resend, with per-user suppress-weekend preference and Settings > Digests tab for user control**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T21:45:58Z
- **Completed:** 2026-03-13T21:53:58Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- Full email digest pipeline: BullMQ cron → query → render (react-email) → Resend delivery
- Dark-themed branded templates (j16z bg #18181b, Aurora amber #f5a623 accents, severity color-coded event rows)
- Empty digest guard: queryOvernightEvents returns [] → skip without sending
- Weekend suppression: checks ET day-of-week against per-user preference before dispatch
- Frontend Settings > Digests tab with three auto-saving toggles and Saving.../Saved status indicator

## Task Commits

1. **Task 1: Schema migration + digest backend** - `66e4895` (feat)
2. **Task 2: Frontend Digest Preferences tab** - `149c60a` (feat)

## Files Created/Modified

- `apps/api/src/db/schema.ts` — digestPreferences table with firmIsolationPolicies RLS
- `apps/api/src/digests/daily-digest.ts` — queryOvernightEvents (CRITICAL+WARNING, yesterday 8 AM ET window)
- `apps/api/src/digests/weekly-digest.ts` — queryWeeklyDealChanges (7-day deal-level aggregate)
- `apps/api/src/digests/digest-handler.ts` — handleDigestDaily + handleDigestWeekly BullMQ handlers
- `apps/api/src/digests/templates/daily-digest.tsx` — DailyDigestEmail react-email template
- `apps/api/src/digests/templates/weekly-digest.tsx` — WeeklyDigestEmail react-email template
- `apps/api/src/routes/digest-preferences.ts` — GET/PUT /api/digest-preferences
- `apps/api/src/queues/scheduler.ts` — digest_daily + digest_weekly cron schedules with tz: 'America/New_York'
- `apps/api/src/worker.ts` — digest_daily + digest_weekly handler registry entries
- `apps/j16z-frontend/src/components/settings/digest-preferences-tab.tsx` — DigestPreferencesTab component
- `apps/j16z-frontend/src/app/app/settings/page.tsx` — Digests tab wired between Alert Rules and Integrations

## Decisions Made

- react-email installed in `apps/api` (not the frontend) — rendering is server-side for email HTML generation
- Cron schedules registered with `tz: 'America/New_York'` in BullMQ `upsertJobScheduler` — explicit timezone prevents DST ambiguity
- `resolveEmail()` uses lazy `import('@supabase/supabase-js')` in handler to avoid circular dependency
- Digest preferences GET endpoint returns default values (all enabled) if no DB row exists — no phantom row creation on first GET

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added @types/react + @types/react-dom as dev deps**
- **Found during:** Task 1 (react-email template TypeScript check)
- **Issue:** TypeScript errors: "Could not find a declaration file for module 'react'" when tsc checked `.tsx` templates
- **Fix:** `pnpm add -D @types/react @types/react-dom` in apps/api
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Committed in:** 66e4895 (Task 1 commit)

**2. [Rule 1 - Bug] Removed unused declared variables in daily-digest.ts**
- **Found during:** Task 1 TypeScript strict mode check
- **Issue:** `etYear`, `etMonth`, `etDay` declared but never used — TS6133 errors
- **Fix:** Replaced with string-typed variables used in the ET date construction expression
- **Files modified:** apps/api/src/digests/daily-digest.ts
- **Committed in:** 66e4895 (Task 1 commit)

**3. [Rule 1 - Bug] Removed unused `count` import from weekly-digest.ts**
- **Found during:** Task 1 TypeScript strict mode check
- **Issue:** `count` imported from drizzle-orm but not used — TS6133 error
- **Fix:** Removed from import statement
- **Files modified:** apps/api/src/digests/weekly-digest.ts
- **Committed in:** 66e4895 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 bugs)
**Impact on plan:** All auto-fixes required for TypeScript strict mode compliance. No scope creep.

## Issues Encountered

- react-email Number vs ReactNode type errors in JSX: `{events.length}` cannot be assigned to `ReactNode & string` — fixed by using template literals `${events.length}` instead of JSX interpolation of raw numbers
- `import * as React` not needed with react-email (JSX runtime handles it) — removed to fix TS6133 unused import

## User Setup Required

None - no external service configuration required. RESEND_API_KEY already configured from Phase 5.
Note: Supabase DB push for the new `digest_preferences` table must be run before digest handlers will work in production: `cd apps/api && pnpm db:push`

## Next Phase Readiness

- Digest email delivery system complete and ready for Phase 6 Plan 02 (Deal Memo Editor)
- `digest_preferences` table requires a `pnpm db:push` in apps/api before production use
- react-email templates can be iterated without breaking any other Phase 6 plans

---
*Phase: 06-digests-deal-memo-editor*
*Completed: 2026-03-13*
