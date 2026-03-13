---
phase: 06-digests-deal-memo-editor
plan: 02
subsystem: ui
tags: [tiptap, wysiwyg, editor, memo, drizzle, hono, react]

# Dependency graph
requires:
  - phase: 06-01
    provides: phase 6 foundation — digest schema, settings tab patterns
  - phase: 05-03
    provides: deal card tab patterns, clauses/events API
provides:
  - memos and memo_snapshots tables in schema with RLS policies
  - Full CRUD API at /api/memos with optimistic concurrency (409 on stale version)
  - Snapshot endpoints: create, list, get, restore
  - tiptap v3 WYSIWYG editor with dark theme, sticky toolbar, auto-save
  - generateMemoContent scaffold: Executive Summary, Deal Terms table, Regulatory, Litigation, Clauses, Spread placeholder, Analyst Notes
  - MemoList: list view + create-new flow with live deal data scaffold
  - MemoEditor: tiptap with 3s debounce auto-save and version conflict handling
  - Deal card Memo tab (Overview/Memo tab navigation)
affects:
  - 06-03
  - any future memo-related work

# Tech tracking
tech-stack:
  added:
    - "@tiptap/react ^3.20.1"
    - "@tiptap/pm ^3.20.1"
    - "@tiptap/starter-kit ^3.20.1"
    - "@tiptap/extension-table ^3.20.1"
    - "@tiptap/extension-table-row ^3.20.1"
    - "@tiptap/extension-table-cell ^3.20.1"
    - "@tiptap/extension-table-header ^3.20.1"
    - "@tiptap/extension-underline ^3.20.1"
    - "@tiptap/extension-placeholder ^3.20.1"
  patterns:
    - "tiptap JSONContent type imported from @tiptap/react (re-exports @tiptap/core) — @tiptap/core not directly installed"
    - "Optimistic concurrency: PATCH /api/memos/:id requires version > stored version; returns 409 on conflict"
    - "Memo visibility: private = creator only, firm = all firm members; enforced at route level with explicit userId/firmId WHERE"
    - "Auto-save: 3s debounce on editor onUpdate; version incremented locally and sent with PATCH"
    - "immediatelyRender: false on useEditor for Next.js SSR compatibility"

key-files:
  created:
    - apps/api/src/routes/memos.ts
    - apps/j16z-frontend/src/components/memo/memo-scaffold.ts
    - apps/j16z-frontend/src/components/memo/memo-toolbar.tsx
    - apps/j16z-frontend/src/components/memo/memo-editor.tsx
    - apps/j16z-frontend/src/components/memo/memo-list.tsx
  modified:
    - apps/api/src/db/schema.ts
    - apps/api/src/routes/index.ts
    - apps/api/src/index.ts
    - apps/j16z-frontend/src/lib/types.ts
    - apps/j16z-frontend/src/lib/api.ts
    - apps/j16z-frontend/src/components/deal-card.tsx
    - apps/j16z-frontend/src/app/globals.css
    - apps/j16z-frontend/package.json

key-decisions:
  - "JSONContent type imported from @tiptap/react (which re-exports @tiptap/core) — @tiptap/core is a transitive dep not directly installed"
  - "Memo auto-save uses 3s debounce with monotonic version counter; conflict returns 409 with stored version"
  - "MemoList fetches deal+clauses+events in parallel on create-new to build scaffold"
  - "Deal card tab navigation: Overview tab wraps all existing sections in React fragment; Memo tab renders MemoList"
  - "autoFocus removed from title input per Biome a11y rules"

patterns-established:
  - "Tiptap WYSIWYG pattern: useEditor with immediatelyRender:false, StarterKit + Table + Underline + Placeholder"
  - "Scaffold generator: pure function returning JSONContent built from live API data, no side effects"
  - "Inline save status indicator: idle/saving/saved/error/conflict states with amber/green/red colors"

requirements-completed:
  - MEMO-01
  - MEMO-02

# Metrics
duration: 13min
completed: 2026-03-13
---

# Phase 6 Plan 2: Deal Memo Editor Summary

**tiptap WYSIWYG memo editor with deal-data scaffold generator, CRUD API with optimistic concurrency, and Memo tab wired into deal card**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-03-13T21:54:00Z
- **Completed:** 2026-03-13T22:07:37Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- memos + memo_snapshots tables added to Drizzle schema with firmIsolationPolicies RLS
- Full CRUD API at /api/memos: list, get, create, patch (with 409 optimistic concurrency), delete, plus 4 snapshot endpoints
- tiptap v3 editor component with dark theme, sticky toolbar (bold/italic/underline/headings/lists/table/blockquote/undo-redo), 3s debounce auto-save, version conflict handling
- generateMemoContent scaffold: 8 sections built from live deal/clause/event data (Executive Summary narrative, Deal Terms table, Regulatory bullets, Litigation bullets, Key Clauses as blockquotes, Spread placeholder, Analyst Notes)
- Deal card has Overview/Memo tab navigation; Memo tab shows MemoList with create-new flow

## Task Commits

1. **Task 1: Memo schema + CRUD API** - `ad95515` (feat)
2. **Task 2: Tiptap editor, scaffold, deal card Memo tab** - `21b2ba7` (feat)

## Files Created/Modified

- `apps/api/src/db/schema.ts` - Added memos and memo_snapshots tables
- `apps/api/src/routes/memos.ts` - Full CRUD + snapshot endpoints
- `apps/api/src/routes/index.ts` - Registered memosRoutes export
- `apps/api/src/index.ts` - Mounted /api/memos with firmContextMiddleware
- `apps/j16z-frontend/src/lib/types.ts` - Memo and MemoSnapshot interfaces
- `apps/j16z-frontend/src/lib/api.ts` - getMemos/createMemo/updateMemo/deleteMemo + snapshot functions
- `apps/j16z-frontend/src/components/memo/memo-scaffold.ts` - generateMemoContent tiptap JSON builder
- `apps/j16z-frontend/src/components/memo/memo-toolbar.tsx` - Sticky formatting toolbar
- `apps/j16z-frontend/src/components/memo/memo-editor.tsx` - tiptap editor with auto-save
- `apps/j16z-frontend/src/components/memo/memo-list.tsx` - List view + create-new flow
- `apps/j16z-frontend/src/components/deal-card.tsx` - Overview/Memo tab navigation
- `apps/j16z-frontend/src/app/globals.css` - Tiptap dark theme styles
- `apps/j16z-frontend/package.json` - tiptap packages added

## Decisions Made

- JSONContent imported from `@tiptap/react` (which does `export * from '@tiptap/core'`) rather than `@tiptap/core` directly — core is a transitive dependency not directly installed in the frontend workspace
- `immediatelyRender: false` on `useEditor` for Next.js SSR hydration compatibility
- Memo visibility default is 'private' per PLAN.md spec; firm-visible memos accessible to all firm members
- Tab navigation wraps existing deal card sections in a React fragment (Overview tab) rather than restructuring; keeps diff minimal

## Deviations from Plan

None — plan executed exactly as written. One minor Rule 2 fix: removed `autoFocus` attribute from title input (Biome a11y/noAutofocus lint rule).

## Issues Encountered

- `@tiptap/core` not directly resolvable by TypeScript (transitive dep only) — fixed by importing JSONContent from `@tiptap/react` which re-exports the full core API.

## User Setup Required

None — no external service configuration required. `pnpm drizzle-kit push` will need to run against the Supabase DB to create the memos and memo_snapshots tables.

## Next Phase Readiness

- Memo editor foundation complete — ready for Phase 6 Plan 3 (digests completion or any remaining 06 work)
- memos + memo_snapshots tables need `drizzle-kit push` before production use
- Mock data mode: getMemos returns [] (no mock memos); createMemo returns a synthetic object so the editor flow works without a backend

## Self-Check: PASSED

All created files exist. Both task commits (ad95515, 21b2ba7) verified in git log.

---
*Phase: 06-digests-deal-memo-editor*
*Completed: 2026-03-13*
