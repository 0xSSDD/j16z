# Design: Theme System and UX Fixes

## Context

The MVP frontend screens were implemented with a focus on functionality, but several critical UX and theming issues were discovered:
- Theme toggle doesn't actually switch themes
- All components use hardcoded dark colors
- Navigation is incomplete
- No abstraction between mock and real data

These issues must be fixed before user testing or production deployment.

## Goals / Non-Goals

**Goals:**
- Fix theme system to support both light and dark modes
- Make all components respect the active theme
- Complete navigation structure
- Create clean API abstraction for backend integration
- Improve discoverability of key features

**Non-Goals:**
- Redesign the UI or change the terminal aesthetic
- Add new features beyond what's already implemented
- Optimize performance (not a current bottleneck)
- Add comprehensive testing suite (manual testing sufficient for MVP)

## Decisions

### 1. Theme System Architecture

**Decision:** Use Tailwind's `class` strategy with `dark:` prefix

**Rationale:**
- Tailwind v4 supports `darkMode: 'class'` configuration
- Allows programmatic control via JavaScript
- More reliable than `media` strategy (respects user preference)
- Standard pattern in Next.js apps

**Implementation:**
```typescript
// tailwind.config.ts
darkMode: 'class'

// app-layout.tsx
const toggleTheme = () => {
  const html = document.documentElement;
  if (isDarkMode) {
    html.classList.remove('dark');
  } else {
    html.classList.add('dark');
  }
  setIsDarkMode(!isDarkMode);
  localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
};
```

### 2. Color Class Migration Strategy

**Decision:** Use semantic color tokens with dark: variants

**Mapping:**
- `bg-zinc-950` → `bg-background dark:bg-zinc-950`
- `bg-zinc-900` → `bg-card dark:bg-zinc-900`
- `text-zinc-100` → `text-foreground dark:text-zinc-100`
- `border-zinc-800` → `border-border dark:border-zinc-800`

**Rationale:**
- Semantic tokens are more maintainable
- Tailwind CSS variables provide theme flexibility
- Dark: prefix makes theme-specific overrides explicit
- Preserves terminal aesthetic in dark mode

**Alternatives Considered:**
- CSS variables only: More flexible but harder to debug
- Separate stylesheets: Too much duplication
- Inline styles: Loses Tailwind benefits

### 3. API Abstraction Layer

**Decision:** Create service layer with environment-based switching

**Structure:**
```typescript
// src/lib/api.ts
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export async function getDeals() {
  if (USE_MOCK) {
    return Promise.resolve(MOCK_DEALS);
  }
  const res = await fetch('/api/deals');
  return res.json();
}
```

**Rationale:**
- Single source of truth for data fetching
- Easy to switch between mock and real data
- Maintains type safety
- Minimal refactoring needed

**Alternatives Considered:**
- MSW (Mock Service Worker): Overkill for MVP
- Dependency injection: Too complex for current needs
- Feature flags: Environment variable is simpler

### 4. Navigation Structure

**Decision:** Add Discovery and Notifications to Platform section

**Placement:**
```
Platform
├── Dashboard
├── Live Monitor
├── Deals
├── Discovery (NEW)
├── Notifications (NEW)
└── Deal Intelligence
```

**Rationale:**
- Discovery and Notifications are core platform features
- Logical grouping with other deal-related pages
- Maintains existing hierarchy

## Risks / Trade-offs

### Risk: Theme Toggle Performance
**Mitigation:** Class toggle is instant, no performance concern

### Risk: Color Migration Breaks Existing Styles
**Mitigation:** Test each component individually in both themes

### Risk: API Layer Adds Complexity
**Mitigation:** Keep it simple - just a thin wrapper, no caching/state management

### Trade-off: Semantic Tokens vs Hardcoded Colors
**Chosen:** Semantic tokens for maintainability
**Cost:** Slightly more verbose class names
**Benefit:** Easier to theme, better DX

## Migration Plan

**Phase 1: Theme System (Day 1)**
1. Update Tailwind config
2. Fix theme toggle
3. Test basic theme switching

**Phase 2: Color Migration (Day 1-2)**
1. Update one component at a time
2. Test in both themes after each change
3. Start with most-used components (DataTable, DealBoard)

**Phase 3: Navigation & API (Day 2)**
1. Add navigation links
2. Create API layer
3. Update components to use API

**Phase 4: Polish (Day 2-3)**
1. Add tooltips
2. Improve empty states
3. Fix CollapsibleSection state

**Rollback:** All changes are additive or fixes - can revert individual commits if needed

## Open Questions

None - all decisions are clear and implementation is straightforward.
