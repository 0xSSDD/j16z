# Implementation Tasks: Unified Inbox and Navigation Rehaul

## 1. Foundation Setup

- [x] 1.1 ~~Create feature flag~~ (REMOVED: This is a permanent refactor, not a toggleable feature)

## 2. Navigation Structure

- [x] 2.1 Update `app-layout.tsx` to 4-item navigation (Inbox, Deals, Watchlists, Settings)
- [x] 2.2 Add unread badge component for Inbox nav item
- [x] 2.5 Update active state highlighting for new navigation
- [x] 2.6 Test navigation in light and dark modes

## 3. Inbox Page - Core Structure

- [x] 3.1 Create `src/app/app/inbox/page.tsx` route
- [x] 3.2 Create `src/components/inbox/inbox-timeline.tsx` component
- [x] 3.3 Create `src/components/inbox/inbox-side-panel.tsx` component
- [x] 3.4 Create `src/components/inbox/inbox-filters.tsx` component
- [x] 3.5 Create `src/components/inbox/inbox-header.tsx` component
- [x] 3.6 Implement responsive layout (timeline + side panel)

## 4. Materiality Scoring System

- [x] 4.1 Create `src/lib/materiality-scoring.ts` utility
- [x] 4.2 Implement base score calculation by event type
- [x] 4.3 Implement urgency adjustment (<30 days to outside date)
- [x] 4.4 Implement risk adjustment (p_close < 40%)
- [x] 4.5 Implement litigation crowding adjustment (>3 cases)
- [x] 4.6 Implement analyst feedback learning (-25 for "not material")
- [x] 4.7 Add materiality tier classification (HIGH/MEDIUM/LOW)

## 5. Inbox Timeline

- [x] 5.1 Implement unified event timeline component
- [x] 5.2 Add materiality badge rendering (🔴 HIGH, 🟠 MEDIUM, 🟡 LOW)
- [x] 5.3 Add unread/read indicators (● unread, ○ read)
- [x] 5.4 Implement relative timestamps ("2 hrs ago") with absolute on hover
- [ ] 5.5 Add inline deal context (spread, p_close, days to outside) - Partial (needs real deal data)
- [x] 5.6 Implement event sorting (materiality → timestamp)
- [x] 5.7 Add loading skeleton for initial load
- [x] 5.8 Implement pagination ("Load More" button, 20 events per page)
- [x] 5.9 Add search bar for filtering events

## 6. Inbox Side Panel

- [x] 6.1 Implement slide-out panel animation (300-400px width)
- [x] 6.2 Add event detail display (summary, key points, metadata)
- [x] 6.3 Add source document link ("View FTC Press Release")
- [x] 6.4 Add collapsible full text for text-based sources
- [x] 6.5 Add deal context section (spread, p_close, outside date)
- [x] 6.6 Add "View Deal Card" button with navigation
- [x] 6.7 Implement close via back button and ESC key
- [x] 6.8 Add loading state for document fetching

## 7. Inbox Filtering

- [x] 7.1 Implement materiality tier filters (HIGH/MEDIUM/LOW buttons)
- [x] 7.2 Add event type dropdown filter (AGENCY, COURT, FILING, SPREAD_MOVE, NEWS)
- [x] 7.3 Add deal dropdown filter (with deal counts)
- [x] 7.4 Add watchlist dropdown filter
- [x] 7.5 Implement multi-select for all dropdowns
- [x] 7.6 Add active filter badges with remove action
- [x] 7.7 Persist filter state in localStorage
- [x] 7.8 Add "Clear All Filters" button

## 8. Read/Unread Management

- [x] 8.1 Implement read status tracking per analyst per event (src/lib/read-status.ts)
- [x] 8.2 Add automatic mark-as-read (5 seconds in side panel)
- [x] 8.3 Add manual "Mark Read" button in side panel
- [x] 8.4 Add "Mark All Read" button in header with confirmation
- [x] 8.5 Update unread count in navigation badge real-time
- [x] 8.6 Store read status in localStorage (or backend when available)

## 9. Keyboard Navigation - update command palette

- [x] 9.1 Implement arrow key navigation (↑↓ to select events)
- [x] 9.2 Implement keyboard shortcuts (g+i, g+d, g+w, g+s)
- [x] 9.3 Add keyboard shortcut help modal (? key)
- [x] 9.4 Implement 'e' key to mark as read
- [x] 9.5 Implement 'v' key to open deal card
- [x] 9.6 Implement '1', '2', '3' keys to toggle materiality filters
- [x] 9.7 Add visual indicator for selected event
- [x] 9.8 Ensure keyboard navigation scrolls selected event into view

## 10. Alert Triggers

- [x] 10.1 Create `src/lib/alert-triggers.ts` utility
- [x] 10.2 Implement HIGH tier alert (score > 70) → Email + Slack
- [x] 10.3 Implement MEDIUM tier alert (score 50-70) → Slack only
- [x] 10.4 Implement LOW tier (score < 50) → Inbox only, no external alert
- [x] 10.5 Add per-deal override logic (check Settings > Alert Rules)
- [x] 10.6 Implement alert payload formatting (summary, deal context, link)
- [x] 10.7 Add 60-second delivery SLA for HIGH alerts
- [x] 10.8 Add 5-minute delivery SLA for MEDIUM alerts

## 11. Keyboard Shortcuts & Accessibility Cleanup

- [ ] 11.1 Audit existing keyboard shortcuts vs command palette conflicts
- [ ] 11.2 Remove duplicate functionality between keyboard shortcuts and command palette
- [ ] 11.3 Consolidate all navigation shortcuts into command palette only (remove g+i/d/w/s)
- [ ] 11.4 Keep only context-specific shortcuts (arrow keys, e, v, 1/2/3, Esc)
- [ ] 11.5 Update keyboard help modal to show only non-conflicting shortcuts
- [ ] 11.6 Ensure Cmd+K always opens command palette without conflicts
- [ ] 11.7 Add ARIA labels and accessibility attributes to all interactive elements
- [ ] 11.8 Test keyboard navigation flow end-to-end


## 12. Settings Page - Core Structure

- [x] 12.1 Create `src/app/app/settings/page.tsx` route
- [x] 12.2 Create tabbed layout component (5 tabs)
- [x] 12.3 Implement tab switching with URL state (?tab=integrations)
- [x] 12.4 Persist selected tab across page reloads
- [x] 12.5 Add smooth tab transition animations
- [x] 12.6 Add search to deals page
- [x] 12.7 Use Regulation and Litigation instead of Reg/Lit in deals page
- [x] 12.8 Add click-outside to close filter dropdowns
- [x] 12.9 Add keyboard navigation visual indicators (hint text)
- [x] 12.10 Add pagination to deals page
- [x] 12.11 Fix keyboard shortcuts (ignore inputs, Shift+?, prevent defaults)
- [x] 12.12 Remove pagination from inbox page (show all events)
- [x] 12.13 Refactor dropdowns to use standard UI library components (shadcn/ui or similar)
- [x] 12.14 Add pagination/virtualization to event type and deal dropdowns for large datasets
- [x] 12.15 Add more mock deals data (expand from 12 to 50+ deals for realistic pagination)
- [x] 12.16 Research and implement proper pagination package using context7
- [x] 12.17 ADD inbox pagination


## 14. Settings - Alert Rules Tab

- [ ] 14.1 Create `src/components/settings/alert-rules-tab.tsx`
- [ ] 14.2 Implement default thresholds section (materiality, spread, outside date, channels)
- [ ] 14.3 Add inline editors for each threshold
- [ ] 14.4 Implement per-deal overrides section with "+ Add Override" button
- [ ] 14.5 Add override modal (deal selector, event type checkboxes)
- [ ] 14.6 Implement email digest configuration (daily/weekly, time, tiers)
- [ ] 14.7 Add auto-save with 2-second debounce
- [ ] 14.8 Add success/error toast notifications - use standard packages  for tanstack or shadcn/ui

## 15. Settings - Integrations Tab

- [ ] 15.1 Create `src/components/settings/integrations-tab.tsx`
- [ ] 15.2 Display connected integrations list (Slack, Email, Webhooks)
- [ ] 15.3 Implement "+ Add Integration" modal with type selector
- [ ] 15.4 Add Slack OAuth flow integration
- [ ] 15.5 Add Email integration with verification flow
- [ ] 15.6 Add Webhook configuration (URL, event types, test payload)
- [ ] 15.7 Implement Edit and Disconnect actions
- [ ] 15.8 Add integration status indicators (Active, Pending, Error)

## 16. Settings - RSS Feeds Tab

- [ ] 16.1 Create `src/components/settings/rss-feeds-tab.tsx`
- [ ] 16.2 Display built-in feeds section (SEC, FTC/DOJ, CourtListener)
- [ ] 16.3 Display custom feeds section with "+ Add Custom Feed" button
- [ ] 16.4 Implement add custom feed modal (URL, watchlist selector)
- [ ] 16.5 Add feed validation and parsing
- [ ] 16.6 Implement Edit and Delete actions for custom feeds
- [ ] 16.7 Show last sync timestamp for each feed

## 17. Settings - Team Tab

- [ ] 17.1 Create `src/components/settings/team-tab.tsx`
- [ ] 17.2 Display team members list with roles
- [ ] 17.3 Implement "+ Invite New Member" modal (email, role)
- [ ] 17.4 Add invitation email sending
- [ ] 17.5 Implement Edit member permissions modal
- [ ] 17.6 Implement Remove member action with confirmation
- [ ] 17.7 Add permissions model enforcement (admin/analyst/pm)
- [ ] 17.8 Show pending invitations with status

## 18. Settings - API Keys Tab

- [ ] 18.1 Create `src/components/settings/api-keys-tab.tsx`
- [ ] 18.2 Display API keys list (ID, created, last used)
- [ ] 18.3 Implement "+ Generate New Key" modal with name field
- [ ] 18.4 Show generated key value once with copy button
- [ ] 18.5 Implement Rotate action with 24-hour grace period
- [ ] 18.6 Implement Revoke action with immediate invalidation
- [ ] 18.7 Add Copy key ID action
- [ ] 18.8 Add "API Documentation" link

## 19. Settings - Search and Quick Access

- [ ] 19.1 Add settings search field in header
- [ ] 19.2 Implement search across all tabs and sections
- [ ] 19.3 Add search result highlighting and navigation
- [ ] 19.4 Add "Configure Alerts" quick link in Inbox header
- [ ] 19.5 Implement deep linking to specific settings sections

## 20. Watchlists Page

- [ ] 20.1 Enhance existing `src/app/app/watchlists/[id]/page.tsx`
- [ ] 20.2 Create main Watchlists page at `src/app/app/watchlists/page.tsx`
- [ ] 20.3 Display all watchlists with deal counts
- [ ] 20.4 Add "+ Create Watchlist" button
- [ ] 20.5 Implement watchlist creation modal
- [ ] 20.6 Add Edit and Delete actions for watchlists
- [ ] 20.7 Ensure navigation from Watchlist modal "View" button works

## 21. Deal Card Timeline Redesign
- [ ] 21.1 make watchlist filter mathc the design of the rest of the filters on the deals page
- [ ] 21.2 Implement unified chronological timeline
- [ ] 21.3 Add materiality badges to timeline events
- [ ] 21.4 Implement collapsible sections (Deal Terms, Probabilities, Spread History)
- [ ] 21.5 Make Event Timeline the primary section (expanded by default)
- [ ] 21.6 Add "Show More" button for events >30 days old
- [ ] 21.7 Implement event type and materiality filters within timeline

## 22. Route Cleanup and Redirects

- [ ] 22.1 Update `/app` route to redirect to `/app/inbox`
- [ ] 22.2 Add redirects from old routes to new equivalents:
  - `/app/feed` → `/app/inbox`
  - `/app/intelligence` → `/app/inbox`
  - `/app/notifications` → `/app/inbox`
- [ ] 22.3 Remove Dashboard page component
- [ ] 22.4 Remove Live Monitor page component
- [ ] 22.5 Remove Deal Intelligence page component
- [ ] 22.6 Remove Notifications page component
- [ ] 22.7 Remove Discovery page component

## 23. Data Migration and Compatibility

- [ ] 23.1 Migrate existing watchlists from localStorage to new format (if needed)
- [ ] 23.2 Migrate alert configurations to Settings structure
- [ ] 23.3 Migrate RSS feed subscriptions to Settings
- [ ] 23.4 Ensure backward compatibility during rollout
- [ ] 23.5 Add migration script for user preferences

## 24. Mock Data Validation and Updates

- [ ] 24.1 Review existing mock data in `src/lib/constants.ts` (MOCK_DEALS, MOCK_EVENTS, MOCK_CLAUSES)
- [ ] 24.2 Add materiality scores to MOCK_EVENTS for Inbox testing
- [ ] 24.3 Ensure MOCK_EVENTS include all required fields: type (AGENCY/COURT/FILING/SPREAD_MOVE/NEWS), timestamp, dealId, materiality score
- [ ] 24.4 Add mock events with exact event types from spec: FTC Second Request (85 pts), FTC Complaint (95 pts), Injunction (90 pts), 8-K Amendment (60 pts), Spread moves (40-70 pts)
- [ ] 24.5 Create mock data for Settings: alert rules, integrations, RSS feeds, team members, API keys
- [ ] 24.6 Add mock read/unread status data structure for Inbox testing
- [ ] 24.7 Ensure mock deals have all fields needed for inline context: currentSpread, p_close_base, outsideDate, daysUntilOutside
- [ ] 24.8 Add mock data for event detail side panel: summary, key points, source links
- [ ] 24.9 Create mock data for unified Deal Card timeline (remove tab-specific mocks)
- [ ] 24.11 Update `src/lib/api.ts` to support new Inbox endpoints: `getAllEvents()`, `getEventById()`, `markEventAsRead()`
- [ ] 24.12 Add mock API responses for Settings endpoints: alert rules, integrations, RSS feeds
- [ ] 24.13 Verify NEXT_PUBLIC_USE_MOCK_DATA flag works with all new components
- [ ] 24.14 Document mock data structure changes in comments

## 25. Real-Time Updates
- [ ] 25.2 Add new event toast notification ("1 new event")
- [ ] 25.3 Prepend new events to timeline
- [ ] 25.4 Update unread count in real-time
- [ ] 25.5 Add click-to-scroll on toast notification
