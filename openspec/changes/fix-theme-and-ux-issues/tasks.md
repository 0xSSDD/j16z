# Implementation Tasks

## 1. Fix Theme System (Blocking)

- [x] 1.1 Update `tailwind.config.ts` to use `darkMode: 'class'` (Already correctly implemented with .light class)
- [x] 1.2 Fix theme toggle in `app-layout.tsx` to add/remove `dark` class on `<html>` element (Already working)
- [x] 1.3 Test theme toggle switches between light and dark modes (Verified working)
- [x] 1.4 Verify localStorage persists theme preference (Already implemented)

## 2. Update Component Colors for Theme Support (Blocking)

- [x] 2.1 Update `data-table.tsx`: Replace hardcoded dark colors with theme-aware classes
- [x] 2.2 Update `deal-board.tsx`: Replace hardcoded dark colors with theme-aware classes
- [x] 2.3 Update `deal-card.tsx`: Replace hardcoded dark colors with theme-aware classes
- [ ] 2.4 Update `research-draft.tsx`: Replace hardcoded dark colors with theme-aware classes
- [ ] 2.5 Update `spread-chart.tsx`: Replace hardcoded dark colors with theme-aware classes
- [ ] 2.6 Update `event-timeline.tsx`: Replace hardcoded dark colors with theme-aware classes
- [ ] 2.7 Update `status-badge.tsx`: Replace hardcoded dark colors with theme-aware classes
- [ ] 2.8 Update all modals: `watchlist-modal.tsx`, `add-deal-modal.tsx`, `alert-config-modal.tsx`
- [ ] 2.9 Test all components in both light and dark modes
- [x] 2.10 Update `intelligence-feed.tsx`: Replace hardcoded zinc colors with theme-aware classes
- [x] 2.11 Update `deal-discovery.tsx`: Replace hardcoded zinc colors with theme-aware classes
- [x] 2.12 Update `notifications-inbox.tsx`: Replace hardcoded zinc colors with theme-aware classes

## 3. Fix Live Monitor Colors (Blocking)

- [x] 3.1 Update `feed-manager.tsx` to use terminal aesthetic colors
- [x] 3.2 Align with Deal Board color scheme (dark #0a0a0a, amber accents)
- [ ] 3.3 Test Live Monitor page in both themes

## 4. Add Missing Navigation Links (Blocking)

- [x] 4.1 Add "Discovery" link to sidebar Platform section (use Search icon)
- [x] 4.2 Add "Notifications" link to sidebar Platform section (use Bell icon)
- [ ] 4.3 Test navigation to Discovery and Notifications pages
- [ ] 4.4 Verify active state highlighting works correctly

## 4a. Implement CMD+K Command Palette (Blocking)

- [x] 4a.1 Implement CommandPalette component with search functionality
- [x] 4a.2 Add navigation commands: Go to Dashboard, Deals, Discovery, Notifications, Settings
- [ ] 4a.3 Add deal search: Search deals by ticker or company name
- [ ] 4a.4 Add quick actions: New Deal, Manage Watchlists, Generate Draft
- [ ] 4a.5 Implement fuzzy search/filtering for commands (Basic search working)
- [x] 4a.6 Add keyboard navigation (Arrow keys, Enter, Escape)
- [x] 4a.7 Style with terminal aesthetic (dark background, amber accents)
- [ ] 4a.8 Test CMD+K opens/closes palette
- [ ] 4a.9 Test all commands execute correctly
- [ ] 4a.10 Add recent commands/deals section

## 5. Create API Abstraction Layer (High Priority)

- [ ] 5.1 Create `src/lib/api.ts` with data service functions
- [ ] 5.2 Implement `getDeals()` function with mock/real data switching
- [ ] 5.3 Implement `getDeal(id)` function
- [ ] 5.4 Implement `getEvents(dealId)` function
- [ ] 5.5 Implement `getClauses(dealId)` function
- [ ] 5.6 Implement `getMarketSnapshots(dealId)` function
- [ ] 5.7 Implement `getNews(dealId)` function
- [ ] 5.8 Add `NEXT_PUBLIC_USE_MOCK_DATA` environment variable
- [ ] 5.9 Update `deal-board.tsx` to use API functions
- [ ] 5.10 Update `deal-card.tsx` to use API functions
- [ ] 5.11 Update `research-draft.tsx` to use API functions
- [ ] 5.12 Test with mock data enabled
- [ ] 5.13 Document API integration in README

## 6. Add Watchlist Detail View (High Priority)

- [ ] 6.1 Create `src/app/app/watchlists/[id]/page.tsx` route
- [ ] 6.2 Create `src/components/watchlist-detail.tsx` component
- [ ] 6.3 Display watchlist name and description
- [ ] 6.4 Show deals filtered by watchlist ID
- [ ] 6.5 Add "View" button in Watchlist modal
- [ ] 6.6 Test navigation from modal to detail page

## 7. Add Financial Term Tooltips (High Priority)

- [ ] 7.1 Create `src/components/ui/tooltip.tsx` component
- [ ] 7.2 Add tooltip to "Spread" column in Deal Board
- [ ] 7.3 Add tooltip to "p_close" column in Deal Board
- [ ] 7.4 Add tooltip to "EV" in Deal Card key metrics
- [ ] 7.5 Add tooltip content explaining each term
- [ ] 7.6 Test tooltips appear on hover

## 8. Improve Empty States (Medium Priority)

- [ ] 8.1 Update Deal Card events section empty state
- [ ] 8.2 Update Deal Card news section empty state
- [ ] 8.3 Update Deal Card clauses section empty state
- [ ] 8.4 Add helpful guidance text and call-to-action
- [ ] 8.5 Test empty states display correctly

## 9. Fix CollapsibleSection State Persistence (Medium Priority)

- [x] 9.1 Update `collapsible-section.tsx` colors to be theme-aware
- [ ] 9.2 Connect Deal Card sections to localStorage state  
- [ ] 9.3 Test section collapse state persists across page reloads

## 10. Improve Inline Editing Discoverability (Medium Priority)

- [ ] 10.1 Add hover border to editable fields in Deal Card
- [ ] 10.2 Add placeholder text "Click to edit"
- [ ] 10.3 Show pencil icon more prominently
- [ ] 10.4 Test inline editing is discoverable

## 11. Validation & Testing

- [ ] 11.1 Run `pnpm run lint` and fix all errors
- [ ] 11.2 Test all pages in light mode
- [ ] 11.3 Test all pages in dark mode
- [ ] 11.4 Test theme toggle works on all pages
- [ ] 11.5 Test navigation to all pages
- [ ] 11.6 Test data displays correctly with mock data
- [ ] 11.7 Verify no console errors
