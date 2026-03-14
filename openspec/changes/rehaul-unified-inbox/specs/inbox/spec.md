## ADDED Requirements

### Requirement: Unified Event Timeline

The Inbox SHALL display all events from all sources (filings, court, agency, spread movements, news) in a single chronological timeline sorted by materiality score and timestamp.

#### Scenario: Morning triage workflow
- **WHEN** analyst opens j16z platform
- **THEN** Inbox page loads as default landing page
- **AND** displays all unread events sorted by materiality (HIGH → MEDIUM → LOW)
- **AND** shows unread count in navigation badge
- **AND** events are grouped by materiality tier with visual separators

#### Scenario: Multi-source event display
- **WHEN** Inbox contains events from SEC filings, FTC actions, and court dockets
- **THEN** all events appear in single unified timeline
- **AND** each event shows source type icon (filing, agency, court, spread, news)
- **AND** events are not duplicated across multiple views
- **AND** timestamp shows relative time ("2 hrs ago") and absolute date on hover

#### Scenario: Materiality-based sorting
- **WHEN** Inbox receives new HIGH materiality event (score > 70)
- **THEN** event appears at top of timeline with red badge
- **AND** unread indicator (●) is visible
- **AND** event includes inline deal context (spread, p_close, days to outside date)

### Requirement: Materiality Scoring System

The Inbox SHALL calculate materiality scores (0-100) for all events using event type base scores plus urgency and risk adjustments.

#### Scenario: FTC Second Request scoring
- **WHEN** FTC issues Second Request for deal with <30 days to outside date and p_close of 85%
- **THEN** base score is 85 (FTC Second Request base)
- **AND** urgency adjustment of +20 applied (<30 days to outside date)
- **AND** no risk adjustment applied (p_close > 40%)
- **AND** final materiality score is 105, capped at 100 (HIGH tier)

#### Scenario: Spread movement with urgency
- **WHEN** spread moves 2.5% on deal with 20 days to outside date and p_close of 35%
- **THEN** base score is 40 (SPREAD_MOVE >2% movement)
- **AND** urgency adjustment of +20 applied (<30 days to outside date)
- **AND** risk adjustment of +15 applied (p_close < 40%)
- **AND** final materiality score is 75 (HIGH tier)

#### Scenario: Learning from analyst feedback
- **WHEN** analyst marks event as "not material"
- **THEN** similar future events receive -25 score adjustment
- **AND** adjustment persists across sessions
- **AND** analyst can reset learned preferences in Settings

### Requirement: Side Panel Event Details

The Inbox SHALL display event details in a slide-out right panel when analyst clicks an event, following the CourtListener pattern.

#### Scenario: FTC event detail panel
- **WHEN** analyst clicks HIGH materiality FTC Second Request event
- **THEN** right panel slides in from right edge (300-400px width)
- **AND** panel shows event summary, key points, and source link
- **AND** panel includes "View Deal Card" button with inline deal context
- **AND** main timeline remains visible on left
- **AND** panel can be closed via back button or ESC key

#### Scenario: Source document access
- **WHEN** side panel displays court filing event
- **THEN** panel shows filing summary and metadata
- **AND** "View Source Document" link opens PDF in new tab
- **AND** panel optionally shows collapsible full text for text-based sources
- **AND** loading state appears while fetching document

#### Scenario: Deal context integration
- **WHEN** side panel shows event for Microsoft/Activision deal
- **THEN** panel displays current spread (1.7%), p_close (60%), and days to outside date (129d)
- **AND** "View Deal Card" button navigates to full deal detail
- **AND** deal context updates in real-time if spread changes

### Requirement: Filtering and Search

The Inbox SHALL provide filters for materiality tier, event type, deal, watchlist, and unread status.

#### Scenario: Filter by materiality tier
- **WHEN** analyst clicks "HIGH" filter button
- **THEN** timeline shows only events with score > 70
- **AND** filter button appears selected (highlighted)
- **AND** event count updates to show "5 of 12 events"
- **AND** filter persists across page reloads

#### Scenario: Filter by event type
- **WHEN** analyst selects "AGENCY" from type dropdown
- **THEN** timeline shows only FTC/DOJ/regulatory events
- **AND** other event types are hidden
- **AND** filters can be combined (e.g., HIGH + AGENCY)

#### Scenario: Unread-only toggle
- **WHEN** analyst enables "Unread Only" checkbox
- **THEN** timeline shows only events with unread indicator (●)
- **AND** read events (○) are hidden
- **AND** toggle state persists across sessions

#### Scenario: Deal-specific filter
- **WHEN** analyst selects "Microsoft/Activision" from deal dropdown
- **THEN** timeline shows only events for that deal
- **AND** dropdown shows deal count for each option
- **AND** "All Deals" option clears filter

### Requirement: Read/Unread Management

The Inbox SHALL track read status for each event per analyst and provide mark-as-read actions.

#### Scenario: Automatic mark as read
- **WHEN** analyst clicks event and views side panel for >5 seconds
- **THEN** event is automatically marked as read
- **AND** unread indicator changes from ● to ○
- **AND** unread count in navigation badge decrements

#### Scenario: Manual mark as read
- **WHEN** analyst clicks "Mark Read" button in side panel
- **THEN** event is immediately marked as read
- **AND** side panel closes
- **AND** next unread event is selected (if available)

#### Scenario: Mark all as read
- **WHEN** analyst clicks "Mark All Read" button in header
- **THEN** confirmation dialog appears
- **AND** upon confirmation, all visible events are marked as read
- **AND** unread count resets to 0
- **AND** unread indicators update to ○

### Requirement: Alert Triggers

The Inbox SHALL trigger external alerts (email, Slack) based on materiality score thresholds configured in Settings.

#### Scenario: HIGH materiality external alert
- **WHEN** new event scores > 70 (HIGH tier)
- **THEN** email alert is sent to analyst's configured address immediately
- **AND** Slack message is posted to configured channel immediately
- **AND** alert includes event summary, deal context, and link to Inbox
- **AND** alert is delivered within 60 seconds of event detection (immediate SLA)

#### Scenario: MEDIUM materiality Slack-only alert
- **WHEN** new event scores 50-70 (MEDIUM tier)
- **THEN** Slack message is posted (no email sent)
- **AND** message includes event summary and link to Inbox
- **AND** alert is delivered same day (within 5 minutes typical)

#### Scenario: LOW materiality no external alert
- **WHEN** new event scores < 50 (LOW tier)
- **THEN** no email or Slack alert is sent
- **AND** event appears in Inbox only
- **AND** unread count increments

#### Scenario: Per-deal alert override
- **WHEN** analyst configures Microsoft/Activision to alert only on AGENCY + COURT events
- **THEN** FILING and NEWS events for that deal do not trigger external alerts
- **AND** AGENCY and COURT events still trigger based on materiality threshold
- **AND** override is visible in Settings > Alert Rules

### Requirement: Keyboard Navigation

The Inbox SHALL support keyboard shortcuts for efficient navigation and triage.

#### Scenario: Arrow key navigation
- **WHEN** analyst presses ↓ key
- **THEN** next event in timeline is selected
- **AND** side panel updates to show selected event
- **AND** selected event scrolls into view if off-screen

#### Scenario: Mark as read shortcut
- **WHEN** analyst presses 'e' key on selected event
- **THEN** event is marked as read
- **AND** next unread event is selected
- **AND** side panel updates

#### Scenario: Open deal card shortcut
- **WHEN** analyst presses 'v' key on selected event
- **THEN** deal card page opens for event's associated deal
- **AND** event context is preserved (can navigate back to Inbox)

#### Scenario: Filter shortcuts
- **WHEN** analyst presses '1' key
- **THEN** HIGH filter is toggled
- **WHEN** analyst presses '2' key
- **THEN** MEDIUM filter is toggled
- **WHEN** analyst presses '3' key
- **THEN** LOW filter is toggled

### Requirement: Performance and Pagination

The Inbox SHALL load initial events quickly and support pagination for long timelines.

#### Scenario: Initial page load
- **WHEN** analyst navigates to Inbox
- **THEN** first 20 events load within 500ms
- **AND** loading skeleton appears during fetch
- **AND** unread count is accurate

#### Scenario: Load more events
- **WHEN** analyst scrolls to bottom of timeline
- **AND** clicks "Load More" button
- **THEN** next 20 events are fetched and appended
- **AND** scroll position is maintained
- **AND** loading indicator appears during fetch

#### Scenario: Real-time updates
- **WHEN** new event is detected while analyst is viewing Inbox
- **THEN** new event appears at top of timeline
- **AND** unread count increments
- **AND** toast notification appears ("1 new event")
- **AND** analyst can click toast to scroll to new event
