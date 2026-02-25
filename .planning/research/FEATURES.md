# Feature Research

**Domain:** M&A Deal Intelligence Platform — Merger-Arb Focused
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH (competitor features from multiple sources; analyst workflows from practitioner guides and verified tools)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features merger-arb analysts assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Deal board with status filtering | Primary work surface; Bloomberg MARB, InsideArbitrage, Dealreporter all anchor on this | LOW | Already built in frontend shell with mock data |
| Spread display per deal (gross %, annualized %) | Core merger-arb metric — analysts assess entry/exit from spread data daily | MEDIUM | Requires live market data feed; currently mocked |
| Regulatory status tracking (HSR, FTC, DOJ, EU) | Antitrust risk is the #1 break-risk variable; every platform tracks this | MEDIUM | Agency events already in domain model |
| Deal timeline / key dates (announcement, outside date, expected close) | Analysts must know time decay on positions; outside date drives annualized return math | LOW | Outside date exists in Deal type; need surfacing |
| Filing ingestion from SEC EDGAR | EDGAR is the authoritative source for deal agreements, proxies, amendments; table stakes for any serious platform | HIGH | Mandatory per PROJECT.md; not yet built |
| Filing display with source links | Analysts need to verify primary sources; trust requires traceability | LOW | UI pattern: link to EDGAR document |
| Event feed / activity stream per deal | Consolidates fragmented monitoring into one view; CourtListener/Bloomberg both do this | MEDIUM | Inbox pattern already built in frontend |
| Alert delivery (email) on material events | Analysts can't be in-platform 24/7; push notification is required to avoid missing breaks | MEDIUM | Alert rule logic built; delivery not wired |
| Deal search and filtering | Finding deals by sector, status, deal size, acquirer/target is baseline navigation | LOW | Frontend filter UI exists; needs real data |
| Termination fee and MAE clause display | These are the core protective terms every arb models; 95%+ of deals have MAE clauses | MEDIUM | Clause extraction pipeline needed; domain model ready |
| Outside date countdown / urgency indicator | Time-to-expiry drives spread math and portfolio urgency; analysts watch this daily | LOW | Computable from `outside_date` field; UI enhancement |
| Deal card with terms summary | Per-deal deep-dive is how analysts underwrite individual positions | MEDIUM | Frontend shell exists; needs real data population |
| Watchlist / coverage management | Analysts don't track all deals equally; curated coverage lists are assumed | LOW | Already built in frontend shell |
| CSV/data export | Analysts pipe data into internal models; every institutional tool offers export | LOW | Export utilities already exist in codebase |
| Shareholder vote tracking | Proxy vote is a hard close condition; analysts model vote risk | MEDIUM | Subtype of FILING events; needs data source |

### Differentiators (Competitive Advantage)

Features that set j16z apart from Bloomberg Terminal ($20-32K/yr generalist) and Dealreporter (expensive, human-curated).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| LLM clause extraction from EDGAR filings | Bloomberg shows filings as PDFs; j16z extracts structured terms (termination fees, MAE scope, regulatory covenants) automatically — eliminating 1-2 hrs/deal of manual reading | HIGH | Core differentiator; Harvey.ai approach applied to public filings rather than data rooms |
| Materiality-scored event feed | Not all events matter equally; scoring 0-100 with deal-context adjustments (outside date proximity, p_close, litigation count) focuses analyst attention — Dealreporter doesn't score, Bloomberg doesn't rank | MEDIUM | Scoring systems already built; needs real events to score |
| Unified source aggregation (EDGAR + CourtListener + FTC/DOJ + news) | Analysts currently maintain 5-8 browser tabs; j16z collapses fragmented monitoring into single pane — unique combination not offered by single competitor | HIGH | Each source requires separate integration; the combination is the moat |
| AI-generated event summaries | Raw docket entries and 8-K filings require legal/financial translation; auto-summaries reduce time-to-comprehension from 20 min to 2 min per event | HIGH | Requires LLM pipeline; Harvey.ai precedent shows 75% time saving on unstructured data |
| Deal memo / research draft scaffolding | LLM-generated memo skeletons (thesis, terms, risks, timeline) seeded with live deal data; analysts edit rather than write from scratch — no platform offers this today | HIGH | Significant analyst time savings; no direct competitor; risk is quality |
| Slack/webhook alert delivery | Desk workflows happen in Slack; email-only platforms miss real-time desk communication patterns | MEDIUM | Slack integration is straightforward but requires OAuth setup |
| Deal spread chart with event overlay | Showing spread history with event markers (filing dates, regulatory news) reveals market reaction patterns — better than standalone spread charts | MEDIUM | Requires timeseries spread data + event correlation |
| Configurable alert thresholds per deal | Analysts have different risk tolerances per position size; per-deal threshold configuration is more useful than global settings | LOW | Alert rule domain model already supports this |
| CourtListener-style side panel (no page navigation) | Maintains inbox context while reading event detail — UX pattern analysts validated as natural; competitors lose context on navigation | LOW | Already implemented in frontend |
| RSS/news feed per watchlist | Attaching curated law firm alerts and specialist feeds to coverage lists — surface relevant intelligence without general market noise | MEDIUM | RSS ingestion needed; frontend UI built |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create complexity without proportionate value at MVP stage.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Real-time price/spread streaming | Analysts want live spreads | Bloomberg already does this; market data vendor fees ($5-15K/yr) + infrastructure cost is disproportionate for MVP; spreads update slowly enough that polling every 5 min is sufficient | Poll market data API every 5 min; display last-updated timestamp |
| Predictive break probability model (ML) | "What's the probability this deal closes?" is the core question | Requires historical training data j16z doesn't have yet; models trained on limited data produce false precision; misleads analysts; Bloomberg doesn't do this well | Display analyst-entered p_close estimates; label clearly as analyst judgment |
| AI Analyst chat ("ask anything about this deal") | Natural interaction pattern; feels powerful | Hallucination risk on deal-critical facts (termination fees, outside dates) is unacceptable; legal/financial liability if analysts trade on wrong AI output | Use AI for summarization and scaffold generation only; always link to source for factual claims |
| Self-improving materiality engine (feedback loop ML) | Personalization sounds good | Requires significant event history + feedback data to train; adds infra complexity; at MVP scale (5-10 pilot clients) there isn't enough signal | Static scoring with analyst manual override ("mark as not material"); log overrides for future training data |
| Native mobile app | Analysts want mobile access | M&A arb is desk work; mobile adds dev cost without clear workflow benefit at pilot stage | Responsive web design for occasional mobile use |
| Social/community features (sharing trades, public watchlists) | Seen in platforms like InsideArbitrage | Institutional desks cannot share positions; compliance prevents it; drives away enterprise clients | API export for internal sharing within firm |
| Full document viewer / PDF rendering in-app | "I want to read the filing without leaving the platform" | PDF rendering is complex (PDF.js, pagination, search); adds significant UI complexity for marginal gain | Link to EDGAR document in new tab; show extracted key terms inline |
| OAuth/social login (Google, LinkedIn) | Convenience | Pilot firms have compliance requirements; institutional security teams prefer email/password + MFA over social login | Email/password + magic link (already planned) |
| Video content / explainers | Marketing wants educational content | No use case in analyst workflow; adds content maintenance burden | Link to external resources in docs/help; don't host video |
| Multi-language support | Eventual global expansion pitch | US M&A market is English-only; pilot clients are US firms; adds translation maintenance overhead | English-only; revisit when non-US deals are tracked |
| Real-time collaborative editing (Google Docs-style) | Team feature requests | Adds WebSocket complexity; Sentieo scores 9.1 on this but it's a distraction from core intelligence; pilots are 1-3 analysts per firm | Comment threads on deal cards; sharing via export |

---

## Feature Dependencies

```
SEC EDGAR Integration
    └──requires──> Filing Display + Source Links
    └──requires──> LLM Clause Extraction
                       └──requires──> Clause Display (termination fee, MAE, reg covenants)
                       └──requires──> Deal Terms Population
                           └──enhances──> Deal Memo Scaffolding

CourtListener Integration
    └──requires──> Litigation Event Ingestion
    └──enhances──> Materiality Scoring (litigation count adjustment)

FTC/DOJ Antitrust Integration
    └──requires──> Agency Event Ingestion
    └──enhances──> Regulatory Status Tracking

Market Data API
    └──requires──> Spread Display
    └──enhances──> Deal Board (live spread column)
    └──enhances──> Spread Chart with Event Overlay

Materiality Scoring (already built)
    └──enhances──> Inbox Event Feed (sort order)
    └──enhances──> Alert Trigger Evaluation (already built)
    └──requires──> Real Events to Score (blocked until ingestion exists)

Alert Trigger Evaluation (already built)
    └──requires──> Alert Delivery (email/Slack) ← NOT YET BUILT
    └──requires──> Alert Rules Storage (frontend UI exists)

Supabase Auth
    └──requires──> Session Persistence
    └──requires──> Team-Level Data Isolation
    └──blocks──> All pilot client onboarding

Deal Memo Scaffolding
    └──requires──> LLM Clause Extraction (for terms seeding)
    └──requires──> Event Ingestion (for timeline seeding)
    └──requires──> Rich Text Editor
```

### Dependency Notes

- **Alert delivery requires ingestion pipeline:** Alert rules are built but can't fire until real events exist. Wiring email/Slack before ingestion works is wasted effort.
- **Clause extraction requires EDGAR ingestion:** LLM extraction can only run on ingested filings. EDGAR integration is the hard prerequisite.
- **Auth blocks pilots:** Without Supabase auth + team isolation, j16z cannot onboard pilot clients. This is not optional for production.
- **Materiality scoring is built but starved:** The scoring logic exists and is correct; it just has nothing to score until ingestion runs.
- **Deal memo blocks on both extraction and ingestion:** It needs structured terms (from extraction) and a timeline (from ingestion) to generate useful scaffolding.

---

## MVP Definition

### Launch With (v1) — Pilot-Ready

Minimum set to put in front of pilot hedge fund clients and demonstrate real value over their current Bloomberg + tab-juggling workflow.

- [ ] **Supabase auth + team isolation** — required to onboard external clients; blocks everything else
- [ ] **SEC EDGAR filing ingestion** — 8-K, S-4, DEFM14A for tracked deals; the authoritative source
- [ ] **Deal board with real data** — populated from ingested filings, not mock data
- [ ] **LLM clause extraction** — termination fees, MAE clauses, regulatory covenants; the primary differentiator
- [ ] **Email alert delivery** — wiring the existing trigger logic to actually send; analysts need push notification
- [ ] **Spread display** — even polled market data (not streaming); arb desk needs spread to assess positions
- [ ] **Outside date display + urgency** — trivially computable but high analyst value; drives annualized return math
- [ ] **CourtListener litigation ingestion** — merger challenges and shareholder suits; second most important data source
- [ ] **Inbox with real scored events** — materiality scoring applied to real events; the differentiated UX pattern

### Add After Validation (v1.x)

Features to add once core ingestion + extraction is working and pilots are engaged.

- [ ] **FTC/DOJ antitrust integration** — after EDGAR and CourtListener are stable; adds regulatory event coverage
- [ ] **Slack alert delivery** — after email works; most desks use Slack as primary channel
- [ ] **AI event summaries** — LLM-generated 2-3 sentence summaries of filings; accelerates comprehension
- [ ] **Deal spread chart with event overlay** — requires timeseries spread data; adds analytical depth
- [ ] **Daily email digest** — morning summary of overnight activity; natural after per-event alerts work
- [ ] **RSS/news feed ingestion** — law firm alerts and specialist feeds; lower priority than primary data sources
- [ ] **CSV export via API** — firms want to pipe data into internal systems; straightforward after data model is stable

### Future Consideration (v2+)

Defer until product-market fit is established with pilot clients.

- [ ] **Deal memo / research draft scaffolding** — high value but requires stable extraction pipeline and rich text editor; polish after v1 is validated
- [ ] **Weekly digest** — after daily digest pattern is proven
- [ ] **Webhook integrations** — for firms with internal systems; after API is stable
- [ ] **API key management for external consumption** — after firm requests this pattern
- [ ] **Spread prediction / break probability display** — analyst-entered p_close estimates only; ML model deferred

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Supabase auth + team isolation | HIGH | LOW | P1 |
| SEC EDGAR filing ingestion | HIGH | HIGH | P1 |
| LLM clause extraction (termination fee, MAE, reg covenants) | HIGH | HIGH | P1 |
| Deal board with real data | HIGH | MEDIUM | P1 |
| Email alert delivery | HIGH | MEDIUM | P1 |
| Spread display (polled) | HIGH | MEDIUM | P1 |
| Outside date / urgency display | HIGH | LOW | P1 |
| CourtListener litigation ingestion | HIGH | MEDIUM | P1 |
| Inbox with real scored events | HIGH | LOW (scoring exists) | P1 |
| FTC/DOJ antitrust integration | HIGH | MEDIUM | P2 |
| Slack alert delivery | MEDIUM | MEDIUM | P2 |
| AI event summaries | HIGH | MEDIUM | P2 |
| Deal spread chart with event overlay | MEDIUM | MEDIUM | P2 |
| Daily email digest | MEDIUM | LOW | P2 |
| RSS/news feed ingestion | MEDIUM | MEDIUM | P2 |
| CSV/API export | MEDIUM | LOW | P2 |
| Deal memo scaffolding | HIGH | HIGH | P3 |
| Webhook integrations | MEDIUM | MEDIUM | P3 |
| Break probability model (ML) | MEDIUM | VERY HIGH | DEFER |
| AI analyst chat | MEDIUM | HIGH | DEFER |

**Priority key:**
- P1: Must have for launch (pilot-ready MVP)
- P2: Should have, add in v1.x after pilot validation
- P3: Nice to have, plan for v2

---

## Competitor Feature Analysis

| Feature | Bloomberg Terminal | Dealreporter | AlphaSense | InsideArbitrage | j16z Approach |
|---------|-------------------|--------------|------------|-----------------|---------------|
| Deal board | Yes (MA function, MARB) | Yes | Yes (M&A screener) | Yes (tracker tool) | Built; needs real data |
| Spread tracking | Yes (real-time, MARB function) | Yes | Yes | Yes (auto-calculated) | Polled market data; good enough for MVP |
| Regulatory status | Yes | Yes (journalist-curated) | Limited | Limited | Auto-ingested from FTC/DOJ + EDGAR |
| Litigation tracking | Limited | Yes (journalist-curated) | Limited | Limited | CourtListener integration; structural advantage |
| Filing ingestion | View only (PDF links) | Curated alerts | Full text search + NLP | Limited | Structured extraction via LLM; differentiator |
| Clause extraction | Manual reading | Manual reading | Table tools (manual) | None | Automated LLM extraction; key differentiator |
| Materiality scoring | None | Journalist judgment | None | None | Algorithmic scoring with deal-context adjustments |
| Alert delivery | Email + Bloomberg IB | Email | Email | Email | Email + Slack; webhook planned |
| AI summaries | None | None | Yes (generative search) | None | LLM summaries of filings + docket entries |
| Deal memo / research scaffold | None | None | Workflow Agents (pitchbook) | None | Template-seeded memo editor; unique for arb desks |
| Watchlist management | Yes | Yes | Yes | Yes | Built in frontend |
| Data export | Bloomberg data license (expensive) | Limited | Excel export | Limited | CSV + API; accessible pricing |
| UX / speed | Dated (terminal UI) | Dated web UI | Modern web | Basic web | Linear x Harvey aesthetic; keyboard-first |
| Pricing | $20-32K/analyst/yr | ~$15-25K/yr (est) | $15-30K/yr | Subscription | Target $18-24K/analyst/yr |

**Key competitive gaps j16z can own:**
1. Automated clause extraction from public filings (no competitor does this structurally)
2. Algorithmic materiality scoring (Dealreporter uses human judgment; not scalable)
3. Unified EDGAR + CourtListener + FTC/DOJ in single event feed (fragmented across all competitors)
4. Linear-quality UX on a purpose-built arb tool (Bloomberg is dated; others are basic web)

---

## Sources

- [Dealreporter — M&A Intelligence for Merger Arb & Special Situations](https://ionanalytics.com/dealreporter/) — competitor feature analysis (MEDIUM confidence: marketing page)
- [Bloomberg Terminal M&A Functions — University of South Carolina Library Guide](https://guides.library.sc.edu/c.php?g=1133564&p=8272562) — Bloomberg MA/MARB function description (MEDIUM confidence: library guide, reflects real terminal)
- [AlphaSense M&A Database](https://www.alpha-sense.com/solutions/mergers-and-acquisitions-database/) — AlphaSense M&A screener and Deal Intelligence Agent features (MEDIUM confidence: product page)
- [InsideArbitrage Merger Arbitrage Tracker](https://www.insidearbitrage.com/merger-arbitrage/) — spread calculation, deal board features in retail-facing arb tool (MEDIUM confidence: live tool)
- [Harvey AI — M&A Teams Use Harvey Across the Deal Lifecycle](https://www.harvey.ai/blog/harvey-in-practice-how-m-and-a-teams-use-harvey) — LLM clause extraction benchmarks and use cases (MEDIUM confidence: vendor blog with specific data)
- [CourtListener RECAP Search Alerts Launch](https://www.lawnext.com/2025/06/courtlistener-launches-recap-search-alerts-for-pacer-filings-google-alerts-for-federal-courts.html) — CourtListener API capabilities and alert patterns (HIGH confidence: primary source coverage of official launch)
- [CourtListener REST API v4](https://www.courtlistener.com/help/api/rest/) — API capabilities, webhook support (HIGH confidence: official documentation)
- [Merger Arbitrage Best Practices 2025](https://www.insidearbitrage.com/2025/03/best-practices-for-merger-arbitrage-success-in-2025/) — analyst workflow, data sources practitioners use (MEDIUM confidence: practitioner-authored)
- [A Practitioner's Guide to Merger Arbitrage](https://accelerateshares.com/wp-content/uploads/2020/02/A-Practitioner%E2%80%99s-Guide-to-Merger-Arbitrage-1.pdf) — analyst research process, deal evaluation criteria (MEDIUM confidence: institutional practitioner guide)
- [Managing Deal Risks — Skadden](https://www.skadden.com/insights/publications/2024/03/insights-special-edition/managing-deal-risks-in-a-challenging-regulatory-environment) — MAE clause prevalence (95% of deals), termination fee ranges (4-7%), regulatory covenant structure (HIGH confidence: leading M&A law firm)
- [Mayer Brown — 7 Practical Ways to Use AI in M&A](https://www.mayerbrown.com/en/insights/publications/2025/09/7-practical-ways-to-use-ai-in-manda-transactions) — AI use case validation in M&A context (MEDIUM confidence: law firm with deal experience)
- [2026 HSR Thresholds — Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/01/united-states-2026-hsr-notification-thresholds-announced) — regulatory process context (HIGH confidence: primary legal source)
- PROJECT.md — j16z project context, validated features, out-of-scope list, constraints (HIGH confidence: primary source)

---

*Feature research for: M&A deal intelligence platform, merger-arb focused*
*Researched: 2026-02-25*
