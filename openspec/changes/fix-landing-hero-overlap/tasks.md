## 1. Implementation
- [ ] 1.1 Audit current landing hero implementation in `landing-page.tsx` against the correct reference screenshot.
- [ ] 1.2 Adjust layout structure (wrappers, flex/grid, gaps) so the headline column and card stack do not overlap at desktop.
- [ ] 1.3 Ensure hero layout matches reference spacing at common desktop widths (e.g. 1440px, 1920px).
- [ ] 1.4 Verify that smaller breakpoints degrade gracefully (cards may resize or shift, but text must remain fully readable and not obscured).

## 2. Validation
- [ ] 2.1 Manually compare the deployed `/` page at desktop width to the reference screenshot and confirm spacing/overlap behavior.
- [ ] 2.2 Capture updated screenshots and attach to PR for visual diff.
- [ ] 2.3 Run `pnpm lint` in the repo root.
- [ ] 2.4 Run `openspec validate fix-landing-hero-overlap --strict` and ensure it passes.
