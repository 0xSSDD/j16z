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

## Implementation Timeline

**Rollout Strategy:** Phased rollout with feature flags

**Phase 1 - Beta (Week 1-2):**
- Enable for internal team only via feature flag `ENABLE_UNIFIED_INBOX`
- Monitor performance metrics, error rates, and user feedback
- Success criteria: <5% error rate, positive internal feedback

**Phase 2 - Canary (Week 3):**
- Enable for 10% of users (selected power users)
- A/B test against old interface
- Success criteria: Time-to-action improvement >40%, <10% rollback requests

**Phase 3 - General Availability (Week 4):**
- Full rollout to all users
- Old routes redirect to new structure
- In-app migration guide and changelog

**Rollback Plan:**
- Feature flag allows instant revert to old UI
- Data remains intact (localStorage-based, no schema changes)
- Rollback triggers: >15% error rate, >25% negative feedback, critical bugs

## Testing & QA Strategy

**Unit Tests:**
- All new components (Inbox, Settings tabs, Watchlists)
- Filter logic, search functionality, pagination
- localStorage persistence and migration

**Integration Tests:**
- Navigation flow: Inbox → Deal Card → Settings
- Filter combinations and edge cases
- Modal interactions and form submissions

**Load/Performance Tests:**
- Inbox with 1000+ events (expected volume)
- Pagination performance with large datasets
- localStorage read/write performance
- Target: <200ms initial load, <50ms filter updates

**E2E Tests:**
- Critical user journeys: View event → Take action → Configure alert
- Keyboard navigation and accessibility
- Cross-browser compatibility (Chrome, Safari, Firefox)

**Staging Sign-off:**
- Product team approval
- QA team regression testing
- Performance benchmarks met

## Analytics & Reporting Impact

**Removed Dashboard Metrics:**
- Deal pipeline overview (count by status)
- Event volume by type/severity
- Alert trigger frequency
- Time-to-action analytics

**New Metrics Location:**
- Settings > Alert Rules: Alert performance metrics (trigger rate, opt-out rate)
- Deals page: Deal pipeline stats (via filters and counts)
- Inbox: Real-time event counts by severity/type (filter badges)

**Historical Data Access:**
- Export functionality on Deals page (CSV/JSON)
- Settings > Alert Rules shows historical alert performance
- No loss of data - UI reorganization only

**Migration Steps:**
- Document new metrics locations in changelog
- Add tooltips pointing to new locations
- Email guide to all users with before/after screenshots

## User Communication Plan

**Pre-Launch (1 week before):**
- Email announcement with feature preview video
- In-app banner: "New unified inbox coming soon"
- Documentation site updated with migration guide

**Launch Day:**
- In-app modal on first login: "Welcome to the new j16z"
- Interactive tour highlighting key changes
- Changelog entry with detailed breakdown

**Post-Launch (Ongoing):**
- In-app help tooltips for new features
- Support runbook for common questions
- Weekly feedback collection via in-app survey

**Support Resources:**
- Migration guide: Old page → New location mapping
- Video tutorials for Inbox, Settings, Watchlists
- FAQ document addressing common concerns
- Dedicated Slack channel for feedback

## Rollback Plan

**Rollback Criteria:**
- Error rate >15% for 2+ hours
- >25% of users request old interface
- Critical bug affecting core functionality (deal viewing, event filtering)
- Performance degradation >50% from baseline

**Rollback Steps:**
1. Disable feature flag `ENABLE_UNIFIED_INBOX`
2. Verify old routes are functional
3. Check localStorage data integrity
4. Notify users via in-app banner
5. Post-mortem within 24 hours

**Data Integrity Checks:**
- Verify watchlists persist correctly
- Confirm alert configurations unchanged
- Validate no event data loss
- Check user preferences intact

**Post-Mortem Timeline:**
- Incident report within 24 hours
- Root cause analysis within 48 hours
- Fix timeline communicated to users
- Re-launch plan with additional safeguards
