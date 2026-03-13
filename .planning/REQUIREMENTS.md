# Requirements: j16z

**Defined:** 2026-02-25
**Core Value:** Analysts spend 3-5 hours/day trolling fragmented sources. j16z turns that into a push-button workflow — live data in, analyst-ready intelligence out.

## v1 Requirements

Requirements for production MVP. Each maps to roadmap phases.

### Backend Foundation

- [x] **BACK-01**: Backend API service runs in monorepo at `apps/api/` using Hono + Drizzle ORM *(completed 01-01, 2026-02-25)*
- [x] **BACK-02**: Database schema with Supabase Postgres — deals, events, filings, clauses, market snapshots, alert rules, users, teams *(completed 01-01, 2026-02-25)*
- [x] **BACK-03**: All database queries scoped by `firm_id` with Supabase RLS for multi-tenant isolation *(completed 01-01, 2026-02-25)*
- [x] **BACK-04**: Frontend API abstraction (`api.ts`) connects to real backend when `NEXT_PUBLIC_USE_MOCK_DATA=false`
- [x] **BACK-05**: BullMQ job queue with Redis for scheduled ingestion and async extraction jobs

### Authentication

- [x] **AUTH-01**: User can sign up with email and password via Supabase auth
- [x] **AUTH-02**: User can log in via magic link (passwordless)
- [x] **AUTH-03**: User session persists across browser refresh
- [x] **AUTH-04**: User can log out from any page
- [x] **AUTH-05**: Team-level data isolation — users only see their firm's deals, events, and watchlists
- [x] **AUTH-06**: Cross-tenant isolation passes as blocking CI gate before pilot onboarding

### SEC EDGAR Ingestion

- [x] **EDGAR-01**: System polls SEC EDGAR full-text search API on schedule (every 15 min) for tracked CIKs
- [x] **EDGAR-02**: System ingests and stores 8-K, S-4, DEFM14A, and 13D/13G filings
- [x] **EDGAR-03**: System includes proper user-agent header to avoid EDGAR IP blocks
- [x] **EDGAR-04**: System rate-limits requests to <10/sec per SEC policy
- [x] **EDGAR-05**: Raw filing content stored before extraction (two-stage ingestion)
- [x] **EDGAR-06**: User can view source filing via link to EDGAR document

### CourtListener Integration

- [ ] **COURT-01**: System receives CourtListener webhook notifications for docket updates on tracked cases
- [ ] **COURT-02**: System polls CourtListener API for initial case discovery on new deals
- [ ] **COURT-03**: System ingests merger challenges, shareholder suits, and antitrust cases
- [ ] **COURT-04**: System monitors PACER credential health and alerts on expiry (180-day rotation)
- [ ] **COURT-05**: Docket entries create events with appropriate materiality scores

### FTC/DOJ Antitrust Integration

- [ ] **AGENCY-01**: System monitors FTC and DOJ RSS feeds for antitrust actions and press releases
- [ ] **AGENCY-02**: System detects HSR second requests, enforcement actions, and clearance decisions
- [ ] **AGENCY-03**: System matches agency events to tracked deals by company/deal reference
- [ ] **AGENCY-04**: System includes canary monitoring for RSS feed format changes

### Market Data

- [ ] **MKT-01**: System polls market data API for spread and price data on tracked deal tickers
- [ ] **MKT-02**: System computes implied consideration and gross/annualized spread
- [ ] **MKT-03**: Market snapshots stored with timestamps for spread history charting
- [ ] **MKT-04**: Spread display shows last-updated timestamp (data-age indicator)

### LangExtract (AI Extraction Pipeline)

- [x] **EXTRACT-01**: Python extraction service runs in monorepo at `apps/langextract/` using Google's LangExtract library
- [x] **EXTRACT-02**: System extracts termination fees, MAE clauses, regulatory covenants, and litigation terms from SEC filings
- [x] **EXTRACT-03**: Every extracted field maps to exact source location in original document (source grounding)
- [x] **EXTRACT-04**: Extraction uses few-shot examples trained on M&A document patterns
- [x] **EXTRACT-05**: System handles long filings (500+ page S-4s) via chunking and parallel processing
- [x] **EXTRACT-06**: System generates 2-3 sentence analyst-facing summaries of filings and docket entries
- [x] **EXTRACT-07**: Materiality scoring runs at extraction time; scores stored as DB columns

### Alerts

- [x] **ALERT-01**: System sends email alerts on events with materiality score >70 (CRITICAL)
- [x] **ALERT-02**: System sends Slack alerts on events with materiality score >70 (CRITICAL)
- [x] **ALERT-03**: System sends Slack-only alerts on events with materiality score 50-70 (WARNING)
- [ ] **ALERT-04**: User can configure alert thresholds per deal (override global defaults)
- [ ] **ALERT-05**: User can configure delivery channels (email, Slack, webhook) per alert rule
- [x] **ALERT-06**: Webhook delivery for firms with internal systems

### Digests

- [ ] **DIGEST-01**: System sends daily email digest at 8:00 AM ET summarizing overnight HIGH + MEDIUM events
- [ ] **DIGEST-02**: System sends weekly email digest Friday 5:00 PM ET summarizing all deal changes
- [ ] **DIGEST-03**: Digest emails use react-email templates matching j16z brand (dark, Aurora palette)
- [ ] **DIGEST-04**: User can suppress weekend digests

### Deal Memo Editor

- [ ] **MEMO-01**: User can create a deal memo from a template seeded with live deal terms, events, and timeline
- [ ] **MEMO-02**: User can edit memo freeform with rich text editor after template scaffolding
- [ ] **MEMO-03**: User can pull in live deal data (terms, spreads, events) into memo body
- [ ] **MEMO-04**: System tracks memo edit history

### Frontend Refinement

- [ ] **UI-01**: Deal page uses eToro-style tab structure (Terms, Events, Spread History, News/Research, Reg & Litigation)
- [ ] **UI-02**: Event detail uses CourtListener sidebar pattern on deal page (no arrow navigation)
- [ ] **UI-03**: Landing page polished to Linear x Harvey aesthetic — conveys "deal intelligence, made faster"
- [ ] **UI-04**: First-time user flow with orderable sidebar (first item is default, burger icon)
- [ ] **UI-05**: Keyboard shortcuts refined for core navigation and actions (post-core)

### RSS & News

- [ ] **RSS-01**: System ingests curated RSS feeds (law firm alerts, specialist newsletters)
- [ ] **RSS-02**: RSS feeds attachable to watchlists for targeted intelligence
- [ ] **RSS-03**: News items scored for relevance and surfaced in deal event timeline

### Data Exports

- [ ] **EXPORT-01**: User can export deal data as CSV
- [ ] **EXPORT-02**: User can access structured data via REST API with API key authentication
- [ ] **EXPORT-03**: API documentation available (OpenAPI spec)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI Enhancement

- **AI-01**: Self-improving materiality engine — ML feedback loop learning from analyst overrides
- **AI-02**: Predictive deal analytics — break probability models trained on historical deal data
- **AI-03**: AI Analyst chat — natural language queries about deals (hallucination risk requires careful design)

### Collaboration

- **COLLAB-01**: Comment threads on deal cards for team discussion
- **COLLAB-02**: Shared watchlists across team members
- **COLLAB-03**: Activity log of team actions per deal

### Advanced UX

- **UX-01**: Full Linear-style vim navigation
- **UX-02**: Custom keyboard shortcut configuration
- **UX-03**: Command palette with fuzzy search across all entities

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time price/spread streaming | Bloomberg owns this; polling every 5 min is sufficient for arb desks |
| Native mobile app | M&A arb is desk work; web-first, mobile later |
| OAuth/social login | Institutional compliance requires email/password; magic links cover convenience |
| Full in-app PDF viewer | Complex (PDF.js); link to EDGAR is sufficient; show extracted terms inline |
| Real-time collaborative editing | WebSocket complexity; commenting is sufficient for pilot scale |
| Multi-language support | US M&A market is English-only; pilot clients are US firms |
| Video content | No use case in analyst workflow |
| Social/community features | Institutional desks cannot share positions; compliance prevents it |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACK-01 | Phase 1 | Complete (01-01) |
| BACK-02 | Phase 1 | Complete (01-01) |
| BACK-03 | Phase 1 | Complete (01-01) |
| BACK-04 | Phase 1 | Complete |
| BACK-05 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| EDGAR-01 | Phase 2 | Complete |
| EDGAR-02 | Phase 2 | Complete |
| EDGAR-03 | Phase 2 | Complete |
| EDGAR-04 | Phase 2 | Complete |
| EDGAR-05 | Phase 2 | Complete |
| EDGAR-06 | Phase 2 | Complete |
| EXTRACT-01 | Phase 3 | Complete |
| EXTRACT-02 | Phase 3 | Complete |
| EXTRACT-03 | Phase 3 | Complete |
| EXTRACT-04 | Phase 3 | Complete |
| EXTRACT-05 | Phase 3 | Complete |
| EXTRACT-06 | Phase 3 | Complete |
| EXTRACT-07 | Phase 3 | Complete |
| COURT-01 | Phase 4 | Pending |
| COURT-02 | Phase 4 | Pending |
| COURT-03 | Phase 4 | Pending |
| COURT-04 | Phase 4 | Pending |
| COURT-05 | Phase 4 | Pending |
| AGENCY-01 | Phase 4 | Pending |
| AGENCY-02 | Phase 4 | Pending |
| AGENCY-03 | Phase 4 | Pending |
| AGENCY-04 | Phase 4 | Pending |
| RSS-01 | Phase 4 | Pending |
| RSS-02 | Phase 4 | Pending |
| RSS-03 | Phase 4 | Pending |
| ALERT-01 | Phase 5 | Complete |
| ALERT-02 | Phase 5 | Complete |
| ALERT-03 | Phase 5 | Complete |
| ALERT-04 | Phase 5 | Pending |
| ALERT-05 | Phase 5 | Pending |
| ALERT-06 | Phase 5 | Complete |
| MKT-01 | Phase 5 | Pending |
| MKT-02 | Phase 5 | Pending |
| MKT-03 | Phase 5 | Pending |
| MKT-04 | Phase 5 | Pending |
| DIGEST-01 | Phase 6 | Pending |
| DIGEST-02 | Phase 6 | Pending |
| DIGEST-03 | Phase 6 | Pending |
| DIGEST-04 | Phase 6 | Pending |
| MEMO-01 | Phase 6 | Pending |
| MEMO-02 | Phase 6 | Pending |
| MEMO-03 | Phase 6 | Pending |
| MEMO-04 | Phase 6 | Pending |
| UI-01 | Phase 7 | Pending |
| UI-02 | Phase 7 | Pending |
| UI-03 | Phase 7 | Pending |
| UI-04 | Phase 7 | Pending |
| UI-05 | Phase 7 | Pending |
| EXPORT-01 | Phase 7 | Pending |
| EXPORT-02 | Phase 7 | Pending |
| EXPORT-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 62 total (note: REQUIREMENTS.md previously stated 52; actual enumeration is 62)
- Mapped to phases: 62
- Unmapped: 0

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-26 — traceability populated by roadmapper; all 62 requirements mapped*
