## j16z – MVP Product & Engineering Spec
*(HSR / M&A / CourtListener / RSS / Email / Webhooks)*

***

## 0. Goal and End Output

**Goal:**
Build a production‑grade MVP that tracks public M&A deals end‑to‑end and turns raw regulatory, legal, and market data into **analyst‑ready and client‑ready outputs** for merger‑arb / event‑driven and policy‑focused firms.

**End outputs j16z must produce:**

- A **deal board** showing all tracked deals with spreads, probabilities, regulatory/litigation status, and key dates.
- A **deal card** per deal with terms, clauses, event timeline, spreads, and qualitative notes.
- **Alerts** (email, Slack, webhook) on material events.
- **Daily/weekly email digests** summarising what changed and which deals are now interesting.
- **Research drafts** (memo skeletons) that analysts can edit into institutional notes.
- **Structured data feeds** (CSV/API) of deals, events, and terms that firms can resell or pipe into internal systems.

***

## 1. Core Analyst User Stories

1. **Define coverage**
   As an analyst, I want to define a list of deals and covered tickers so the system automatically tracks all relevant filings, agency actions, litigation, and market spreads for my universe.

2. **Understand each event quickly**
   As an analyst, when a filing or event happens (HSR/SEC/FTC/DOJ/CourtListener), I want a concise summary with links to primary documents so I can quickly decide if it is material for my trade and client note.

3. **Single deal dashboard**
   As an analyst, I want a single dashboard per deal showing the event timeline, current spread, key clauses (termination, MAE, regulatory, litigation conditions), and upcoming dates so I can brief PMs and institutional clients from one place.

4. **Structured data for models and clients**
   As an analyst, I want to export structured data (deal terms, dates, spreads, clauses, events) to Excel/CSV/API so I can feed my own models and those of institutional clients.

5. **Probabilities and thresholds**
   As an analyst, I want to set and adjust per‑deal probabilities (chance of closing) and thresholds (minimum spread for entry, risk flags) so I can turn raw events into position and recommendation decisions.

6. **Research production**
   As an analyst, I want j16z to pre‑fill a memo/report skeleton (terms, clauses, event highlights, charts) so I can quickly turn it into sellable research for institutional investors.

7. **Alerts, digests, and integrations**
   As an analyst or PM, I want configurable alerts via email, Slack, and webhooks, plus daily/weekly email digests, so I can stay on top of material events without constantly checking dashboards.

8. **Qualitative RSS / news**
   As an analyst, I want to connect relevant RSS/news feeds (law‑firm alerts, blogs, specialist newsletters) so j16z can surface high‑signal qualitative "tidbits" next to each deal.

9. **Deal discovery & setup**
   As an analyst, when I provide acquirer and target tickers, I want the system to automatically discover all relevant filings, court cases, and regulatory actions so I don't have to manually search multiple sources.

10. **Event notifications & inbox**
    As an analyst, I want to see all new events in a unified inbox with unread indicators so I can quickly triage what needs immediate attention versus what can wait.

11. **Spread threshold monitoring**
    As an analyst, I want to set spread thresholds per deal so I'm alerted when spreads widen or tighten beyond my entry/exit points.

12. **Draft templates & customization**
    As an analyst, I want to customize memo templates (sections, order, formatting) so drafts match my firm's house style and client preferences.

13. **Watchlist‑based RSS feeds**
    As an analyst, I want to attach RSS feeds to watchlists (not just individual deals) so all deals in my "Tech M&A" watchlist automatically get law firm alerts and specialist newsletters.

All MVP functionality should satisfy one or more of these stories.

***

## 2. System Architecture Overview

**Components:**

1. **Data Ingestion Layer**
   - Sources: SEC EDGAR, CourtListener, FTC, DOJ Antitrust, market‑data API, user‑configured RSS/news feeds.
   - Mechanisms: Official RSS feeds where available plus HTTP/API polling.

2. **Normalization & Storage**
   - Map raw inputs into normalized entities: Company, Deal, Filing, CourtCase, DocketEntry, AgencyEvent, MarketSnapshot, NewsItem, Event, User, Watchlist, AlertRule.

3. **Processing Pipeline**
   - Extract structured deal terms and clauses.
   - Detect changes over time.
   - Classify events and compute materiality scores.
   - Generate short summaries and research draft pieces.

4. **Alerts & Notifications**
   - Evaluate AlertRules on new events.
   - Send alerts via email, Slack, and webhooks.

5. **API & Web UI**
   - REST/GraphQL API for internal tools and client integrations.
   - Web application (React/Vue) offering: deal board, deal cards, event timelines, export tools.

Backend: Python/FastAPI (or Node/TypeScript).
Database: PostgreSQL.

***

## 3. Data Sources and APIs

### 3.1 SEC EDGAR (free, mandatory)

**Purpose:** Track deal‑related filings.

**Sources:**

- SEC structured disclosure RSS feeds (form‑type specific).[1][2]
- SEC company/submissions JSON APIs and filing archives.

**Data:**

- Filings relevant to M&A:
  - 8‑K (deal announcement and amendments, key events).
  - S‑4 (merger prospectus).
  - DEFM14A/DEFA14A (merger proxies).
  - 10‑K/10‑Q (risk factors, business updates post‑announcement).
  - 13D/13G (activist / shareholder filings that may affect deals).

**Implementation Requirements:**

- Maintain a polite User‑Agent and rate‑limiting policy.
- For each Deal, store acquirer/target CIKs.
- Subscribe to relevant SEC RSS feeds and/or poll APIs for those CIKs; filter by form types above.
- For each new filing:
  - Download HTML/TXT document.
  - Store Filing record with: company_id, deal_id (if linked), CIK, accession, type, date, URL, raw_text.

***

### 3.2 CourtListener (free, mandatory)

**Purpose:** Track litigation related to deals (merger challenges, shareholder suits, antitrust cases, appraisal actions).

**Sources:**

- CourtListener REST API (dockets, docket entries, opinions).[3][4]
- CourtListener per‑docket RSS feeds for alerts.[5]

**Implementation Requirements:**

- **Deal creation step:**
  - Use CourtListener search API to find dockets with party names matching acquirer and target around the announcement date.
  - Present candidates in UI for analyst confirmation; attach selected dockets to the Deal as CourtCase records.

- **Docket monitoring:**
  - For each attached CourtCase, subscribe to its RSS feed for fast detection.
  - When RSS reports a new entry, call the API to pull full DocketEntry (date, description, URL, full_text if available).
  - Store DocketEntry records.

- **Event creation:**
  - Classify entries via keywords (“complaint”, “motion for preliminary injunction”, “order granting/denying”, “stipulation of dismissal”).
  - For material types, create Event records (type=COURT) with summaries and links.

***

### 3.3 FTC / DOJ Antitrust (free, essential)

**Purpose:** Track antitrust enforcement and HSR‑related actions.

**Sources:**

- FTC RSS feeds for competition and case press releases.[6]
- DOJ Antitrust Division press release RSS feed.[7]

**Implementation Requirements:**

- Subscribe to relevant RSS feeds.
- For each item:
  - Parse title/summary and search for acquirer/target names and deal IDs.
  - If matched, create AgencyEvent with: agency, type (PRESS_RELEASE, COMPLAINT, CONSENT_DECREE, POLICY_STATEMENT), date, title, URL, summary_text.
  - Create Event (type=AGENCY) with short_summary and materiality based on type (e.g., complaints high, generic policy lower).

***

### 3.4 Market Data API (paid / freemium)

**Purpose:** Compute spreads and spread movements.

**Source Examples:**

- IEX Cloud, Polygon, Twelve Data, etc.[8]

**Implementation Requirements:**

- Store ticker→symbol mapping for each Company.
- During market hours, periodically request last price for acquirer and target.
- Use Deal terms to compute:
  - `implied_consideration_per_share` (cash, stock, or combination).
  - `spread_absolute` and `spread_percent`.
- Store MarketSnapshot records and create SPREAD_MOVE Events when spread changes beyond user thresholds.

***

### 3.5 Curated RSS / News Feeds (optional but in MVP)

**Purpose:** Track qualitative information (newsletters, blogs, law‑firm alerts) for each deal.

**Sources:**

- User‑supplied RSS URLs:
  - Law‑firm antitrust alerts.[9][10]
  - Specialist investor newsletters.[11][12]
  - Other relevant blogs or news feeds.

**Implementation Requirements:**

- Allow users to attach RSS feeds:
  - To a Deal, or
  - To a Theme/Watchlist (e.g., “US tech antitrust”).
- Regularly poll each feed; for each new item:
  - Create NewsItem with feed_id, title, URL, published_at, summary.
  - Attempt to match to deals based on company names/tickers mentioned; set deal_id when matched.
  - Create NEWS Events with low/medium materiality; analysts can manually promote them.

***

## 4. Domain Model (DB‑Level)

### Company

- `id`
- `name`
- `ticker`
- `cik`
- `lei` (optional)
- `country`
- `sector`

### Deal

- `id`
- `acquirer_company_id` (FK → Company)
- `target_company_id` (FK → Company)
- `headline_value_usd`
- `consideration_type` (CASH, STOCK, MIX)
- `cash_per_share` (nullable)
- `stock_ratio` (nullable)
- `collar_low` / `collar_high` (nullable)
- `announcement_date`
- `expected_close_date` (nullable)
- `outside_date` (nullable)
- `status` (ANNOUNCED, REGULATORY_REVIEW, LITIGATION, TERMINATED, CLOSED, UNKNOWN)
- `notes` (text)

**Analyst fields (probabilities/thresholds):**

- `p_close_base` (float 0–1; default null)
- `p_break_regulatory` (float 0–1; optional)
- `p_break_litigation` (float 0–1; optional)
- `p_break_other` (float 0–1; optional)
- `spread_entry_threshold` (float; e.g. 0.02 for 2% min spread)
- `size_bucket` (SMALL, MEDIUM, LARGE)

### DealClause

Captured from filings:

- `id`
- `deal_id`
- `clause_type` (TERMINATION_FEE, REVERSE_TERMINATION_FEE, MAE, REGULATORY_EFFORTS, LITIGATION_CONDITION, FINANCING_CONDITION, OTHER)
- `text_excerpt`
- `source_filing_id`
- `section_reference` (string, e.g. “Section 7.2(b)”)

### Filing

- `id`
- `company_id`
- `deal_id` (nullable)
- `cik`
- `accession_number`
- `filing_type` (8‑K, S‑4, DEFM14A, etc.)
- `filing_date`
- `url`
- `raw_text` (or pointer to blob storage)
- `parsed_json` (structured representation: sections, items, tables)

### CourtCase

- `id`
- `deal_id` (nullable)
- `courtlistener_id`
- `court`
- `case_number`
- `caption`
- `status` (OPEN, CLOSED, UNKNOWN)
- `created_date`
- `last_update`

### DocketEntry

- `id`
- `court_case_id`
- `courtlistener_entry_id`
- `date_filed`
- `description`
- `full_text` (nullable)
- `url`

### AgencyEvent

- `id`
- `deal_id` (nullable)
- `agency` (FTC, DOJ, OTHER)
- `event_type` (PRESS_RELEASE, COMPLAINT, CONSENT_DECREE, POLICY_STATEMENT, OTHER)
- `date`
- `title`
- `url`
- `summary_text`

### MarketSnapshot

- `id`
- `deal_id`
- `as_of` (timestamp)
- `acquirer_price`
- `target_price`
- `implied_consideration_per_share`
- `spread_absolute`
- `spread_percent`

### NewsItem

- `id`
- `feed_id`
- `deal_id` (nullable)
- `title`
- `url`
- `published_at`
- `summary`
- `tags` (jsonb, optional)

### Event

Unified event abstraction:

- `id`
- `deal_id`
- `event_type` (FILING, COURT, AGENCY, SPREAD, NEWS)
- `sub_type` (e.g., `OUTSIDE_DATE_CHANGE`, `INJUNCTION_DENIED`, `SECOND_REQUEST`, `SPREAD_WIDEN`, `CLIENT_NOTE`)
- `event_date`
- `title`
- `short_summary`
- `materiality_score` (0–100)
- `source_table` (Filing/CourtCase/DocketEntry/AgencyEvent/MarketSnapshot/NewsItem)
- `source_id`

### User, Watchlist, AlertRule

**User**

- `id`, `name`, `email`, `role` (ANALYST, PM, ADMIN)

**Watchlist**

- `id`, `user_id`, `name`
- Many‑to‑many mapping to Deals.

**AlertRule**

- `id`, `user_id`
- `deal_id` (nullable: null = applies to all deals in user’s watchlists)
- `criteria_json` (e.g. `{"event_types":["COURT","AGENCY"],"materiality_min":70}`)
- `channels` (array of EMAIL, SLACK, WEBHOOK)
- `webhook_url` (nullable)
- `webhook_secret` (nullable)

***

## 5. Ingestion & Processing Pipelines

### 5.1 Deal Creation Workflow

**Inputs:** Manual form or CSV.

**Steps:**

1. Analyst inputs acquirer & target tickers (and optional headline value, expected close, sector, initial `p_close_base`, `spread_entry_threshold`).
2. System resolves tickers to Companies (and CIKs).
3. System creates Deal record with fields above.
4. System kicks off link discovery:
   - SEC search: recent filings mentioning “merger”, “acquisition” for these CIKs.
   - CourtListener search: dockets with these party names near announcement date.
   - FTC/DOJ scan: RSS items with those party names.

### 5.2 SEC Pipeline

**Trigger:** New filing for a covered CIK via RSS/API.

**Steps:**

1. **Discovery** – Detect via RSS or API.
2. **Download** – Fetch primary HTML/TXT.
3. **Parsing** – Extract sections (by Item and headings); optionally parse XBRL tables.
4. **Term & clause extraction** (especially from S‑4 / DEFM14A / deal‑8‑K):
   - Consideration: cash, stock, mix, any collar ranges.
   - Key dates: expected close, outside date.
   - Termination fee and reverse termination fee (amounts and triggers).
   - MAE definition and carve‑outs.
   - Regulatory efforts clause (text).
   - Litigation condition (close conditioned on dismissal/resolution?).
   - HSR/antitrust‑related risk discussion.
5. **Store** – Update Deal and DealClause records.
6. **Change detection** – For amendments, diff relevant clauses vs previous version; flag changes.
7. **Summarization** – Create short_summary focusing on changes and implications.
8. **Event** – Create FILING Event with `sub_type` derived from context and `materiality_score`.
9. **Alert evaluation** – Run AlertRules and send notifications.

### 5.3 CourtListener Pipeline

**Trigger:** Deal creation (initial search) and RSS updates for attached dockets.

**Steps:**

1. **Initial search** – Identify likely dockets; analyst confirms.
2. **Monitoring** – For each CourtCase, subscribe to RSS; on new entry, pull full DocketEntry via API.
3. **Classification & summarization** – Identify complaints, injunction motions, orders, dismissals; summarize each.
4. **Event** – Create COURT Events with appropriate sub_type and materiality.
5. **Alerts** – Send alerts for e.g. any injunction order, new complaint, settlement.

### 5.4 FTC/DOJ Pipeline

**Trigger:** RSS items from FTC and DOJ feeds.

**Steps:**

1. Fetch new RSS items.
2. String‑match company/deal names; when matched, create AgencyEvent.
3. Summarize content with focus on enforcement step and deal implications.
4. Create AGENCY Event; set materiality (complaint/consent high; generic policy medium/low).
5. Evaluate AlertRules and notify.

### 5.5 Market Data & Spread Computation

**Trigger:** Scheduled job during market hours.

**Steps:**

1. For each active Deal: fetch acquirer and target prices.
2. Compute implied consideration and spread for each deal type:
   - CASH: `implied = cash_per_share`.
   - STOCK: `implied = stock_ratio * acquirer_price`.
   - MIX: `implied = cash_per_share + stock_ratio * acquirer_price`.
3. Store MarketSnapshot.
4. If spread changed beyond user‑defined thresholds, create SPREAD_MOVE Event.
5. Use for screens and digests.

### 5.6 Curated RSS / News Pipeline

**Trigger:** Scheduled polling per feed.

**Steps:**

1. Fetch latest RSS items from each configured feed.
2. De‑duplicate by URL.
3. Attempt entity matching (deal/company names/tickers in title/summary).
4. Create NewsItem; if matched to deal, create NEWS Event.
5. Analyst can promote or downgrade materiality.

***

## 6. Alerts, Digests, and Webhooks

### 6.1 Real‑Time Alerts

For each new Event:

1. Identify AlertRules that apply (matching user, watchlists, deal_id, criteria).
2. For each rule and channel:

   - **Email:**
     - Subject: `[j16z] [Deal] [EventType/SubType] – short title`.
     - Body: summary, key numbers, links to j16z deal card and primary doc.

   - **Slack:**
     - Post JSON→formatted message into configured channel with buttons linking to deal and document.

   - **Webhook:**
     - POST JSON payload to rule.webhook_url containing full Event and Deal context (as outlined earlier), signed with webhook_secret.

### 6.2 Daily Analyst Digest

- Per user (or per watchlist).
- Contents:

  - List of deals with new Events above a materiality threshold in last 24h.
  - For each deal:
    - One‑line summary per event.
    - Current spread vs `spread_entry_threshold`.
    - Current `p_close_base`.

- Intended to be the analyst’s morning “what changed” email.

### 6.3 Weekly “Idea Sheet” Digest

- Per user / desk.
- Contents:

  - Top N deals where spread ≥ `spread_entry_threshold` and `p_close_base` in a target range (e.g., 40–80%).
  - For each deal:
    - Snapshot of key terms, spread, EV per share, main risks.
    - Links to deal card and suggested research draft.

- Meant as a starting point for internal and client‑facing weekly commentary.

***

## 7. Frontend / UX

### 7.1 Deal Board

- Table of all tracked deals with:

  - Deal name (Acquirer → Target).
  - Status.
  - Spread (%).
  - `p_close_base`.
  - Simple EV metric (e.g., `spread * p_close_base`).
  - Regulatory status (icons for second request, complaint, consent).
  - Litigation status (count and last event).
  - Outside‑date countdown.

- Filters:

  - By spread, p_close_base, EV, sector, regulatory/litigation flags, watchlist.

### 7.2 Deal Card

- **Summary header:** key terms, spread, probability, status, big dates.
- **Key Clauses panel:** table listing termination/reverse fees, MAE, regulatory efforts, litigation condition, financing condition; each row links to filing excerpt.
- **Event timeline:** vertical, time‑ordered; filter by event_type and materiality.
- **Spreads tab:** chart of spread history and notable event markers.
- **News/RSS tab:** list of NewsItems; analyst can tag notes.
- **Probability/threshold widget:** inputs for `p_close_base`, breakdowns, and `spread_entry_threshold`.

### 7.3 Research Draft View

- One‑click from Deal Card: “Generate draft note”.
- Shows editable Markdown/HTML:

  - Deal overview (auto‑filled).
  - Terms & clauses table.
  - Regulatory and litigation sections with key events and citations.
  - Spread and EV snapshot.
  - Scenario stub with p_close and simple payoff math.

- Export: copy to clipboard; download `.md` or `.docx`.

***

## 8. Exports & API

**CSV Exports:**

- Deals table (with terms, probabilities, spreads).
- Events per deal (for selected date range).

**API:**

- `GET /deals` – list with filters.
- `GET /deals/{id}` – full detail.
- `GET /deals/{id}/events` – paginated events.
- `GET /deals/{id}/terms` – structured clauses.
- Auth via token per user or per client.

These allow firms to build their own internal dashboards and client‑facing products.

***

## 9. In‑Scope vs Out‑of‑Scope (MVP)

**In scope:**

- All ingestion pipelines above (SEC, CourtListener, FTC/DOJ, market‑data, curated RSS).
- Clause and term extraction for key deal documents.
- Event classification and materiality scoring.
- Deal board, deal card, research draft generator.
- Alerts (email, Slack, webhook) and daily/weekly digests.
- CSV/API exports.
- Basic multi‑user support and watchlists.

**Out of scope (for later versions):**

- Automatic global deal discovery from paid M&A feeds.
- Non‑US regulators and courts.
- Advanced ML models for p_close (beyond optional suggestions).
- Full investor portal with separate client logins.
- Portfolio‑level risk analytics (VaR, correlation, etc.).

This document is self‑contained and includes all previously discussed requirements, aligned with your notes and the research sources cited.[2][13][14][15][16]

Sources
[1] RSS Feeds https://www.sec.gov/about/rss-feeds
[2] Structured Disclosure RSS Feeds https://www.sec.gov/structureddata/rss-feeds
[3] CourtListener https://www.courtlistener.com/help/api/
[4] court-listener-api-definition/court-listener-api.json at master · freelawproject/court-listener-api-definition https://github.com/freelawproject/court-listener-api-definition/blob/master/court-listener-api.json
[5] CourtListener https://www.courtlistener.com/feeds/
[6] RSS | Federal Trade Commission https://www.ftc.gov/stay-connected/rss
[7] Antitrust Division | Press Releases https://www.justice.gov/atr/press-releases
[8] Top 10 AI Tools for Financial Research (Buyer's Guide) https://www.alpha-sense.com/resources/research-articles/ai-tools-for-financial-research/
[9] FTC and DOJ Update Guidance to Reinforce Preservation ... https://www.nelsonmullins.com/insights/alerts/additional_nelson_mullins_alerts/all/ftc-and-doj-update-guidance-to-reinforce-preservation-obligations-regarding-messaging-applications-and-tools
[10] FTC joins DOJ in rescinding health care antitrust policies https://www.hoganlovells.com/en/publications/ftc-joins-doj-in-rescinding-health-care-antitrust-policies
[11] 7 Best Sources for Hedge Fund Letters in 2025 https://blog.publicview.ai/hedge-fund-letters
[12] Top 10 hedge fund newsletters for inspiration https://flodesk.com/tips/hedge-fund-newsletters
[13] A Complete Guide to Understanding Merger Arbitrage Hedge Funds https://www.process.st/merger-arbitrage-hedge-funds/
[14] [PDF] Merger (Risk) Arbitrage Strategy https://www.aima.org/asset/676DA5D6-8CE4-42D7-A2C6171EAC6382DC/
[15] [PDF] The Draft Merger Guidelines - Antitrust Writing Awards https://awards.concurrences.com/IMG/pdf/v_37_no_3_draft-merger-guidelines.pdf?116570%2Fbc7dbf634242c154c7ac2566e8fedac032987dd2b75311bb2ed913e5ff75693f
[16] 5 Hedge Fund Workflows That Drive Operational Alpha | Verity https://verityplatform.com/resources/hedge-fund-workflows/
[17] How to Set Up TradingView Alerts (2025) - Free & Paid Plans ... https://www.tv-hub.org/guide/tradingview-alerts-setup
[18] The best stock alert apps for 2025 - Investorsobserver https://investorsobserver.com/learning-center/best-stock-alert-apps-for-2024/
[19] Webhooks for Alerts - TrendSpider https://help.trendspider.com/kb/alerts/webhooks
