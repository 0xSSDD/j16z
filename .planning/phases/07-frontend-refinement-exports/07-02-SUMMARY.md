---
phase: 07-frontend-refinement-exports
plan: 02
subsystem: frontend
tags: [landing-page, marketing, ux, linear-harvey]
dependency_graph:
  requires: []
  provides: [landing-page-polish]
  affects: [apps/j16z-frontend/src/components/landing-page.tsx]
tech_stack:
  added: []
  patterns:
    - Rendered React component mockups as product screenshots (InboxMockup, DealCardMockup, AlertMockup, MemoMockup)
    - Problem-first messaging hierarchy (pain point badge → headline → solution subtext)
    - Section scroll anchors (id=how-it-works, id=features, id=pricing) for nav links
key_files:
  modified:
    - apps/j16z-frontend/src/components/landing-page.tsx
decisions:
  - Beta pricing section shows "reach out for pricing" with mailto CTA — no tier grid per locked decision
  - Existing PolymarketCard/SearchResultsCard/SynthesisTerminal kept for hero visual; new InboxMockup/DealCardMockup/AlertMockup/MemoMockup added for Feature Showcase section
  - Footer simplified to single row (logo + links + status) — removes verbose 4-column layout
  - SPREAD_DATA replaces POLYMARKET_DATA — more product-relevant metric (gross spread, not prediction market)
metrics:
  duration: "4 min"
  completed_date: "2026-03-14"
  tasks_completed: 1
  files_modified: 1
---

# Phase 7 Plan 02: Landing Page Polish Summary

**One-liner:** Problem-first landing page with "Deal intelligence, made faster." hero, 4 rendered React product mockups, 6 structured sections, and beta pricing — Linear x Harvey aesthetic.

## What Was Built

Rewrote `landing-page.tsx` (758 → 830 lines) from a "features list" page into a problem-first narrative with 6 distinct sections:

**Section 1 — Hero:** Headline "Deal intelligence, made faster." with amber gradient. Problem badge ("Analysts spend 3–5 hrs/day chasing fragmented M&A data") leads into solution subheadline. Two CTAs: "Get Started" (amber bg → /login) and "See How It Works" (scroll anchor → #how-it-works). Hero visual preserved — SynthesisTerminal with floating PolymarketCard and SearchResultsCard with updated M&A-accurate content (Kroger/Albertsons spread data replacing Polymarket probability).

**Section 2 — Feature Showcase:** 4 rendered React mockup components in a 2-column grid:
- `InboxMockup` — materiality-scored event feed with red/orange/hollow dot indicators and score badges
- `DealCardMockup` — spread chart (recharts AreaChart), p(close), outside date countdown, key terms table
- `AlertMockup` — critical alert card with delivery channels (Email via Resend, Slack via Webhook)
- `MemoMockup` — tiptap-style editor view with section headers and export buttons

**Section 3 — How It Works:** `id="how-it-works"` scroll anchor. 3-step flow with large amber numbered circles, connecting line on desktop, vertical stack on mobile.

**Section 4 — Data Sources:** 6-card grid (3 cols desktop, 2 cols tablet, 1 col mobile) for SEC EDGAR, CourtListener, FTC/DOJ, Market Data, Curated RSS, Structured Exports. Muted icons, 1-line value descriptions.

**Section 5 — Pricing:** Single centered card. Beta badge + "Currently in beta — reach out for pricing" + mailto CTA. No tier grid.

**Section 6 — CTA Hook:** "Ready to stop chasing filings?" closing hook with Get Started + Contact us buttons.

**Footer:** Simplified to single row — logo, Privacy/Terms/GitHub links, "SYSTEMS OPERATIONAL" status dot.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Button type attributes on mockup buttons**
- **Found during:** Task 1 — Biome lint check
- **Issue:** Decorative buttons inside mockup components (MemoMockup, SynthesisTerminal) lacked explicit `type="button"`, which Biome flags as accessibility issue
- **Fix:** Added `type="button"` to all 5 non-form buttons
- **Files modified:** `landing-page.tsx`

**2. [Rule 2 - Missing] Footer href="#" placeholder links**
- **Found during:** Task 1 — Biome lint check
- **Issue:** `<a href="#">` fails Biome's `useValidAnchor` rule
- **Fix:** Changed to `/privacy` and `/terms` paths (forward-looking routes)
- **Files modified:** `landing-page.tsx`

## Self-Check: PASSED

- `apps/j16z-frontend/src/components/landing-page.tsx` — FOUND
- Commit `f2ec6bc` — FOUND
- TypeScript: passes (no errors from frontend tsc --noEmit)
- Biome: passes on file (0 errors after auto-fix)
