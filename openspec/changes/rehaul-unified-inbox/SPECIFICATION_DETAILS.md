# Exact Specification Details from Source Documents

This document captures precise specifications from Rehaul.md and RehaulVisual.md that MUST be implemented exactly as specified.

## Materiality Scoring Algorithm (Exact Values)

### Base Scores by Event Type

**AGENCY EVENT (FTC/DOJ):**
- FTC Complaint: 95 points
- FTC Second Request: 85 points
- DOJ Press Release: 80 points
- Regulatory approval: 60 points
- Policy statement: 40 points

**COURT EVENT (Litigation):**
- Injunction Granted: 90 points
- Motion Denied (TRO): 75 points
- Motion Granted: 70 points
- Docket Entry: 50 points

**FILING EVENT (SEC):**
- S-4/DEFM14A: 80 points
- 8-K Amendment: 60 points
- 10-K/10-Q: 50 points
- Routine Update: 40 points

**SPREAD_MOVE (Market Data):**
- >5% move: 70 points
- >2% move: 40 points
- >0.5% move: 20 points

**NEWS (RSS/Qualitative):**
- Law firm antitrust alert: 40 points
- Generic news mention: 10 points

### Adjustment Factors

**Boost Factors:**
- If <30 days to outside_date: +20 points (urgency)
- If p_close_base <40%: +15 points (high risk)
- If litigation count >3: +10 points (crowded court)

**Penalty Factors:**
- If analyst marked "not material" before: -25 points (learning)

### Alert Trigger Rules

- Score > 70: 🔴 HIGH → Email + Slack (immediate, within 60 seconds)
- Score 50-70: 🟠 MEDIUM → Slack only (same day, within 5 minutes)
- Score <50: 🟡 LOW → Inbox only (no external alert)

## Inbox UI Specifications

### Event List Format

Each event displays:
```
● [🔴 HIGH] AGENCY • FTC Second Request        2 hrs ago
  MSFT/ATVI | Spread now 1.7% (was 3.2%)   [View FTC Docs >]
```

Components:
- Unread indicator: ● (unread) or ○ (read)
- Materiality badge: [🔴 HIGH], [🟠 MEDIUM], or [🟡 LOW]
- Event type: AGENCY, COURT, FILING, SPREAD_MOVE, NEWS
- Event title: Brief description
- Relative timestamp: "2 hrs ago", "15 hrs ago", "1 day ago", "2 days ago", "3 days ago"
- Deal context: "MSFT/ATVI | Spread now 1.7% (was 3.2%)"
- Action link: [View FTC Docs >], [View S-4 >], etc.

### Filter Bar

```
FILTERS: [All ▼] [HIGH] [MEDIUM] [Low]
         [Deal ▼] [Type ▼] [Watchlist ▼]   [Unread Only ☑]
```

### Side Panel Layout

```
┌─ FTC SECOND REQUEST                      -┐
│                                            │
│ Date: Dec 23, 2024, 3:15 PM               │
│ Agency: Federal Trade Commission           │
│ Event Type: Second Request (HSR)          │
│ Deal: Microsoft → Activision              │
│ Current Spread: 1.7% (↓ 150 bp)           │
│ Materiality: 🔴 HIGH (95/100)              │
│                                            │
│ ────────────────────────────────────      │
│                                            │
│ SUMMARY:                                  │
│ "FTC has issued a Second Request          │
│ for Additional Information under          │
│ the Hart-Scott-Rodino Antitrust           │
│ Improvements Act. This extends            │
│ the review period by 30 calendar          │
│ days."                                    │
│                                            │
│ KEY POINTS:                               │
│ • Request received: Dec 23, 2024          │
│ • Response deadline: Jan 22, 2025         │
│ • Likely concerns: Market                 │
│   concentration, vertical                 │
│   foreclosure                             │
│                                            │
│ ────────────────────────────────────      │
│                                            │
│ SOURCE:                                   │
│ [View FTC Press Release] ↗                │
│                                            │
│ RELATED DEAL:                             │
│ [View Deal Card >]                        │
│ MSFT/ATVI | Inside Date: Apr 30           │
│                                            │
│ ────────────────────────────────────      │
│                                            │
│ ACTION:                                   │
│ [Set Alert] [Export Event]                │
│ [Mark Read]                               │
│                                            │
└─ ─────────────────────────────────────── ┘
```

## Deal Card Timeline Redesign

### Event Timeline Format (Primary Section)

```
═════════════════════════════════════════════════════════
EVENT TIMELINE (Primary section, reverse chronological)
═════════════════════════════════════════════════════════

● [🔴 HIGH] FTC Second Request                  2 hrs ago
  FTC issued Second Request under HSR Act.
  Review extended 30d.
  [View FTC Press Release >]  [Mark Read]

● [🟠 MEDIUM] 8-K Amendment                     15 hrs ago
  Outside date extended from Feb 28 to Apr 30 (60d).
  [View S-4 >]

○ [🟡 LOW] Market Update                        1 day ago
  Spread widened 150 bp following FTC Second Request.
  Implied consideration: $95.00/share (vs. 96.20 announced)

[Show More Events ▼]
```

### Collapsible Sections

```
═════════════════════════════════════════════════════════
KEY DEAL TERMS [Expand ▼]
═════════════════════════════════════════════════════════
(Collapsed by default)

═════════════════════════════════════════════════════════
PROBABILITIES & THRESHOLDS [Expand ▼]
═════════════════════════════════════════════════════════

p_close_base: 60% [Edit ✎]
p_break_regulatory: 30% [Edit ✎]
p_break_litigation: 10% [Edit ✎]
spread_entry_threshold: 1.5% [Edit ✎]

═════════════════════════════════════════════════════════
SPREAD HISTORY [Expand ▼]
═════════════════════════════════════════════════════════
(Collapsed by default)
```

## Settings Page Specifications

### Tab Structure

```
[Alert Rules] [Integrations] [RSS Feeds] [Team] [API Keys]
```

### Alert Rules Tab Layout

```
DEFAULTS (Apply to all new deals):
┌──────────────────────────────────────────────────┐
│ Materiality Threshold: HIGH (score > 70)  [Edit] │
│ Spread Movement Alert: > 2.5%             [Edit] │
│ Outside Date Warning: < 30 days           [Edit] │
│ External Channels: Slack + Email          [Edit] │
└──────────────────────────────────────────────────┘

PER-DEAL OVERRIDES:
┌──────────────────────────────────────────────────┐
│ MSFT/ATVI                                        │
│   Only alert on: AGENCY + COURT events   [Edit] │
│   Disable spreads: No notifications       [Edit] │
│                                          [Delete]│
│                                                   │
│ Sony/EMI                                         │
│   Alert on spread > 3%                  [Edit] │
│   Email digest: Daily 8am                [Edit] │
│                                          [Delete]│
│                                                   │
│ [+ Add Override]                                │
└──────────────────────────────────────────────────┘

EMAIL DIGEST CONFIG:
┌──────────────────────────────────────────────────┐
│ Daily Digest: 8:00 AM ET         [Edit]          │
│ Events Included: High + Medium    [Edit]          │
│ Weekly Digest: Friday 5:00 PM ET  [Edit]          │
│ Events Included: All              [Edit]          │
│ Suppress Weekends: Yes            [Edit]          │
└──────────────────────────────────────────────────┘
```

## Time Savings Metrics (Must Track)

### Per Event Type

| EVENT TYPE       | CURRENT | NEW    | SAVED (per event) | SAVED (5 events/day) |
|------------------|---------|--------|-------------------|----------------------|
| HIGH materiality | 3–5 min | 1–2 min| 2–3 minutes      | 10–15 min/day        |
| MEDIUM events    | 4–6 min | 2–3 min| 2–3 minutes      | 10–15 min/day        |
| LOW events       | 5–7 min | 3–4 min| 1–3 minutes      | 5–15 min/day         |

### Daily Analyst Impact

- Before: 20–30 minutes navigation + analysis
- After: 8–12 minutes navigation + analysis
- Saved: 8–20 minutes/day per analyst
- = 4–6 hours/week analyzing instead of navigating

### Annual Desk Impact (5 analysts, 200 trading days)

**Time Savings:**
- Per analyst: 30–60 hours/year
- Cost at $150/hr: $4,800–$9,600/analyst/year
- Desk of 5: $24,000–$48,000/year

**P&L Upside (Early Event Detection):**
- Avg 5–10 deal-threatening events/year per desk
- Early detection: 50–100 bp saved per event
- Value: $250,000–$1,000,000/year upside

**TOTAL ANNUAL VALUE: $274,000–$1,048,000 per desk**

## Navigation Heatmap Expectations

### Expected Pattern (NEW)

- 85% of morning opens go straight to Inbox
- 10% go to Deals (board refresh)
- 3% go to Settings
- 2% go to Watchlists

### Old Pattern (for comparison)

- 40% Dashboard (scattered)
- 30% Live Monitor (scattered)
- 25% Notifications (scattered)
- 85% Deals (concentrated)

## Alert Fatigue Metrics (Must Track)

### Industry Baseline

- 43% of users disable alerts due to overload
- Weekly notifications before fatigue: 3–6 per user
- Users disabling due to spam: 73%

### Target Metrics

- Alert opt-out rate: <15% (vs. current 50-60%)
- Weekly external alerts: 2–3 only (HIGH + urgent MEDIUM)
- Decision latency: <2 min for HIGH events (vs. current 3-5 min)
- Navigation time: 3–5% of deal time (vs. current 18-22%)

## User Journey Timeline (Exact Timing)

### CURRENT SYSTEM (3–5 min per alert)

```
3:15 PM ─ FTC publishes press release
3:16 PM ─ j16z detects and scores (HIGH materiality)
3:17 PM ─ Email + Slack alert sent to analyst

3:20 PM (5 sec)   │ Open j16z
3:20:05 (45 sec)  │ Decide: Dashboard? Live Monitor? Notifications? ← WASTED
3:21:00 (10 sec)  │ Navigate to Notifications
3:21:10 (30 sec)  │ Scan 12 events, find FTC event
3:21:40 (15 sec)  │ Click event, read summary
3:21:55 (20 sec)  │ Open FTC press release (separate window) ← Context switch
3:22:15 (20 sec)  │ Understand: "This is material"
3:22:35 (10 sec)  │ Click "Open Deal"
3:22:45 (30 sec)  │ Navigate to Deals page ← WASTED
3:23:15 (20 sec)  │ Find MSFT/ATVI in deal board
3:23:35 (15 sec)  │ Click into deal card
3:23:50 (20 sec)  │ Scroll to event timeline (context loss)
3:24:10 (20 sec)  │ See spread: 1.7% (was 3.2%) "TOO LATE. MISSED IT."

TOTAL: 4 minutes
IMPACT: Missed 150 bp tightening on $10M = $150,000 loss
```

### NEW SYSTEM (1–2 min per alert)

```
3:15 PM ─ FTC publishes press release
3:16 PM ─ j16z detects and scores (HIGH materiality)
3:17 PM ─ Email + Slack alert sent

3:18 PM (5 sec)   │ Open j16z
3:18:05 (5 sec)   │ See Inbox (only 4 nav items), Click Inbox ← INSTANT
3:18:10 (20 sec)  │ Scan 12 events, See 🔴 HIGH FTC at top ← COLOR CODING
3:18:30 (5 sec)   │ Click FTC event
3:18:35 (10 sec)  │ Side panel slides in, Read summary ← NO PAGE NAV
3:18:45 (5 sec)   │ Click [View Deal Card] button
3:18:50 (5 sec)   │ Deal card appears in main area ← INSTANT LOAD
3:18:55 (20 sec)  │ See timeline, spread chart: 1.7% (↓ 150 bp)
3:19:15 (10 sec)  │ Update p_close: 85% → 60%, Configure exit alert

TOTAL: 1 minute 15 seconds
IMPACT: Caught event within 4 minutes vs. 15+ minutes
```

## Keyboard Shortcuts (Must Implement)

### Global Navigation

- `g` then `i` → Go to Inbox
- `g` then `d` → Go to Deals
- `g` then `w` → Go to Watchlists
- `g` then `s` → Go to Settings
- `?` → Show keyboard shortcut help modal

### Inbox Navigation

- `↓` → Select next event
- `↑` → Select previous event
- `e` → Mark selected event as read
- `v` → View deal card for selected event
- `1` → Toggle HIGH filter
- `2` → Toggle MEDIUM filter
- `3` → Toggle LOW filter
- `ESC` → Close side panel

## Migration Mapping (What Moved Where)

### Dashboard Config → Settings > Alert Rules

- Alert materiality threshold
- Spread alert threshold
- Outside date warnings
- Email digest frequency

### Live Monitor Config → Settings > Integrations

- Channel selection (Slack/Email)
- Filter rules → Settings > Alert Rules
- Real-time updates → Inbox (auto-monitored)

### Scattered Settings → Consolidated

- RSS feed management → Settings > RSS Feeds
- Integrations → Settings > Integrations
- Team management → Settings > Team
- API access → Settings > API Keys
