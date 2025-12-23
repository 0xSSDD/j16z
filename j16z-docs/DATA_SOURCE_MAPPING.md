# Complete Data Source Mapping - Frontend to Backend

## Overview
This document maps every field displayed in the frontend to its exact data source per MVP Section 3 (Data Sources) and Section 4 (Domain Model).

---

## Deal Board Fields

| Frontend Field | Data Source | Backend Entity | API Endpoint | Notes |
|----------------|-------------|----------------|--------------|-------|
| **Deal Name** (Acquirer → Target) | Company.name | Deal.acquirer_company_id, Deal.target_company_id | GET /api/deals | Join Deal → Company (2x) |
| **Status** | Deal.status | Deal.status | GET /api/deals | Enum: ANNOUNCED, REGULATORY_REVIEW, LITIGATION, TERMINATED, CLOSED |
| **Spread** | Market Data API (IEX/Polygon) | MarketSnapshot.spread_percent | GET /api/deals | Computed from latest MarketSnapshot per deal |
| **p_close_base** | Analyst input | Deal.p_close_base | GET /api/deals | Editable by analyst, stored in Deal |
| **EV** (Expected Value) | Computed: spread * p_close_base | Computed field | GET /api/deals | Frontend calculation from spread + p_close_base |
| **Reg/Lit Status** | AgencyEvent + CourtCase count | Event (type=AGENCY/COURT) | GET /api/deals/:id/events | Count high-materiality AGENCY/COURT events |
| **Outside Date Countdown** | Deal.outside_date | Deal.outside_date | GET /api/deals | Computed countdown from outside_date - today |

**Data Flow:**
1. **Deal creation**: Analyst inputs acquirer/target tickers → resolves to Company (CIK lookup) → creates Deal
2. **Market data**: Scheduled job fetches prices from Market Data API → computes spread → stores MarketSnapshot
3. **Regulatory**: FTC/DOJ RSS feeds → AgencyEvent → Event (type=AGENCY)
4. **Litigation**: CourtListener API → CourtCase + DocketEntry → Event (type=COURT)

---

## Deal Card - Header Fields

| Frontend Field | Data Source | Backend Entity | API Endpoint | Notes |
|----------------|-------------|----------------|--------------|-------|
| **Acquirer Name** | Company.name | Deal.acquirer_company_id → Company | GET /api/deals/:id | |
| **Target Name** | Company.name | Deal.target_company_id → Company | GET /api/deals/:id | |
| **Status Badge** | Deal.status | Deal.status | GET /api/deals/:id | Color-coded by status |
| **Announcement Date** | Deal.announcement_date | Deal.announcement_date | GET /api/deals/:id | From initial 8-K filing |
| **Outside Date** | Deal.outside_date | Deal.outside_date | GET /api/deals/:id | From S-4/DEFM14A filing |
| **Outside Date Countdown** | Computed from outside_date | Deal.outside_date | GET /api/deals/:id | Days remaining calculation |

---

## Deal Card - Key Metrics Panel

| Frontend Field | Data Source | Backend Entity | API Endpoint | Notes |
|----------------|-------------|----------------|--------------|-------|
| **Spread** | Market Data API | MarketSnapshot.spread_percent (latest) | GET /api/deals/:id | Latest snapshot |
| **Spread 24h Change** | Market Data API | MarketSnapshot (compare latest vs 24h ago) | GET /api/deals/:id/market-snapshots | Computed from time-series |
| **p_close_base** | Analyst input | Deal.p_close_base | GET /api/deals/:id | Editable inline |
| **EV (Expected Value)** | Computed | spread * p_close_base / 100 | Frontend calculation | |
| **Deal Value** | Deal.headline_value_usd | Deal.headline_value_usd | GET /api/deals/:id | From 8-K filing |
| **Consideration Type** | Deal.consideration_type | Deal.consideration_type | GET /api/deals/:id | CASH/STOCK/MIX from S-4 |
| **spread_entry_threshold** | Analyst input | Deal.spread_entry_threshold | GET /api/deals/:id | Editable inline |

---

## Deal Card - Deal Terms & Clauses Section

| Frontend Field | Data Source | Backend Entity | API Endpoint | Notes |
|----------------|-------------|----------------|--------------|-------|
| **Termination Fee** | SEC Filing (S-4/DEFM14A) | DealClause (type=TERMINATION_FEE) | GET /api/deals/:id/clauses | Extracted from filing Section 7.2(b) |
| **Reverse Termination Fee** | SEC Filing (S-4/DEFM14A) | DealClause (type=REVERSE_TERMINATION_FEE) | GET /api/deals/:id/clauses | Extracted from filing Section 7.2(c) |
| **MAE Definition** | SEC Filing (S-4/DEFM14A) | DealClause (type=MAE) | GET /api/deals/:id/clauses | Material Adverse Effect clause |
| **Regulatory Efforts** | SEC Filing (S-4/DEFM14A) | DealClause (type=REGULATORY_EFFORTS) | GET /api/deals/:id/clauses | "Reasonable best efforts" language |
| **Litigation Condition** | SEC Filing (S-4/DEFM14A) | DealClause (type=LITIGATION_CONDITION) | GET /api/deals/:id/clauses | Close conditioned on litigation resolution |
| **Financing Condition** | SEC Filing (S-4/DEFM14A) | DealClause (type=FINANCING_CONDITION) | GET /api/deals/:id/clauses | Financing commitment terms |
| **Source Citation** | Filing.url + section_reference | DealClause.source_filing_id → Filing.url + DealClause.section_reference | GET /api/deals/:id/clauses | Link to SEC EDGAR filing |

**Extraction Process (MVP Section 5.2):**
1. SEC RSS feed detects new S-4/DEFM14A filing for Deal CIKs
2. Download HTML/TXT from SEC EDGAR
3. Parse sections (Item 4, merger agreement sections)
4. Extract clause text using keywords/patterns
5. Store DealClause with source_filing_id and section_reference
6. Create FILING Event

---

## Deal Card - Event Timeline Section

| Frontend Field | Data Source | Backend Entity | API Endpoint | Notes |
|----------------|-------------|----------------|--------------|-------|
| **Timestamp** | Event.event_date | Event.event_date | GET /api/deals/:id/events | Sorted desc (newest first) |
| **Event Type** | Event.event_type | Event.event_type | GET /api/deals/:id/events | FILING, COURT, AGENCY, SPREAD_MOVE, NEWS |
| **Materiality** | Event.materiality_score | Event.materiality_score | GET /api/deals/:id/events | 0-100 score → HIGH/MEDIUM/LOW |
| **Title** | Event.title | Event.title | GET /api/deals/:id/events | |
| **Summary** | Event.short_summary | Event.short_summary | GET /api/deals/:id/events | AI-generated summary |
| **Source Link** | Event.source_table + source_id | Filing.url / DocketEntry.url / AgencyEvent.url / NewsItem.url | GET /api/deals/:id/events | Polymorphic source |

**Event Type Sources:**
- **FILING**: SEC RSS → Filing → Event (type=FILING)
- **COURT**: CourtListener RSS → DocketEntry → Event (type=COURT)
- **AGENCY**: FTC/DOJ RSS → AgencyEvent → Event (type=AGENCY)
- **SPREAD_MOVE**: Market Data API → MarketSnapshot → Event (type=SPREAD_MOVE) when threshold exceeded
- **NEWS**: Curated RSS → NewsItem → Event (type=NEWS)

---

## Deal Card - Spread History Section

| Frontend Field | Data Source | Backend Entity | API Endpoint | Notes |
|----------------|-------------|----------------|--------------|-------|
| **Spread Time Series** | Market Data API | MarketSnapshot (time-series) | GET /api/deals/:id/market-snapshots?range=3M | Array of {timestamp, spread_percent} |
| **Event Markers** | Event (high materiality) | Event (materiality_score > 70) | GET /api/deals/:id/events | Overlay on chart |

**Data Flow (MVP Section 5.5):**
1. Scheduled job during market hours (every 15 min)
2. Fetch acquirer/target prices from Market Data API (IEX/Polygon)
3. Compute spread: `(target_price - implied_consideration) / implied_consideration * 100`
4. Store MarketSnapshot with timestamp
5. If spread change > threshold, create SPREAD_MOVE Event

---

## Deal Card - News & Research Section

| Frontend Field | Data Source | Backend Entity | API Endpoint | Notes |
|----------------|-------------|----------------|--------------|-------|
| **Timestamp** | NewsItem.published_at | NewsItem.published_at | GET /api/deals/:id/news | |
| **Source** | NewsItem.feed_id | NewsItem.feed_id → RSSFeed.name | GET /api/deals/:id/news | Law firm, newsletter, blog |
| **Title** | NewsItem.title | NewsItem.title | GET /api/deals/:id/news | |
| **Summary** | NewsItem.summary | NewsItem.summary | GET /api/deals/:id/news | |
| **Link** | NewsItem.url | NewsItem.url | GET /api/deals/:id/news | |
| **Analyst Note** | User-generated | AnalystNote (new entity needed) | POST /api/deals/:id/news/:newsId/notes | Stored separately |

**Data Flow (MVP Section 5.6):**
1. User attaches RSS feed to Deal (law firm alerts, newsletters)
2. Scheduled polling fetches new items
3. Entity matching: search for acquirer/target names in title/summary
4. Create NewsItem with deal_id if matched
5. Create NEWS Event (low materiality)

---

## Deal Card - Regulatory & Litigation Section

| Frontend Field | Data Source | Backend Entity | API Endpoint | Notes |
|----------------|-------------|----------------|--------------|-------|
| **FTC Status** | FTC RSS → AgencyEvent | Event (type=AGENCY, agency=FTC) | GET /api/deals/:id/events?type=AGENCY&agency=FTC | Latest FTC action |
| **DOJ Status** | DOJ RSS → AgencyEvent | Event (type=AGENCY, agency=DOJ) | GET /api/deals/:id/events?type=AGENCY&agency=DOJ | Latest DOJ action |
| **EU Commission Status** | Manual input (MVP) | AgencyEvent (agency=EU) | GET /api/deals/:id/events?type=AGENCY&agency=EU | Future: EU RSS feeds |
| **UK CMA Status** | Manual input (MVP) | AgencyEvent (agency=CMA) | GET /api/deals/:id/events?type=AGENCY&agency=CMA | Future: CMA RSS feeds |
| **Latest Action** | AgencyEvent.title | AgencyEvent.title (latest) | GET /api/deals/:id/events?type=AGENCY | Most recent event |
| **Date** | AgencyEvent.date | AgencyEvent.date | GET /api/deals/:id/events?type=AGENCY | |
| **Key Concerns** | AgencyEvent.summary_text | AgencyEvent.summary_text | GET /api/deals/:id/events?type=AGENCY | AI-extracted concerns |
| **Risk Level** | Event.materiality_score | Event.materiality_score | GET /api/deals/:id/events?type=AGENCY | HIGH if complaint/injunction |
| **Litigation Case Count** | CourtCase count | CourtCase (deal_id) | GET /api/deals/:id/court-cases | Count of attached cases |
| **Case Types** | CourtCase.caption parsing | CourtCase.caption | GET /api/deals/:id/court-cases | Classify: shareholder, antitrust, appraisal |
| **Most Recent Development** | DocketEntry (latest) | DocketEntry (latest by date_filed) | GET /api/deals/:id/court-cases/:caseId/entries | Latest docket entry |

**Data Flow:**
- **FTC/DOJ (MVP Section 5.4)**: RSS feeds → string match company names → AgencyEvent → Event
- **CourtListener (MVP Section 5.3)**: Initial search on deal creation → analyst confirms dockets → subscribe to RSS → DocketEntry → Event

---

## Research Draft - Auto-Generated Sections

| Frontend Section | Data Source | Backend Entities | API Endpoint | Notes |
|------------------|-------------|------------------|--------------|-------|
| **Deal Overview** | Deal + Company | Deal, Company (acquirer/target) | GET /api/deals/:id | Name, value, consideration, dates |
| **Key Terms Table** | DealClause | DealClause (all types) | GET /api/deals/:id/clauses | Termination fees, MAE, conditions |
| **Regulatory Status** | AgencyEvent | Event (type=AGENCY) | GET /api/deals/:id/events?type=AGENCY | FTC, DOJ actions with risk assessment |
| **Litigation** | CourtCase + DocketEntry | CourtCase, DocketEntry | GET /api/deals/:id/court-cases | Case count, types, last filing |
| **Spread Snapshot** | MarketSnapshot | MarketSnapshot (latest) | GET /api/deals/:id/market-snapshots | Current spread, 24h change |
| **Scenario Analysis** | Deal.p_close_base + spread | Deal, MarketSnapshot | GET /api/deals/:id | Base/Bear/Bull cases with return calculations |

---

## Settings Page Data

| Frontend Section | Data Source | Backend Entity | API Endpoint | Notes |
|------------------|-------------|----------------|--------------|-------|
| **Profile - Name** | User.name | User.name | GET /api/settings/profile | Editable |
| **Profile - Email** | User.email | User.email | GET /api/settings/profile | Read-only |
| **Profile - API Key** | User.api_key (new field) | User.api_key | POST /api/settings/profile/generate-api-key | For MVP Section 8 API access |
| **Watchlists** | Watchlist | Watchlist (user_id) | GET /api/settings/watchlists | Many-to-many with Deals |
| **Alert Config** | AlertRule | AlertRule (user_id) | GET /api/settings/alerts | Per MVP Section 4 |
| **Preferences** | User.preferences (jsonb) | User.preferences | GET /api/settings/preferences | Theme, filters, formats |

---

## Missing Data Sources / Gaps Identified

### ❌ **Gap 1: EU Commission & UK CMA Data**
- **MVP Status**: Manual input only for MVP
- **Frontend Shows**: EU Commission status, UK CMA status
- **Backend Reality**: No automated RSS feeds in MVP Section 3
- **Resolution**: Display "Manual tracking" or allow manual AgencyEvent creation
- **Future**: Add EU/UK RSS feeds in Phase 2

### ❌ **Gap 2: Analyst Notes on News Items**
- **Frontend Shows**: "Add Note" button on news items
- **Backend Reality**: No AnalystNote entity in MVP Section 4
- **Resolution**: Add new entity:
  ```
  AnalystNote {
    id, user_id, news_item_id, note_text, created_at
  }
  ```
- **API Endpoint**: `POST /api/deals/:id/news/:newsId/notes`

### ❌ **Gap 3: Watchlist-Deal Association**
- **MVP Says**: "Many-to-many mapping to Deals" (Section 4)
- **Backend Reality**: Need junction table `watchlist_deals`
- **Resolution**: Add `watchlist_deals (watchlist_id, deal_id)` table

### ❌ **Gap 4: User Avatar Upload**
- **Frontend Shows**: Avatar upload in settings
- **Backend Reality**: No file storage specified in MVP
- **Resolution**: Add `User.avatar_url` field, use S3/blob storage

### ✅ **Confirmed: All Other Fields Have Sources**
- Deal terms → SEC filings (S-4, DEFM14A, 8-K)
- Events → SEC RSS, CourtListener RSS, FTC/DOJ RSS
- Spreads → Market Data API (IEX/Polygon)
- News → Curated RSS feeds

---

## Data Source Summary

| Data Source | MVP Section | Entities Created | Frequency | Cost |
|-------------|-------------|------------------|-----------|------|
| **SEC EDGAR** | 3.1 | Filing, DealClause, Event (FILING) | RSS real-time | Free |
| **CourtListener** | 3.2 | CourtCase, DocketEntry, Event (COURT) | RSS real-time | Free |
| **FTC RSS** | 3.3 | AgencyEvent, Event (AGENCY) | RSS real-time | Free |
| **DOJ RSS** | 3.3 | AgencyEvent, Event (AGENCY) | RSS real-time | Free |
| **Market Data API** | 3.4 | MarketSnapshot, Event (SPREAD_MOVE) | Every 15 min (market hours) | Paid (IEX/Polygon) |
| **Curated RSS** | 3.5 | NewsItem, Event (NEWS) | Hourly polling | Free |
| **Manual Input** | N/A | Deal (initial), EU/UK AgencyEvent | On-demand | Free |

---

## Backend API Endpoints Required (Complete List)

```
# Deals
GET    /api/deals                          # List with filters (spread, p_close, sector, watchlist)
POST   /api/deals                          # Create new deal
GET    /api/deals/:id                      # Deal details with Company joins
PATCH  /api/deals/:id                      # Update p_close_base, spread_entry_threshold
GET    /api/deals/:id/clauses              # DealClause list with Filing source
GET    /api/deals/:id/events               # Event list (filterable by type, materiality)
GET    /api/deals/:id/market-snapshots     # MarketSnapshot time-series
GET    /api/deals/:id/news                 # NewsItem list
GET    /api/deals/:id/court-cases          # CourtCase list
GET    /api/deals/:id/court-cases/:caseId/entries  # DocketEntry list

# Exports (MVP Section 8)
GET    /api/deals/export?format=csv        # CSV export of deals table
GET    /api/deals/:id/export?format=csv|json  # Single deal export

# Settings
GET    /api/settings/profile               # User profile
PATCH  /api/settings/profile               # Update name, avatar
POST   /api/settings/profile/generate-api-key  # Generate new API key
GET    /api/settings/watchlists            # Watchlist list
POST   /api/settings/watchlists            # Create watchlist
PATCH  /api/settings/watchlists/:id        # Update watchlist
DELETE /api/settings/watchlists/:id        # Delete watchlist
POST   /api/settings/watchlists/:id/deals  # Add deal to watchlist
DELETE /api/settings/watchlists/:id/deals/:dealId  # Remove deal from watchlist
GET    /api/settings/alerts                # AlertRule list
POST   /api/settings/alerts                # Create/update alert rule
GET    /api/settings/preferences           # User preferences
PATCH  /api/settings/preferences           # Update preferences

# News Notes (new)
POST   /api/deals/:id/news/:newsId/notes   # Add analyst note to news item
GET    /api/deals/:id/news/:newsId/notes   # Get notes for news item
```

---

## Validation: All Frontend Fields Sourced ✅

Every field in the frontend specs now has:
1. ✅ **Data source** identified (SEC, CourtListener, FTC/DOJ, Market API, RSS)
2. ✅ **Backend entity** specified (Deal, Event, DealClause, MarketSnapshot, etc.)
3. ✅ **API endpoint** defined
4. ✅ **Extraction/computation process** documented (MVP Section 5 pipelines)

**Gaps identified and resolved:**
- EU/UK data: Manual input for MVP
- Analyst notes: New AnalystNote entity added
- Watchlist junction table: Specified
- Avatar upload: User.avatar_url + blob storage
