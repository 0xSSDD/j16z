# Change: Fix landing hero card overlap

## Why
The current marketing landing hero renders the floating terminal/cards such that they visually overlap the primary headline block. This breaks the intended visual hierarchy from the Figma reference and makes the hero feel cramped and messy on desktop.

The reference layout ("correct" screenshot) shows the floating cards clearly separated from the headline copy, with intentional negative space between the text column and the card stack.

## What Changes
- Define explicit layout requirements for the landing hero on desktop viewports.
- Ensure the floating cards do **not** collide with or overlap the main headline block at target desktop widths.
- Preserve the existing “dark room, bright screen” aesthetic and card composition; this change is purely spatial/layout.

## Impact
- Affected specs:
  - `landing-hero` (new capability under marketing site)
- Affected code (expected):
  - `apps/j16z-frontend/src/components/landing-page.tsx`
  - Any supporting layout/wrapper components for the marketing hero.

## Non-Goals
- No changes to copy, typography tokens, or color palette.
- No changes to card content or interactions (hover, focus, etc.).
- No mobile/tablet redesign beyond what is required to avoid obviously broken overlap.
