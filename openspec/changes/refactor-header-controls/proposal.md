# Change: Refactor Header Controls - Remove Bell Icon, Relocate Theme & Logout

## Why

The current navigation layout has controls scattered across different UI regions (bell icon in top-right header, theme/logout in bottom-left sidebar), creating inconsistent UX. Additionally, the landing page lacks a visible dark mode toggle, forcing users to wait until after login to adjust their theme preference.

Consolidating theme and logout controls in the top-right header creates a more conventional, discoverable pattern while freeing up sidebar space for core navigation.

## What Changes

- **Remove** bell icon (notifications) from top-right header
- **Move** dark mode toggle from bottom-left sidebar to top-right header
- **Move** logout button from bottom-left sidebar to top-right header
- **Add** dark mode toggle to landing page header (consistent with app layout)
- **Update** header layout to accommodate theme toggle and logout button
- **Remove** bottom control section from sidebar (theme/logout buttons)

## Impact

**Affected specs:**
- `navigation` (NEW) - App layout navigation and header controls

**Affected code:**
- `apps/j16z-frontend/src/components/app-layout.tsx` - Header and sidebar structure
- `apps/j16z-frontend/src/components/landing-page.tsx` - Landing page header (needs recreation if corrupted)

**Migration path:**
- No data migration needed
- Pure UI reorganization
- Theme preference remains in localStorage
- No breaking changes to functionality

**Expected outcomes:**
- More conventional header control placement
- Consistent theme toggle across landing and app pages
- Cleaner sidebar focused on navigation
- Improved discoverability of theme and logout controls
