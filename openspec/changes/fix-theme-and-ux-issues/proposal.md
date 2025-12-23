# Change: Fix Theme System and Critical UX Issues

## Why

The MVP frontend screens are implemented but have critical usability issues:
1. Dark/light mode toggle is broken - users are stuck in dark mode
2. All tables and components use hardcoded dark colors that don't respect theme
3. Live Monitor page uses inconsistent colors from the rest of the app
4. Discovery and Notifications pages exist but aren't accessible via navigation
5. No API abstraction layer - all data is hardcoded, making backend integration difficult

These issues prevent the app from being production-ready and block user testing.

## What Changes

**Blocking Fixes:**
- Fix dark/light mode toggle to properly apply theme classes
- Update all components to use theme-aware color classes
- Standardize Live Monitor page colors to match terminal aesthetic
- Add Discovery and Notifications links to sidebar navigation
- Implement CMD+K command palette (currently non-functional)

**High Priority:**
- Create API abstraction layer with mock/real data switching
- Add Watchlist detail view page
- Add tooltips explaining financial terms (spread, p_close, EV)

**Medium Priority:**
- Improve empty states with helpful guidance
- Fix CollapsibleSection to use localStorage state
- Make inline editing more discoverable

## Impact

**Affected specs:**
- deal-board (color system, navigation)
- deal-card (color system, tooltips)
- research-draft (color system)
- settings (theme toggle)

**Affected code:**
- `apps/j16z-frontend/src/components/app-layout.tsx` - theme toggle, navigation
- `apps/j16z-frontend/src/components/command-palette.tsx` - NEW: implement functionality
- `apps/j16z-frontend/src/components/ui/data-table.tsx` - color classes
- `apps/j16z-frontend/src/components/deal-board.tsx` - color classes
- `apps/j16z-frontend/src/components/deal-card.tsx` - color classes, tooltips
- `apps/j16z-frontend/src/components/research-draft.tsx` - color classes
- `apps/j16z-frontend/src/components/feed-manager.tsx` - color standardization
- `apps/j16z-frontend/src/lib/api.ts` - NEW: API abstraction layer
- `apps/j16z-frontend/tailwind.config.ts` - darkMode configuration

**Breaking changes:** None - all changes are additive or fixes

**Migration:** No migration needed - fixes existing functionality
