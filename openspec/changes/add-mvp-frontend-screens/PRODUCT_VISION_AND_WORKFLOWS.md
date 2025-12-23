# Product Vision & Complete Analyst Workflows

## Product Goal (MVP Section 0)

**j16z turns raw regulatory, legal, and market data into analyst-ready and client-ready outputs for merger-arb firms.**

The system **automatically tracks** M&A deals end-to-end by:
1. Scraping SEC filings, court dockets, agency press releases, market data
2. Extracting structured terms and generating event summaries
3. Computing spreads and detecting material changes
4. Alerting analysts to what matters
5. Pre-filling research memos for client distribution

**Key Insight**: Analysts provide tickers → System does ALL the work → Analysts get actionable intelligence.

---

## Complete Analyst Workflows (User Story Driven)

### Workflow 1: Deal Onboarding (User Story #1: Define Coverage)

**Analyst Action**: "I want to track the Microsoft / Activision deal"

**Frontend Flow**:
```
1. Analyst presses C (or CMD+K → "Create Deal")
2. Modal appears: "Add New Deal"
   - Input: Acquirer Ticker (MSFT)
   - Input: Target Ticker (ATVI)
   - Optional: Deal Name, Expected Close Date, Initial p_close_base
3. Analyst clicks "Create & Discover"
4. Loading state: "Discovering deal data..."
5. System shows discovery results:
   - ✅ Found 3 SEC filings (8-K announcement, S-4, DEFM14A)
   - ✅ Found 2 court cases (FTC v. Microsoft, Shareholder derivative)
   - ✅ Found 5 FTC/DOJ press releases
   - ⚠️ No market data yet (will start tracking)
6. Analyst reviews and confirms selections
7. Deal appears in Deal Board with status "ANNOUNCED"
```

**Backend Responsibilities**:
- ✅ Resolve tickers → Company entities (CIK lookup via SEC API)
- ✅ Create Deal record with acquirer_company_id, target_company_id
- ✅ **Discovery Pipeline** (MVP Section 5.1):
  - Search SEC EDGAR for recent filings mentioning "merger" for these CIKs
  - Search CourtListener for dockets with party names near announcement date
  - Search FTC/DOJ RSS archives for company names
  - Present candidates to analyst for confirmation
- ✅ Subscribe to RSS feeds for ongoing monitoring:
  - SEC RSS for these CIKs
  - CourtListener RSS for confirmed dockets
  - FTC/DOJ RSS (company name matching)
- ✅ Start market data polling (every 15 min during market hours)

**Missing User Story → ADD**:
> **9. Deal Discovery & Setup**
> As an analyst, when I provide acquirer and target tickers, I want the system to automatically discover all relevant filings, court cases, and regulatory actions so I don't have to manually search multiple sources.

---

### Workflow 2: Daily Monitoring (User Story #2: Understand Events + #7: Alerts)

**Analyst Action**: "Check what happened overnight"

**Frontend Flow**:
```
1. Analyst opens j16z → Dashboard shows notification badge "5 new events"
2. Analyst navigates to Deal Board
3. Deals with new events show indicator (🔴 dot)
4. Analyst clicks MSFT/ATVI deal
5. Deal Card opens with Events section auto-expanded
6. New events at top (reverse chronological):
   - [🔴 HIGH] AGENCY • FTC Second Request (2 hours ago)
   - [🟡 MEDIUM] FILING • 8-K Amendment (yesterday)
7. Analyst clicks FTC event → reads summary → clicks "View FTC Press Release"
8. Analyst updates p_close_base from 85% to 65% (inline edit)
9. Analyst presses CMD+K → "Generate Draft" → starts writing client note
```

**Backend Responsibilities**:
- ✅ **SEC Pipeline** (MVP Section 5.2):
  - RSS detects new 8-K amendment for MSFT
  - Download filing, parse sections
  - Extract any term changes (outside date extension, fee modifications)
  - Create FILING Event with materiality score
  - Send alert if materiality > threshold
- ✅ **FTC Pipeline** (MVP Section 5.4):
  - RSS detects FTC press release mentioning "Microsoft" and "Activision"
  - Create AgencyEvent (agency=FTC, type=SECOND_REQUEST)
  - Generate short_summary: "FTC issued Second Request under HSR Act. Extends review period by 30 days."
  - Create AGENCY Event with HIGH materiality
  - Send alert via email/Slack per AlertRule
- ✅ **Alert Evaluation**:
  - Check AlertRule for user (event_types includes AGENCY, materiality_min=70)
  - Send email with subject "🔴 HIGH: FTC Second Request - MSFT/ATVI"
  - Send Slack message to configured webhook
  - Store notification in user's inbox

**Missing User Story → ADD**:
> **10. Event Notifications & Inbox**
> As an analyst, I want to see all new events in a unified inbox with unread indicators so I can quickly triage what needs immediate attention versus what can wait.

---

### Workflow 3: Deep Analysis (User Story #3: Single Dashboard + #5: Probabilities)

**Analyst Action**: "Analyze the FTC Second Request impact"

**Frontend Flow**:
```
1. Analyst on Deal Card, Events section expanded
2. Clicks FTC Second Request event → expands inline details
3. Reviews summary, clicks source link → FTC press release opens
4. Scrolls to Regulatory/Litigation section [▼]
5. Sees FTC status updated:
   - Latest Action: Second Request
   - Date: 2 hours ago
   - Risk Level: [🔴 HIGH RISK]
   - Key Concerns: "Market concentration in gaming, vertical foreclosure"
6. Scrolls to Spread Chart [▼]
7. Sees spread widened from 3.2% to 4.8% (marked on chart)
8. Updates p_close_base: 85% → 65% (inline edit)
9. Sees EV recalculate: 2.72% → 3.12%
10. Updates spread_entry_threshold: 2.5% → 3.5%
11. Presses CMD+K → "Configure Alerts"
12. Sets: "Alert me if spread > 5% or any new COURT events"
```

**Backend Responsibilities**:
- ✅ **Market Data Pipeline** (MVP Section 5.5):
  - Scheduled job fetches MSFT and ATVI prices
  - Computes spread: (ATVI_price - implied_consideration) / implied_consideration
  - Detects spread change from 3.2% to 4.8% (exceeds 1% threshold)
  - Creates SPREAD_MOVE Event
  - Stores MarketSnapshot with timestamp
- ✅ **Materiality Scoring**:
  - FTC Second Request → HIGH materiality (score 90)
  - Updates Event.materiality_score
  - Triggers risk level calculation for Regulatory section
- ✅ **Alert Rule Storage**:
  - Updates AlertRule for user/deal with new criteria
  - Stores: `{"event_types":["COURT","SPREAD_MOVE"],"spread_threshold":5.0}`

**Missing User Story → ADD**:
> **11. Spread Threshold Monitoring**
> As an analyst, I want to set spread thresholds per deal so I'm alerted when spreads widen or tighten beyond my entry/exit points.

---

### Workflow 4: Research Production (User Story #6: Research Production)

**Analyst Action**: "Write client note on FTC Second Request"

**Frontend Flow**:
```
1. Analyst presses CMD+K → "Generate Draft" (or CMD+D)
2. System navigates to Research Draft page
3. Auto-generated sections appear:
   - Deal Overview (MSFT/ATVI, $68.7B, Cash, Announced 2022-01-18)
   - Key Terms Table (Termination Fee $3.0B, MAE Standard, etc.)
   - Regulatory Status:
     * FTC: Second Request issued [date]. Key concerns: market concentration.
     * DOJ: No action to date.
   - Litigation: 3 active cases (2 shareholder derivative, 1 FTC injunction)
   - Spread Analysis: Current 4.8%, 24h change +1.6%, 30d avg 3.5%
   - Scenario Analysis:
     * Base Case (65% prob): Close in Q2 2024, 4.8% spread, 7.2% annualized return
     * Bear Case (35% prob): FTC blocks, ATVI drops to $75, -8% loss
4. Analyst edits sections:
   - Adds commentary on FTC concerns
   - Updates timeline expectations
   - Adds recommendation: "Reduce position size, wait for court ruling"
5. Auto-saves every 5 seconds
6. Analyst presses CMD+K → "Export as DOCX"
7. Downloads: j16z-MSFT-ATVI-analysis-2024-12-23.docx
8. Sends to clients
```

**Backend Responsibilities**:
- ✅ **Draft Generation** (MVP Section 5.2 + 6):
  - Aggregate data from Deal, DealClause, Event, MarketSnapshot
  - Generate structured memo sections:
    - Deal Overview: Pull from Deal entity
    - Key Terms: Query DealClause, format as table
    - Regulatory: Query Event (type=AGENCY), group by agency, summarize latest
    - Litigation: Query CourtCase + DocketEntry, count cases, summarize last filing
    - Spread: Query MarketSnapshot time-series, compute 24h/30d changes
    - Scenario: Use Deal.p_close_base for probability-weighted returns
  - Return as Markdown structure
- ✅ **Export Generation**:
  - DOCX: Convert Markdown to DOCX with proper formatting (tables, headings)
  - Markdown: Return raw Markdown
  - Include all sections with proper citations

**Missing User Story → ADD**:
> **12. Draft Templates & Customization**
> As an analyst, I want to customize memo templates (sections, order, formatting) so drafts match my firm's house style and client preferences.

---

### Workflow 5: Bulk Operations (User Story #4: Structured Data + #8: Qualitative RSS)

**Analyst Action**: "Export all tech deals for weekly report"

**Frontend Flow**:
```
1. Analyst on Deal Board
2. Applies filters: Sector = Technology, Status = REGULATORY_REVIEW
3. 12 deals match
4. Presses CMD+K → "Export Filtered Deals as CSV"
5. Downloads: j16z-deals-tech-regulatory-2024-12-23.csv
6. Opens in Excel, feeds into internal model
7. Analyst adds RSS feed for "Wachtell M&A Alerts"
8. Attaches feed to "Tech M&A" watchlist
9. New law firm alerts appear in News section for all tech deals
```

**Backend Responsibilities**:
- ✅ **CSV Export** (MVP Section 8):
  - Query deals with filters (sector, status)
  - Join with Company, MarketSnapshot (latest), Event (counts by type)
  - Format CSV with columns:
    - Deal Name, Acquirer, Target, Status, Spread, p_close_base, EV
    - Deal Value, Consideration, Announcement Date, Outside Date
    - Reg Events (count), Lit Events (count), Last Event Date
  - Stream CSV download
- ✅ **RSS Feed Management** (MVP Section 5.6):
  - Store RSSFeed entity: url, name, watchlist_id
  - Scheduled polling (hourly):
    - Fetch new items from feed
    - Parse title, summary, published_at
    - Entity matching: search for company names/tickers in content
    - Create NewsItem with deal_id if matched
    - Create NEWS Event (low materiality)
  - Display in News section for matched deals

**Missing User Story → ADD**:
> **13. Watchlist-Based RSS Feeds**
> As an analyst, I want to attach RSS feeds to watchlists (not just individual deals) so all deals in my "Tech M&A" watchlist automatically get law firm alerts and specialist newsletters.

---

## Missing Screens Identified

### Screen 1: Deal Discovery Results (NEW)
**Purpose**: Show analyst what the system found during deal creation

**Components**:
- SEC Filings list (checkboxes to confirm)
- Court Cases list (checkboxes to confirm)
- Agency Events list (checkboxes to confirm)
- "Confirm & Start Tracking" button

**Backend Needs**:
- Discovery search APIs (SEC, CourtListener, FTC/DOJ archives)
- Candidate scoring (relevance ranking)

### Screen 2: Notifications Inbox (NEW)
**Purpose**: Unified view of all new events across all deals

**Components**:
- Event list (grouped by deal, sorted by time)
- Unread indicators
- Filter by materiality, event type
- Mark as read/unread
- Quick actions: View Deal, Dismiss

**Backend Needs**:
- UserNotification entity (user_id, event_id, read_at)
- Notification delivery tracking

### Screen 3: Watchlist Detail View (ENHANCE)
**Purpose**: Manage deals in a watchlist, attach RSS feeds

**Components**:
- Deal list (with remove button)
- Add deals dropdown
- Attached RSS feeds section
- RSS feed management (add, remove, test)

**Backend Needs**:
- RSSFeed entity with watchlist_id
- Feed polling and entity matching

---

## Updated User Stories (Complete Set)

### Original 8 + New 5 = 13 Total

1. ✅ **Define coverage** (original)
2. ✅ **Understand each event quickly** (original)
3. ✅ **Single deal dashboard** (original)
4. ✅ **Structured data for models and clients** (original)
5. ✅ **Probabilities and thresholds** (original)
6. ✅ **Research production** (original)
7. ✅ **Alerts, digests, and integrations** (original)
8. ✅ **Qualitative RSS / news** (original)
9. 🆕 **Deal Discovery & Setup** - Auto-discover filings, cases, events from tickers
10. 🆕 **Event Notifications & Inbox** - Unified inbox with unread indicators
11. 🆕 **Spread Threshold Monitoring** - Alert on spread movements beyond thresholds
12. 🆕 **Draft Templates & Customization** - Customize memo templates per firm style
13. 🆕 **Watchlist-Based RSS Feeds** - Attach RSS feeds to watchlists, not just deals

---

## Backend Responsibilities Summary

### What Backend MUST Do (Automatic, No Analyst Input)

1. **Continuous Monitoring** (24/7):
   - Poll SEC RSS feeds for new filings (CIKs of tracked deals)
   - Poll CourtListener RSS for new docket entries (tracked cases)
   - Poll FTC/DOJ RSS for press releases (company name matching)
   - Poll Market Data API every 15 min (during market hours)
   - Poll user-configured RSS feeds hourly

2. **Data Extraction** (On New Filing):
   - Download SEC filing HTML/TXT
   - Parse sections (Item 4, merger agreement)
   - Extract deal terms: consideration, dates, fees, clauses
   - Store DealClause with source citations
   - Detect changes vs previous versions

3. **Event Generation** (On Any Change):
   - Create Event entity (type, materiality, summary)
   - Link to source (Filing, DocketEntry, AgencyEvent, MarketSnapshot, NewsItem)
   - Compute materiality score (0-100)
   - Generate short_summary (AI-powered)

4. **Alert Delivery** (On High-Materiality Event):
   - Evaluate AlertRule for each user
   - Send email via SMTP
   - Send Slack message via webhook
   - Send webhook POST to user-configured URL
   - Store UserNotification for inbox

5. **Spread Computation** (Every 15 Min):
   - Fetch acquirer/target prices
   - Compute implied consideration (cash + stock * acquirer_price)
   - Compute spread percentage
   - Store MarketSnapshot
   - Create SPREAD_MOVE Event if threshold exceeded

6. **Discovery** (On Deal Creation):
   - Search SEC EDGAR for filings (last 12 months)
   - Search CourtListener for dockets (party name + date range)
   - Search FTC/DOJ archives for press releases
   - Return candidates with relevance scores
   - Auto-link confirmed items to Deal

### What Frontend MUST Show (Analyst-Facing)

1. **Deal Board**: All deals, spreads, statuses, outside dates, filters
2. **Deal Card**: Single-page dashboard with all deal data
3. **Research Draft**: Auto-generated memo with editable sections
4. **Settings**: Watchlists, alerts, RSS feeds, preferences
5. **Discovery Results**: Confirm filings/cases during deal creation
6. **Notifications Inbox**: Unified event feed with unread indicators
7. **Watchlist Detail**: Manage deals and RSS feeds per watchlist

---

## Next Steps: Update Specs

1. ✅ Add 5 new user stories to proposal.md
2. ✅ Add Deal Discovery Results screen spec
3. ✅ Add Notifications Inbox screen spec
4. ✅ Enhance Watchlist management spec (RSS feeds)
5. ✅ Update design.md with complete workflows
6. ✅ Document BE responsibilities clearly (what runs automatically)
7. ✅ Validate all specs cover the 13 user stories
