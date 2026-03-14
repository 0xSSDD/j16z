---
phase: 06-digests-deal-memo-editor
plan: 03
subsystem: ui
tags: [tiptap, docx, pdf, react-pdf, memo, version-history, export]

# Dependency graph
requires:
  - phase: 06-02
    provides: MemoEditor tiptap scaffold, CRUD API, MemoList, snapshot API functions
provides:
  - SectionRefreshButton + SectionRefreshBar: per-section live data refresh for Deal Terms/Regulatory/Litigation/Spread History
  - MemoSnapshotPanel: named snapshot create/list/view/restore/compare with line-level diff
  - memo-export.ts: exportMemoDocx (docx lib) and exportMemoPdf (@react-pdf/renderer) functions
  - Visibility toggle: clickable Private/Firm toggle in memo editor header
affects: [phase-07-frontend-refinement]

# Tech tracking
tech-stack:
  added: ['@react-pdf/renderer@4.3.2']
  patterns:
    - Dynamic import of @react-pdf/renderer to avoid Next.js SSR issues
    - Tiptap ProseMirror transaction API for surgical section replacement
    - Line-level diff algorithm for side-by-side snapshot compare
    - docx Packer.toBlob() + URL.createObjectURL download trigger

key-files:
  created:
    - apps/j16z-frontend/src/components/memo/memo-section-refresh.tsx
    - apps/j16z-frontend/src/components/memo/memo-snapshot-panel.tsx
    - apps/j16z-frontend/src/components/memo/memo-export.ts
  modified:
    - apps/j16z-frontend/src/components/memo/memo-editor.tsx
    - apps/j16z-frontend/src/components/memo/memo-list.tsx

key-decisions:
  - "@react-pdf/renderer dynamically imported (await import) in exportMemoPdf to prevent SSR bundle issues in Next.js"
  - "Section refresh uses editor.state.tr.replaceWith with TextSelection.near from @tiptap/pm/state for cursor restore"
  - "SectionRefreshBar renders all 4 refresh buttons inline in secondary toolbar row (simpler than per-heading floating buttons)"
  - "Snapshot panel opens as inline sidebar (w-72) alongside editor content rather than overlay drawer"
  - "Docx blockquote uses extractTextRuns on parent node (not lines map) to preserve inline text runs"

patterns-established:
  - "Dynamic import pattern for heavy PDF libs: await import('@react-pdf/renderer') inside async function"
  - "ProseMirror doc.descendants() for section boundary detection by H2 heading textContent match"
  - "Line-level diff: zip leftLines/rightLines by index, classify same/added/removed/modified"

requirements-completed: [MEMO-03, MEMO-04]

# Metrics
duration: 6min
completed: 2026-03-14
---

# Phase 6 Plan 3: Memo Editor Completion Summary

**Per-section live refresh, named snapshot version history with side-by-side diff, and .docx/.pdf export via docx lib + @react-pdf/renderer**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-14T06:57:00Z
- **Completed:** 2026-03-14T07:03:00Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 updated)

## Accomplishments
- Per-section refresh buttons (Deal Terms, Regulatory Status, Litigation, Spread History) fetch fresh API data and surgically replace only the target tiptap section, preserving all other analyst edits
- MemoSnapshotPanel with full CRUD: save named snapshot, list by recency, view read-only preview, restore with confirm dialog, side-by-side diff compare using line-level diff algorithm
- Visibility toggle (Private/Firm) in memo editor header as clickable button calling updateMemo
- Word export via docx lib supporting headings, paragraphs, bullet lists, ordered lists, blockquotes, tables, horizontal rules
- PDF export via @react-pdf/renderer with j16z brand colors (dark background, amber H2 headings) dynamically imported to avoid SSR issues
- Export dropdown in editor secondary toolbar with both format options

## Task Commits

1. **Task 1: Per-section refresh + visibility toggle + snapshot panel** - `9be1eea` (feat)
2. **Task 2: Memo export (.docx and .pdf)** - `83b1822` (feat)

## Files Created/Modified
- `apps/j16z-frontend/src/components/memo/memo-section-refresh.tsx` - SectionRefreshButton and SectionRefreshBar; uses ProseMirror tr.replaceWith for surgical section replacement
- `apps/j16z-frontend/src/components/memo/memo-snapshot-panel.tsx` - Full snapshot panel with create/list/preview/restore/compare views and line-level diff
- `apps/j16z-frontend/src/components/memo/memo-export.ts` - exportMemoDocx (docx lib) and exportMemoPdf (@react-pdf/renderer) with tiptap JSON tree walkers
- `apps/j16z-frontend/src/components/memo/memo-editor.tsx` - Added SectionRefreshBar, MemoSnapshotPanel sidebar, export dropdown, dealId prop
- `apps/j16z-frontend/src/components/memo/memo-list.tsx` - Added dealId passthrough to MemoEditor, visibility toggle with updateMemo call

## Decisions Made
- `@react-pdf/renderer` dynamically imported inside `exportMemoPdf` function to prevent SSR bundling issues in Next.js
- Section refresh uses `TextSelection.near` from `@tiptap/pm/state` (not `editor.state.selection.constructor.near`) to avoid TypeScript error on Function type
- Snapshot panel opens as inline sidebar (w-72 border-l) rather than overlay drawer — keeps editor and history visible simultaneously
- SectionRefreshBar groups all 4 buttons in a secondary toolbar row rather than floating per-heading (simpler, no DOM positioning complexity)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript error on `editor.state.selection.constructor.near()` — Function type lacks `.near` property; fixed by importing `TextSelection` from `@tiptap/pm/state` directly
- Biome auto-fixed 5 formatting issues (line length, unused imports) in memo-export.ts, memo-section-refresh.tsx, memo-editor.tsx, memo-list.tsx, memo-snapshot-panel.tsx

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 6 (Digests + Deal Memo Editor) is now fully complete: digests (06-01), memo editor foundation (06-02), and memo completion (06-03)
- Ready for Phase 7 (Frontend Refinement + Exports) if planned

## Self-Check: PASSED
- All 5 files exist on disk (verified)
- Both task commits exist: 9be1eea, 83b1822 (verified)

---
*Phase: 06-digests-deal-memo-editor*
*Completed: 2026-03-14*
