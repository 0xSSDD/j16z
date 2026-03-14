# Pitfalls Research

**Domain:** M&A Intelligence Platform — SEC EDGAR ingestion, CourtListener/PACER legal data, FTC/DOJ scraping, LLM legal extraction, real-time alerting for hedge funds
**Researched:** 2026-02-25
**Confidence:** HIGH for EDGAR/CourtListener specifics; MEDIUM for LLM production patterns; HIGH for alert architecture

---

## Critical Pitfalls

### Pitfall 1: EDGAR IP Block from Missing or Incorrect User Agent

**What goes wrong:**
Automated EDGAR requests without a properly declared `User-Agent` header get classified as unclassified bots and are rate-limited or IP-blocked. When an IP is blocked, the entire service goes down — every analyst across every tenant loses access to new filings until the block lifts (10 minutes per offense, cumulative).

**Why it happens:**
Developers copy-paste `requests` or `httpx` boilerplate without reading SEC's access policy. The default library user agents ("python-httpx/0.27", etc.) are not acceptable. The SEC reserves the right to block IPs for "bots outside acceptable policy" and has enforced this.

**How to avoid:**
Set `User-Agent: j16z/1.0 (contact@j16z.com)` — must include company name and contact email per SEC policy. Implement a single EDGAR HTTP client used everywhere (never allow ad hoc requests). Add a middleware layer that enforces rate limits: max 10 req/sec across all workers, with a distributed token bucket when running multiple processes. Add exponential backoff with jitter on 429 responses.

**Warning signs:**
- Getting `403` or connection timeouts from `www.sec.gov`
- Local dev works but staging fails (staging has higher concurrency)
- Tests pass individually but fail when run in parallel

**Phase to address:**
Phase 1 (EDGAR Ingestion) — Before any production deployment of the ingestion worker. Build the rate-limiter and user-agent enforcement as the very first infrastructure piece, not as an afterthought.

---

### Pitfall 2: EDGAR Timezone Confusion Causing Missed or Duplicate Events

**What goes wrong:**
EDGAR index files display timestamps in Eastern Time but omit the timezone label. Developers assume UTC (the standard in most APIs), store the wrong time, and then either miss filings (because the window query is offset by 4-5 hours) or create duplicates during catch-up runs.

**Why it happens:**
The timezone omission is a documented EDGAR quirk that is easy to miss unless you've been burned. Filing timestamps like `2021-01-12T16:00:54` look UTC-clean but are actually `16:00:54 EST (-05:00)`.

**How to avoid:**
Always tag EDGAR timestamps as America/New_York on ingest. Store all timestamps in UTC in the database. Write a unit test that checks a known filing's `accepted_at` against a UTC-correct expected value. Use the `filedAt` field from the submissions API (which includes the offset, e.g., `2021-01-12T16:00:54-05:00`) rather than the flat index files.

**Warning signs:**
- Filings appearing to arrive 4-5 hours "late" on the deal card
- Event timelines with clusters of events at midnight UTC (converted incorrectly from 7 PM EST)
- Analysts reporting they see yesterday's filings when they expect today's

**Phase to address:**
Phase 1 (EDGAR Ingestion) — In the database schema design. Define a strict convention: all stored timestamps are UTC, all EDGAR fetches convert on ingest, enforced via a typed wrapper function, not scattered conversions.

---

### Pitfall 3: LLM Hallucination in Clause Extraction with No Ground Truth

**What goes wrong:**
The LLM extracts a termination fee of "$850 million" from an S-4 filing when the actual fee is "$350 million" — or worse, fabricates a MAE carve-out clause that does not exist in the document. Analysts trust the extracted clause, build thesis on it, and trade on wrong information. A 17-33% hallucination rate is documented even for specialized legal AI tools (LexisNexis Lexis+ AI, Thomson Reuters Westlaw AI-Assisted Research).

**Why it happens:**
LLMs are trained to be helpful and will generate plausible legal language when the context is ambiguous or the relevant clause is buried 200 pages into an exhibit. Long-context retrieval degrades in the "middle" of documents. Without a verification layer, there's no signal that the extraction is fabricated vs. accurate.

**How to avoid:**
Implement a mandatory citation system: every extracted field must include a `source_citation` object with `{accession_number, exhibit_number, page_number, verbatim_excerpt}`. Run a post-extraction validator that checks the verbatim excerpt actually appears in the retrieved document text. Use temperature=0 for structured extraction tasks. Prefer smaller, fine-tuned models over large frontier models for determinism — research shows smaller models can achieve 100% output consistency vs. 12.5% for large models. Never surface an extracted clause without its verbatim source quote in the UI.

**Warning signs:**
- Extracted numeric values that don't appear verbatim in the document text
- Clause extractions with high "confidence" on short/stub filings where no clause could be present
- LLM output that uses language stylistically different from the source document
- Two runs of the same filing producing different extracted values

**Phase to address:**
Phase 2 (LangExtract Pipeline) — The citation-verification pattern must be in the initial extraction pipeline design. Do not build extraction without verification. Budget time for a human spot-check QA process on the first 50 extracted filings before trusting automated output.

---

### Pitfall 4: Alert Fatigue from Over-Triggering on Low-Materiality Events

**What goes wrong:**
Every docket entry, every routine 8-K amendment, every RSS news item fires a Slack message to the analyst. Within a week, the analyst mutes the channel or unsubscribes. The product becomes background noise. When the genuinely critical FTC second request arrives, it is buried under 200 routine notifications nobody reads. Research across domains shows 40% of alerts are never investigated, 61% of teams admit to ignoring alerts that later proved critical.

**Why it happens:**
Developers ship alerts early as a "working feature" before the scoring system is calibrated. Every integration goes live before thresholds are tuned. There is no feedback loop — the system cannot learn that this analyst's threshold should be 80, not 70.

**How to avoid:**
Enforce channel-level minimum materiality gates: **email** only for score ≥ 70 (CRITICAL), **Slack** for score ≥ 50 (WARNING+), **Inbox-only** for score < 50. Never bypass these gates even during testing (use a debug channel instead). Build a per-analyst "snooze" and "not material" feedback mechanism in Phase 1 so adjustment data accumulates from day one. Implement a daily digest for INFO-level events rather than real-time delivery. Track per-analyst open rates and alert-to-action ratios as a product health metric.

**Warning signs:**
- Analysts stop opening Slack alerts within 2 weeks of onboarding
- "Unread" badge count exceeds 50 items in Inbox
- Analyst feedback: "I just check EDGAR directly, your alerts are noise"
- Email unsubscribe rate > 10% in the first month

**Phase to address:**
Phase 3 (Alerts & Digests) — Calibrate thresholds against real analyst feedback during the pilot. Do not hardcode thresholds — make them configurable per-analyst from day one.

---

### Pitfall 5: PACER/CourtListener Password Rotation Breaking Docket Ingestion Silently

**What goes wrong:**
As of 2025, the federal judiciary requires PACER accounts to rotate passwords every 180 days. The CourtListener RECAP Fetch API uses stored PACER credentials. When the password expires, the docket ingestion silently stops returning new court filings — but no error surfaces to the analyst because the system shows "no new events" rather than "authentication failed." The deal card shows no court activity for weeks on a live merger challenge.

**Why it happens:**
Credential rotation in a background job is easy to forget when the failure mode is silent. The PACER API returns auth errors, the ingestion worker catches the exception and moves on, no alert fires. Developers test against non-rotating credentials in dev and never encounter this.

**How to avoid:**
Implement a PACER credential health check that runs daily — attempt a known-good request and alert on auth failure immediately. Store PACER credentials in a secrets manager with an expiry date alert set 30 days before the 180-day mark. Surface ingestion health status on the Settings > Integrations page so analysts can see "CourtListener: Last successful sync 3 days ago" — any gap > 24 hours should appear as a warning.

**Warning signs:**
- CourtListener "last synced" timestamp is more than 24 hours old in the settings page
- A known active litigation case shows no new docket entries for several days
- PACER API returns 401 or redirect-to-login responses in the ingestion logs

**Phase to address:**
Phase 1 (CourtListener Integration) — Build credential health monitoring alongside the integration, not as a later enhancement. Dead integrations that look alive are worse than integrations that loudly fail.

---

### Pitfall 6: FTC/DOJ Scraping Fragility and HTML Structure Changes

**What goes wrong:**
The FTC and DOJ Antitrust Division do not provide clean APIs. Scraping depends on specific HTML structure (CSS selectors, table layouts, press release URL patterns). When FTC redesigns its website (which it does every few years) or changes URL patterns, all FTC/DOJ ingestion breaks. Because this is a background job, the break may go unnoticed for days or weeks.

**Why it happens:**
Developers build a working scraper against the current HTML structure and ship it as "done." Website maintenance causes breakage. Unlike EDGAR (which has an API with versioned endpoints), FTC/DOJ has no stable machine-readable feed.

**How to avoid:**
Use RSS feeds where available (FTC publishes press release RSS). For enforcement actions that require HTML scraping, implement a canary test: after each scrape run, assert that at least N items were returned and at least one item has a date within the past 7 days. If the canary fails, fire an alert to the engineering Slack immediately. Abstract all FTC/DOJ selectors into a single configuration module so fixes require changing one file, not hunting through code. Write integration tests that replay a known historical response to verify parsing still works.

**Warning signs:**
- FTC/DOJ event count drops to 0 for more than 3 days
- HTML responses contain "We've updated our website" banners
- Scraper returns items from months ago because pagination breaks

**Phase to address:**
Phase 1 (FTC/DOJ Integration) — Build the canary monitor alongside the scraper. Mark FTC/DOJ ingestion as "fragile" in the codebase with prominent comments and a link to the fragility runbook.

---

### Pitfall 7: LLM Output Drift Breaking Structured Extraction Pipelines

**What goes wrong:**
A clause extraction pipeline that worked correctly for 6 months starts returning malformed JSON or different field names after an LLM provider silently updates their model. Research from November 2025 documents that GPT-class models at temperature=0 achieve only 12.5% output consistency across 1000 identical runs, and Anthropic reported a production incident in September 2025 where Claude produced random anomalies due to a miscompiled sampling algorithm. In a financial compliance context, this means extraction outputs that feed deal card data silently corrupt.

**Why it happens:**
LLM providers update models without notice (e.g., `gpt-4o` pointing to a newer version silently). Developers pin to an alias, not a specific model version. Structured extraction pipelines built for one model version break on the next.

**How to avoid:**
Always pin to specific model version IDs (e.g., `gpt-4o-2024-11-20`, not `gpt-4o`). Run a nightly regression test against 20 known-good filings that have verified extraction outputs — any change in structured output fails the CI. Use Zod or JSON Schema validation on all LLM outputs; reject malformed responses and retry with the previous model version. Implement a model rollback procedure: keep the previous model version in config, ready to swap.

**Warning signs:**
- Extraction output for the same filing produces different values on different days
- JSON parsing errors spiking in ingestion logs
- Deal cards showing `null` for fields that were populated yesterday
- Output fields with unexpected new keys or missing expected keys

**Phase to address:**
Phase 2 (LangExtract Pipeline) — Pin all model versions before the first production deployment. Add the nightly regression as a Day 1 requirement, not a post-launch improvement.

---

### Pitfall 8: Multi-Tenant Data Leakage via Missing Row-Level Security

**What goes wrong:**
A pilot client (Firm A) can see deal watchlist data, alert rules, or event annotations belonging to Firm B. In a hedge fund context, firm B's watchlist is their trading strategy — this is a catastrophic privacy breach. CVE-2024-10976 demonstrated that PostgreSQL row-level security (RLS) policies can fail when user ID changes are not properly propagated, and connection pool contamination can bypass RLS silently.

**Why it happens:**
Row-level security is configured at the database layer but bypassed if connection pooling reuses sessions with wrong user context, or if a single backend query uses a service-role key that bypasses RLS entirely. Developers test with a single user and never catch cross-tenant access.

**How to avoid:**
Every query touching tenant-specific data must include a `firm_id` (or equivalent) column filter, enforced at the query builder layer — never relying solely on Supabase RLS. Write an automated test that creates two firms, inserts data for each, and asserts neither can access the other's data using all available API endpoints. Use Supabase's RLS with `anon` key for all frontend requests; never expose the `service_role` key to frontend code. Run the data isolation test in CI as a blocking gate.

**Warning signs:**
- A query returns data across multiple `firm_id` values when only one firm's session is active
- Backend logs show service-role key being used for data reads (should only be used for migrations)
- Developers testing with hardcoded IDs rather than session-scoped context

**Phase to address:**
Phase 3 (Authentication & Multi-tenancy) — Before any pilot client onboarding. Write the data isolation test before onboarding Pilot Client 1. This is non-negotiable.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded materiality thresholds (70/50) | Ships fast, simpler code | Can't adapt to analyst feedback, alert fatigue compounds | Never — make thresholds configurable from Day 1 |
| Direct HTML scraping of FTC/DOJ without canary monitor | Fast integration | Silent breakage for days, analyst trust erodes | Never — canary monitor costs 1 hour, saves weeks of debugging |
| Using LLM alias (`gpt-4o`) instead of version-pinned ID | Less deployment config | Pipeline breaks silently on provider model updates | Never — pinning is free and essential |
| Single-tenant architecture "for now" | Faster initial build | Retrofitting multi-tenancy into existing queries is an N-week rewrite | Never — build `firm_id` scoping into the schema from Day 0 |
| In-process EDGAR polling (no queue) | Simpler architecture | Polling worker crash loses all in-flight events, no replay | Acceptable for MVP if idempotent re-poll is implemented |
| Skipping EDGAR user-agent setup | One less config step | IP block takes down ingestion for all tenants | Never |
| Storing PACER credentials in environment variable without expiry alerting | Simple credential management | Silent ingestion failure at 180-day mark | Acceptable if a calendar reminder is set for 150 days — prefer secrets manager |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SEC EDGAR | Using `master.idx` flat files for production polling (documented data corruption issues) | Use the EDGAR submissions API (`/submissions/{CIK}.json`) or EFTS full-text search API for reliable, structured data |
| SEC EDGAR | Polling all filings without filtering by form type | Filter to `8-K`, `S-4`, `DEFM14A`, `13D`, `13G` at query time to reduce volume 90%+ |
| CourtListener | Setting `Authorization: <token>` without the word `Token` prefix | Must be `Authorization: Token <your_token>` — missing the prefix causes silent anonymous-user rate limiting (5000 req/hr as authed vs. much lower as anon) |
| CourtListener PACER | Not handling the 180-day PACER password rotation | Implement a credential health check with 30-day advance warning and a documented rotation runbook |
| FTC/DOJ | Scraping without rate limiting | Add 1-2 second delays between requests; government sites may block scrapers that hit too fast |
| FTC/DOJ | Assuming HTML structure is stable | All selectors in one config file; canary assert on item count after each run |
| LLM extraction | Using `temperature > 0` for structured JSON extraction | Set `temperature=0` for all structured extraction tasks; only use temperature for prose summarization |
| Market Data API | Using daily close prices for spread computation instead of real-time | Spread = (target price - deal price) / deal price requires live bid/ask, not close prices |
| Slack webhooks | Synchronous webhook delivery in the alert hot path | Queue webhook deliveries with retry + dead-letter queue; never block the main alert flow on a third-party delivery call |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| LLM extraction in the ingestion hot path | New filings take 30-120 seconds to appear on the deal card because extraction blocks the pipeline | Decouple: ingest filing raw → queue for async extraction → surface filing immediately, extraction data populates asynchronously | From Day 1 with >5 concurrent filings |
| Full EDGAR backfill without pagination/checkpointing | Memory spikes, worker crashes, all progress lost on restart | Use cursor-based pagination with a checkpoint table; never backfill without restart-safe progress tracking | First time you run a backfill on >1000 filings |
| Polling EDGAR every minute for new filings | 1440 requests/day per CIK watched — at 100 deals that's 144,000 requests/day | Use EDGAR's EFTS real-time index (updated every 10 minutes); poll once every 15 minutes, not every minute | Immediately — puts you over SEC's "equitable access" threshold |
| Fetching raw S-4/DEFM14A filing in real-time for every user view | 200MB+ filings cause 30-second page loads | Pre-extract text and store in the database on ingest; never serve raw filing content to the frontend | First time a user opens a deal card with a large filing |
| Materializing all event data in a single Inbox query | Query time grows linearly with total event count across all deals | Use cursor-based pagination + indexed queries on `(firm_id, materiality_score, created_at DESC)` | Around 10,000 events per firm |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Supabase `service_role` key to the frontend or in client-side code | Full database access bypass — any user can read/write all firm data | Service role key only in backend/server-side code; frontend uses only the `anon` key with RLS enforced |
| Logging raw LLM prompts containing filing text with PII | Filing documents can contain personal information (shareholder lists, executive compensation details) | Scrub PII from logs; use structured logging that captures metadata (filing ID, model, latency) not raw content |
| No API key scoping for the data export API | A leaked API key exposes all firm data | API keys should be scoped to read-only, specific deal sets, or specific data types; implement key revocation |
| Storing PACER credentials in plaintext in the database | PACER account compromise enables judicial system abuse charges and API bans | Use Supabase Vault or a secrets manager; never store credentials in the `users` table or any application table |
| Trusting LLM extraction output without schema validation | Malicious or malformed filing text could inject unexpected values | Validate all LLM-extracted data through a strict Zod schema before persisting; treat LLM output as untrusted user input |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "0 events" when ingestion is broken vs. when there are genuinely no events | Analyst assumes all is quiet; misses active litigation for weeks | Show ingestion health prominently: "Last sync: 3 hours ago" warning badge; "No events" only when sync is healthy and recent |
| Displaying LLM-extracted clause values without source citation | Analyst can't verify; doesn't trust the platform; goes back to reading raw filings | Every extracted field links to the verbatim source in the filing — this is what converts analysts from skeptics to believers |
| Sending all alert types through the same Slack channel | Every routine filing looks identical to a critical FTC action; channel becomes noise | Use separate channels for CRITICAL vs. WARNING; format alerts with clear visual hierarchy (bold deal name, materiality score, one-line summary) |
| Showing deal spreads from stale market data without staleness indicator | Analyst makes P&L calculation on hours-old spread; incorrect sizing | Always show data age on spread displays: "Last updated: 14 min ago"; color-code staleness (green < 5 min, yellow 5-30 min, red > 30 min) |
| No way for analyst to mark an event as "reviewed" or "not material" | Analyst sees the same 40 docket entries every time they open Inbox; can't distinguish new from reviewed | Read/unread state is table stakes; also need "mark not material" to suppress from future alerts and tune materiality scoring |

---

## "Looks Done But Isn't" Checklist

- [ ] **EDGAR ingestion:** Verify the user-agent header is set and includes company name + contact email — fetch `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany` and check for 200 response
- [ ] **EDGAR timezone:** Verify a known filing's `accepted_at` in the database matches the correct UTC conversion of its Eastern Time timestamp — off-by-1 errors appear correct locally
- [ ] **CourtListener auth:** Verify the `Authorization` header includes the word `Token` before the credential — requests without it silently fall back to anonymous rate limits
- [ ] **PACER 180-day rotation:** Verify a credential expiry alert is scheduled and the rotation runbook exists — first rotation will happen 180 days after launch with no warning otherwise
- [ ] **LLM clause extraction:** Verify every extracted field stores a `source_citation.verbatim_excerpt` and that a validator checks the excerpt exists in the source document
- [ ] **Multi-tenant isolation:** Verify the cross-tenant data isolation test passes before onboarding any pilot client — one query with wrong `firm_id` scoping is a catastrophic breach
- [ ] **Alert thresholds:** Verify alerts are configurable per-analyst and that INFO-level events (<50) never trigger email or Slack — only inbox
- [ ] **Ingestion health indicator:** Verify the Settings > Integrations page shows per-source last-sync time and surface warnings for gaps > 24 hours
- [ ] **FTC/DOJ canary:** Verify the canary assertion fires an engineering alert when item count drops to 0 — not just logged
- [ ] **LLM model pinning:** Verify all LLM calls use version-specific model IDs, not aliases — `grep -r "gpt-4o\"" --include="*.ts"` should return 0 results

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| EDGAR IP block | LOW | Wait 10 minutes for block to lift. Immediately fix user-agent and rate limiter. Run backfill for the missed window. |
| PACER credential expiration | MEDIUM | Rotate PACER password. Update secrets manager. Restart CourtListener ingestion worker. Run backfill from last-successful-sync timestamp. Alert pilot clients to expected gap. |
| FTC/DOJ scraper break | MEDIUM | Fix HTML selectors. Re-run scraper with lookback window of 7 days. Validate output manually against FTC website. Add canary test. |
| LLM model drift corrupting clause extractions | HIGH | Identify the model version change date. Roll back to pinned previous model version. Re-extract all filings processed after the drift date. Notify analysts of data correction. |
| Multi-tenant data leakage | CRITICAL | Immediately revoke all API keys and sessions. Audit query logs to identify what data was exposed, to whom, and for how long. Notify affected firms. Fix the RLS policy. Issue public incident report. This is an existential risk for the business. |
| Alert fatigue reaching point of muting | MEDIUM | Audit per-analyst alert volume over past 30 days. Raise CRITICAL threshold for affected analysts. Introduce daily digest for WARNING events. Direct call with affected analyst to rebuild trust. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| EDGAR IP block (missing user agent + rate limit) | Phase 1: EDGAR Ingestion | Test: concurrent requests from 2 workers stay under 10 req/sec combined; verify user-agent in HTTP logs |
| EDGAR timezone confusion | Phase 1: EDGAR Ingestion | Unit test: known filing timestamp stored as correct UTC value |
| LLM hallucination in clause extraction | Phase 2: LangExtract Pipeline | QA: spot-check 50 extractions against source documents; citation validator in CI |
| Alert fatigue | Phase 3: Alerts & Digests | Pilot: track per-analyst Slack open rates weekly; threshold for concern is < 40% open rate in week 2 |
| PACER password rotation | Phase 1: CourtListener Integration | Health check visible on Settings > Integrations; 30-day advance warning tested in CI with mocked expiry |
| FTC/DOJ scraper fragility | Phase 1: FTC/DOJ Integration | Canary test runs in CI on every deploy; alert fires on item-count drop to 0 |
| LLM output drift | Phase 2: LangExtract Pipeline | Nightly regression: 20 filings with verified outputs; any delta fails CI |
| Multi-tenant data leakage | Phase 3: Auth & Multi-tenancy | Cross-tenant isolation test is a blocking CI gate before any pilot client onboarding |
| Stale market data displayed without indicator | Phase 4: Market Data Integration | UI test: verify data-age badge renders and shows red for data > 30 min old |
| Silent ingestion failure | All ingestion phases | Integration health dashboard built in Phase 1; each integration exposes last-sync timestamp and error state |

---

## Sources

- [SEC.gov — Accessing EDGAR Data (rate limits, user agent policy)](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data) — HIGH confidence (official source)
- [SEC.gov — Rate Control Limits on EDGAR (10 req/sec, IP block policy)](https://www.sec.gov/filergroup/announcements-old/new-rate-control-limits) — HIGH confidence (official source)
- [CourtListener REST API v4.3 — Authentication, rate limits (5000 req/hr)](https://www.courtlistener.com/help/api/rest/) — HIGH confidence (official source)
- [CourtListener — PACER Authentication API 2025 (180-day password rotation)](https://pacer.uscourts.gov/sites/default/files/files/PACER%20Authentication%20API-2025.pdf) — HIGH confidence (official source)
- [CourtListener GitHub — Rate limiting discussion (token auth vs. anon)](https://github.com/freelawproject/courtlistener/discussions/1497) — MEDIUM confidence (community, verified against official docs)
- [Stanford Legal RAG Hallucinations Study 2025 — 17-33% hallucination rate even in specialized legal tools](https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf) — HIGH confidence (peer-reviewed, 2025)
- [arXiv: LLM Output Drift in Financial Workflows (November 2025) — 12.5% consistency for large models](https://arxiv.org/abs/2511.07585) — HIGH confidence (peer-reviewed, 2025)
- [arXiv: Hallucination Detection and Mitigation in LLMs (2025)](https://arxiv.org/pdf/2601.09929) — HIGH confidence (peer-reviewed)
- [FACTUM: Citation Hallucination Detection for RAG](https://arxiv.org/pdf/2601.05866) — MEDIUM confidence (arXiv preprint, 2025)
- [Multi-Tenant Leakage: When Row-Level Security Fails in SaaS (Medium, 2026)](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c) — MEDIUM confidence (CVE-referenced, independently verifiable)
- [Tenant Isolation in Multi-Tenant Systems — Security Boulevard (2025)](https://securityboulevard.com/2025/12/tenant-isolation-in-multi-tenant-systems-architecture-identity-and-security/) — MEDIUM confidence
- [Alert Fatigue — Dropzone AI (statistics on alert ignore rates)](https://www.dropzone.ai/glossary/alert-fatigue-in-cybersecurity-definition-causes-modern-solutions-5tz9b) — MEDIUM confidence (industry source, statistics cited widely)
- [Building Idempotent Data Pipelines — Towards Data Engineering (idempotency, deduplication patterns)](https://medium.com/towards-data-engineering/building-idempotent-data-pipelines-a-practical-guide-to-reliability-at-scale-2afc1dcb7251) — MEDIUM confidence
- [Idempotency and ordering in event-driven systems — CockroachLabs](https://www.cockroachlabs.com/blog/idempotency-and-ordering-in-event-driven-systems/) — MEDIUM confidence

---

*Pitfalls research for: M&A Intelligence Platform (j16z)*
*Researched: 2026-02-25*
