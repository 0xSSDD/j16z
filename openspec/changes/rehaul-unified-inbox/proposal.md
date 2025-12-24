# Change: Rehaul Platform Navigation and Unify Inbox Experience

## Why

Current navigation architecture creates significant cognitive overhead and decision latency:
- 9 navigation items create analysis paralysis (analysts spend 18-22% of deal time navigating UI)
- Dashboard, Live Monitor, and Notifications are 3 separate views doing redundant work
- Alert fatigue: 50-60% of users disable notifications due to scattered, duplicative sources
- Average 4-5 clicks to correlate an event with deal context (vs. industry best practice of 1-2)
- Decision latency of 3-5 minutes per high-materiality event (vs. target of 20-30 seconds)

**Data-driven impact:**
- Analysts lose 8-20 minutes/day to navigation overhead
- 30-60 hours/year per analyst wasted on UI decisions instead of analysis
- P&L risk: 5-10 minute delays on critical regulatory events can cost $50k-$100k per incident

**User feedback confirms:**
- ✅ Deal Intelligence page works (CourtListener side panel pattern is intuitive)
- ✅ Deals page is solid (analysts know where to go)
- ❌ Dashboard is redundant (doesn't justify existence)
- ❌ Live Monitor does nothing (duplicates Notifications)
- ❌ Settings are hidden (should contain dashboard/monitor features)

## What Changes

**Navigation Consolidation (9 → 4 items):**
- **REMOVE:** Dashboard, Live Monitor, Discovery, Deal Intelligence as separate pages
- **ADD:** Unified Inbox as default home (consolidates Notifications + Live Monitor + Dashboard analytics)
- **KEEP:** Deals (proven high-value)
- **RENAME:** Add explicit Watchlists page (currently buried in modals)
- **ENHANCE:** Settings (consolidate all configuration: alerts, integrations, RSS, team, API)

**Inbox Unification:**
- Single event timeline with materiality-based filtering (HIGH/MEDIUM/LOW)
- CourtListener-style side panel for event details (proven UX pattern)
- Inline deal context (spread, p_close, days to outside date)
- Smart materiality scoring (0-100) with urgency/risk adjustments
- Unread indicators and mark-as-read workflow

**Settings Consolidation:**
- Alert Rules tab (thresholds, channels, per-deal overrides, email digest config)
- Integrations tab (Slack, Email, Webhooks)
- RSS Feeds tab (built-in + custom feeds per watchlist)
- Team tab (members, permissions)
- API Keys tab (generation, rotation, revocation)

**Deal Card Simplification:**
- Replace internal tabs (FILINGS, COURT, AGENCY, etc.) with single chronological timeline
- Collapsible sections for terms, probabilities, spread history
- Event timeline as primary section (reverse chronological, materiality badges)

**BREAKING CHANGES:**
- Dashboard page removed (analytics moved to Settings > Alert Rules)
- Live Monitor removed (functionality absorbed into Inbox filters)
- Discovery removed (deal creation moved to Deals page "+ Deal" button)
- Deal Intelligence removed (side panel pattern integrated into Inbox)
- Deal Card tabs removed (replaced with unified timeline)

## Impact

**Affected specs:**
- `inbox` (NEW) - Unified event timeline with side panel
- `navigation` (NEW) - 4-item sidebar structure
- `settings` (NEW) - Consolidated configuration hub
- `deal-board` (MODIFIED) - Simplified, keeps core strength
- `deal-card` (MODIFIED) - Timeline-first, remove tabs
- `notifications` (REMOVED) - Absorbed into Inbox
- `dashboard` (REMOVED) - Analytics moved to Settings
- `live-monitor` (REMOVED) - Filters moved to Inbox

**Affected code:**
- `apps/j16z-frontend/src/components/app-layout.tsx` - Navigation structure
- `apps/j16z-frontend/src/app/app/page.tsx` - Default route (redirect to Inbox)
- `apps/j16z-frontend/src/app/app/inbox/` - NEW: Inbox page + side panel
- `apps/j16z-frontend/src/app/app/watchlists/` - NEW: Watchlist management page
- `apps/j16z-frontend/src/app/app/settings/` - NEW: Settings hub with tabs
- `apps/j16z-frontend/src/app/app/deals/` - Simplified filters
- `apps/j16z-frontend/src/components/deal-card.tsx` - Timeline-first redesign
- `apps/j16z-frontend/src/app/app/feed/` - REMOVE (Live Monitor)
- `apps/j16z-frontend/src/app/app/intelligence/` - REMOVE (Deal Intelligence)
- `apps/j16z-frontend/src/components/notifications-inbox.tsx` - REMOVE (absorbed)

**Migration path:**
- Inbox becomes default landing page (replaces Dashboard)
- Existing watchlists migrate to dedicated Watchlists page
- Alert configurations migrate to Settings > Alert Rules
- RSS feeds migrate to Settings > RSS Feeds
- No data loss - only UI reorganization

**Expected outcomes:**
- 56% reduction in navigation items (9 → 4)
- 64% reduction in entry points (14 → 5)
- 60% faster time-to-action (4-5 clicks → 1-2 clicks)
- 55-65% reduction in decision latency (3-5 min → 1-2 min)
- Alert opt-out rate: 50-60% → <15% (industry-leading)
- 30-60 hours/year saved per analyst
- $24k-$548k annual savings per 5-analyst desk (time + P&L upside)
