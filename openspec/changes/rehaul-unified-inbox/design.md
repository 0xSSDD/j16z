# Design: Unified Inbox and Navigation Rehaul

## Context

The current j16z platform has evolved organically with 9 navigation items and 14 entry points, creating significant cognitive overhead for analysts. User research and behavioral metrics indicate:

- Analysts spend 18-22% of deal time navigating UI instead of analyzing
- Dashboard, Live Monitor, and Notifications are redundant (3 views doing similar work)
- Alert fatigue: 50-60% disable notifications due to scattered sources
- Decision latency: 3-5 minutes per high-materiality event (vs. 20-30 second target)
- Deal Intelligence page's CourtListener-style side panel is the most successful UX pattern

**Stakeholders:**
- Primary: PE/hedge fund analysts (power users, 8-12 hours/day in platform)
- Secondary: Portfolio managers (view-only, periodic check-ins)
- Tertiary: Corporate development teams (occasional use)

**Constraints:**
- Must maintain "dark room, bright screen" institutional aesthetic
- High data density required (large desktop monitors, mobile secondary)
- Cannot lose existing functionality (only reorganize)
- Zero data migration required (UI-only changes)

## Goals / Non-Goals

**Goals:**
- Reduce navigation items from 9 to 4 (56% reduction)
- Consolidate 3 alert sources (Dashboard, Live Monitor, Notifications) into 1 unified Inbox
- Achieve <15% alert opt-out rate (vs. current 50-60%)
- Reduce decision latency from 3-5 min to 1-2 min (55-65% improvement)
- Implement proven CourtListener side panel pattern across platform
- Save 30-60 hours/year per analyst in navigation overhead

**Non-Goals:**
- Not changing AI Analyst, Prediction Metrics, or Risk Radar (out of scope for this rehaul)
- Not modifying core deal data model or backend APIs
- Not adding new data sources or integrations
- Not changing authentication or permissions model
- Not implementing mobile-first responsive design (desktop remains primary)

## Decisions

### Decision 1: Inbox as Default Landing Page

**What:** Make `/app/inbox` the default route, replacing `/app` (Dashboard)

**Why:**
- 85% of morning opens should go to event triage (data-driven prediction)
- Single obvious choice eliminates decision paralysis (90% of users skip nav decision)
- Aligns with email/Slack mental model (inbox = unprocessed work)

**Alternatives considered:**
- Keep Deals as default: Rejected because analysts need event triage first, then deal context
- Keep Dashboard: Rejected because it's redundant with Inbox + Settings analytics
- Make it configurable: Rejected to avoid complexity; single opinionated default is better

**Trade-offs:**
- Risk: Analysts who prefer deal-first workflow may resist
- Mitigation: Provide keyboard shortcut (e.g., `g d` for "go to deals") and prominent Deals nav item

### Decision 2: CourtListener Side Panel Pattern

**What:** Implement slide-out right panel for event details (source docs, deal context, actions)

**Why:**
- Proven successful in Deal Intelligence page (80% daily active use)
- Eliminates page navigation (context stays visible)
- Matches analyst mental model from legal research tools (CourtListener, Westlaw)

**Alternatives considered:**
- Modal overlays: Rejected because they obscure the event list
- Full-page navigation: Rejected because it breaks context (current pain point)
- Inline expansion: Rejected because it pushes other events down (poor UX for scanning)

**Trade-offs:**
- Requires wider viewport (minimum 1280px recommended)
- Mobile experience degrades (acceptable per constraints)

### Decision 3: Materiality Scoring Algorithm

**What:** 0-100 score with event type base + urgency/risk adjustments

**Algorithm:**
```
Base Score (by event type):
- AGENCY (FTC/DOJ): 70-95
- COURT (injunction, motion): 60-90
- FILING (S-4, 8-K): 40-80
- SPREAD_MOVE: 30-70 (based on magnitude)
- NEWS: 10-40

Adjustments:
+ 20 if <30 days to outside_date (urgency)
+ 15 if p_close < 40% (high-risk)
+ 10 if litigation count > 3 (crowded docket)
- 25 if analyst previously flagged "not material" (learning)

Alert Triggers:
- Score > 70: Email + Slack (immediate)
- Score 50-70: Slack only (same day)
- Score < 50: Inbox only (no external alert)
```

**Why:**
- Reduces alert volume by 60-70% (only HIGH events trigger external alerts)
- Learns from analyst feedback (negative adjustment for false positives)
- Urgency boost ensures time-sensitive events surface

**Alternatives considered:**
- Binary HIGH/LOW: Rejected because it's too coarse (no MEDIUM tier)
- ML-based scoring: Rejected for v1 (insufficient training data, black box)
- User-configurable thresholds: Deferred to v2 (adds complexity)

**Trade-offs:**
- Risk: Threshold tuning required post-launch (70 may be too high/low)
- Mitigation: Instrument alert-disable rate and adjust thresholds in weeks 2-4

### Decision 4: Settings Consolidation

**What:** Move all configuration to Settings hub with 5 tabs (Alert Rules, Integrations, RSS Feeds, Team, API Keys)

**Why:**
- Dashboard analytics (alert thresholds, digest config) belong in Settings
- Live Monitor channel selection (Slack/Email) belongs in Integrations
- RSS feed management currently scattered across modals
- Single source of truth for all system configuration

**Alternatives considered:**
- Keep settings distributed: Rejected because it perpetuates current confusion
- Add more tabs: Rejected to avoid tab proliferation (5 is manageable)
- Use accordion instead of tabs: Rejected because tabs provide better scannability

**Trade-offs:**
- Settings page becomes dense (5 tabs with multiple sections each)
- Mitigation: Use clear visual hierarchy, collapsible sections, search/filter within tabs

### Decision 5: Deal Card Timeline-First Redesign

**What:** Replace internal tabs (FILINGS, COURT, AGENCY, SPREAD_MOVE, NEWS) with single chronological timeline

**Why:**
- Tabs force analysts to check 5 separate views (cognitive overhead)
- Chronological timeline matches analyst mental model (what happened when?)
- Materiality badges provide instant prioritization (no need to filter by type)

**Alternatives considered:**
- Keep tabs but add "All Events" tab: Rejected because it doesn't solve the core problem
- Grouped timeline (by type): Rejected because chronology is more important than grouping
- Infinite scroll: Rejected for v1 (use "Show More" button to avoid performance issues)

**Trade-offs:**
- Long timelines (100+ events) may be overwhelming
- Mitigation: Collapse events >30 days old by default, provide filters (type, materiality)

## Risks / Trade-offs

### Risk 1: User Resistance to Change

**Risk:** Analysts accustomed to current navigation may resist rehaul

**Likelihood:** Medium (change aversion is common)

**Impact:** High (could derail adoption)

**Mitigation:**
- Phase 1: Internal testing with 2-3 design partners (week 1-2)
- Phase 2: Early access with 5-10 pilot analysts (week 3-4)
- Phase 3: Gradual rollout with migration guide and in-app tooltips (week 5+)
- Provide feedback channel and iterate quickly on pain points

### Risk 2: Materiality Scoring Accuracy

**Risk:** Threshold of 70 for external alerts may be too high (miss critical events) or too low (alert fatigue persists)

**Likelihood:** Medium (tuning required)

**Impact:** High (defeats purpose if wrong)

**Mitigation:**
- Instrument alert-disable rate and decision latency metrics
- A/B test thresholds (70 vs. 60 vs. 80) with pilot users
- Provide per-deal override in Settings > Alert Rules
- Plan to adjust thresholds in weeks 2-4 based on data

### Risk 3: Side Panel Performance

**Risk:** Loading source documents (FTC press releases, court filings) in side panel may be slow

**Likelihood:** Low (most docs are <500KB)

**Impact:** Medium (degrades UX)

**Mitigation:**
- Implement optimistic UI (show summary immediately, load full doc async)
- Cache frequently accessed docs (FTC/DOJ press releases)
- Provide "View in New Tab" fallback for large PDFs

### Risk 4: Settings Discoverability

**Risk:** Moving Dashboard/Live Monitor features to Settings may make them harder to find

**Likelihood:** Medium (Settings are often ignored)

**Impact:** Medium (reduces configuration adoption)

**Mitigation:**
- Add quick settings link in Inbox header ("Configure Alerts")
- Provide in-app tooltips on first visit ("Alert rules moved to Settings")
- Include Settings tour in onboarding flow

## Migration Plan

### Phase 1: Preparation (Week 0)

1. Create feature flag `ENABLE_UNIFIED_INBOX` (default: false)
2. Build Inbox, Navigation, Settings pages behind flag
3. Set up analytics instrumentation (Plausible/Posthog):
   - Navigation click heatmap
   - Decision latency (time from event to action)
   - Alert-disable rate
   - Page view distribution

### Phase 2: Internal Testing (Week 1-2)

1. Enable flag for 2-3 design partners (internal team)
2. Collect qualitative feedback:
   - Does Inbox feel like home?
   - Is side panel depth sufficient?
   - Are materiality badges clear?
3. Iterate on UX issues (expect 2-3 rounds)
4. Verify materiality scoring not too noisy (check alert volume)

### Phase 3: Pilot (Week 3-4)

1. Enable flag for 5-10 external pilot analysts
2. Monitor metrics:
   - Navigation heatmap (expect 85% Inbox, 10% Deals, 3% Watchlists, 2% Settings)
   - Decision latency (target: <2 min for HIGH events)
   - Alert-disable rate (target: <20%)
3. Gather feedback via weekly check-ins
4. Fix regressions and tune thresholds

### Phase 4: Gradual Rollout (Week 5-8)

1. Enable for 25% of users (week 5)
2. Enable for 50% of users (week 6)
3. Enable for 75% of users (week 7)
4. Enable for 100% of users (week 8)
5. Monitor metrics at each stage, roll back if issues

### Phase 5: Cleanup (Week 9+)

1. Remove feature flag
2. Delete old Dashboard, Live Monitor, Deal Intelligence pages
3. Update documentation and help center
4. Archive old code

### Rollback Plan

If critical issues arise:
1. Disable feature flag (instant rollback to old UI)
2. Investigate root cause
3. Fix and re-enable for pilot group
4. Resume gradual rollout once stable

## Open Questions

### Q1: Inbox as Home - Confirmation Needed

**Question:** Should Inbox be the default landing page for all users, or should power users have option to set Deals as default?

**Options:**
- A: Inbox for all (opinionated, simpler)
- B: User-configurable default (flexible, adds complexity)

**Recommendation:** Start with A (Inbox for all), add B in v2 if user feedback demands it

**Decision needed by:** Week 1 (before pilot)

### Q2: Side Panel Depth - Source Document Display

**Question:** Should FTC event panel show full press release text inline, or just summary + link to external site?

**Options:**
- A: Summary + link (lighter, faster)
- B: Full text inline (self-contained, slower)
- C: Summary + collapsible full text (best of both, more complex)

**Recommendation:** Start with C (summary + collapsible), measure usage to decide if full text is needed

**Decision needed by:** Week 1 (before pilot)

### Q3: Deal Card Timeline - Old Event Handling

**Question:** Should events >30 days old be collapsed by default, or always visible?

**Options:**
- A: Collapse >30d (cleaner, may hide important context)
- B: Always visible (comprehensive, overwhelming for long timelines)
- C: Collapse >30d with "Show All" button (balanced)

**Recommendation:** Start with C (collapse with button), measure "Show All" click rate

**Decision needed by:** Week 2 (before pilot)

### Q4: Materiality Threshold - Alert Trigger

**Question:** Is 70 the right threshold for external alerts (email/Slack), or should it be 60 or 80?

**Options:**
- A: 70 (current proposal)
- B: 60 (more sensitive, higher alert volume)
- C: 80 (less sensitive, lower alert volume)

**Recommendation:** A/B test 70 vs. 60 with pilot users, measure alert-disable rate

**Decision needed by:** Week 3 (after initial pilot feedback)

### Q5: Settings Quick Access

**Question:** Should there be a quick settings link on the Inbox page (e.g., "Configure Alerts" button), or rely on Settings nav item?

**Options:**
- A: Quick link on Inbox (more discoverable)
- B: Settings nav only (cleaner UI)

**Recommendation:** A (quick link), especially for first 2-4 weeks post-launch

**Decision needed by:** Week 1 (before pilot)
