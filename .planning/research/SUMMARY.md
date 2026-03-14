# Project Research Summary

**Project:** j16z — M&A Intelligence Platform
**Domain:** M&A Deal Intelligence — LLM extraction pipeline, regulatory data ingestion, real-time alerting for merger-arb hedge funds
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH

## Executive Summary

J16z is a purpose-built M&A intelligence terminal targeting merger-arbitrage and event-driven hedge fund desks. The product's core proposition is collapsing a fragmented analyst workflow — currently 5-8 browser tabs spanning Bloomberg, EDGAR, PACER, FTC/DOJ, and law firm newsletters — into a single materiality-scored event feed with LLM-extracted structured deal terms. Experts in this space build these platforms as two-stage data pipelines: raw document ingestion (EDGAR, CourtListener, FTC/DOJ RSS) followed by asynchronous LLM extraction into structured database entities, then served via a REST API to a React frontend. The frontend shell and navigation redesign are already built; the entire backend must be built from scratch as a separate `apps/api/` workspace within the existing pnpm monorepo.

The recommended approach is to build incrementally along the critical dependency chain: database schema and Hono API skeleton first, then EDGAR ingestion as the highest-value and best-documented external source, then LLM clause extraction as the primary differentiator, then alert delivery, and then secondary sources (CourtListener, FTC/DOJ). The architecture must separate ingestion (pollers) from extraction (LLM workers) into distinct BullMQ jobs from day one — synchronous LLM extraction in the poller is the single most common architecture mistake and causes cascading failures. Auth and multi-tenant data isolation must be built before any pilot client is onboarded.

The three existential risks are: (1) LLM hallucination on clause extractions — analysts will trade on wrong termination fees; prevention requires mandatory verbatim citation verification on every extracted field. (2) Multi-tenant data leakage — one hedge fund seeing another's watchlist is an existential breach; prevention requires firm_id scoping at the query layer plus a blocking CI test before any pilot onboarding. (3) Alert fatigue — if analysts mute Slack alerts in the first two weeks, the alert channel is dead; prevention requires strict channel-level materiality gates enforced from the first day of pilot, not calibrated later.

---

## Key Findings

### Recommended Stack

The backend lives entirely in TypeScript within the existing pnpm monorepo (`apps/api/`), avoiding any language boundary with the frontend's type system. Hono is the HTTP framework: lightweight (~12kB), TypeScript-first, Web Standards API, and 3x the throughput of Express with no migration cost. Drizzle ORM connects to the existing Supabase PostgreSQL instance — ~7kB bundle, no binary engine, schema defined in plain TypeScript so diffs are PR-reviewable, and Supabase documents it as a first-class client. BullMQ backed by Upstash Redis handles all job queuing and cron scheduling (ingestion pollers, extraction workers, alert evaluation, digest delivery) — its built-in rate limiting is critical for staying inside EDGAR's and CourtListener's API rate envelopes. Claude 3.5 Sonnet via `@anthropic-ai/sdk` and LangChain.js handles LLM extraction: 200K context window handles long S-4 and DEFM14A filings that exceed GPT-4o's 128K limit, and Claude's structured output reliability is better documented for legal clause extraction. Resend with react-email delivers transactional alerts and digests as JSX templates matching the existing React/Tailwind stack.

**Core technologies:**
- **Hono 4.12.x**: HTTP API server (`apps/api/`) — TypeScript-first, multi-runtime portable, 3x Express throughput
- **Drizzle ORM 0.45.x + `postgres` 3.x**: Type-safe Supabase PostgreSQL access — plain TS schema, no binary engine, ~7kB bundle
- **BullMQ 5.70.x + Upstash Redis 7.x**: Job queue and cron scheduler — built-in rate limiting essential for API compliance
- **Claude 3.5 Sonnet via `@anthropic-ai/sdk` 0.78.x + LangChain.js 1.x**: LLM extraction pipeline — 200K context, superior legal clause accuracy, `.withStructuredOutput()` enforces Zod schemas
- **Resend 6.9.x + react-email 5.2.x**: Transactional email alerts and digests — React 19 + Tailwind 4 compatible
- **`@slack/webhook` 7.0.x**: CRITICAL/WARNING alert delivery to analyst Slack channels
- **`rss-parser` 3.x + `@us-legal-tools/courtlistener-sdk`**: RSS ingestion (FTC/DOJ) and CourtListener REST/webhook integration
- **Zod 4.x**: Shared validation schemas between frontend and backend; enforced on all LLM extraction outputs
- **Pino 9.x**: Structured logging with deal/job context fields; `pino-pretty` for local dev

See `.planning/research/STACK.md` for full alternatives analysis and version compatibility matrix.

### Expected Features

Research confirms j16z's planned features map directly to what merger-arb analysts expect and what no single competitor provides. Bloomberg shows filings as PDFs requiring manual clause reading; Dealreporter curates manually at high cost; neither scores event materiality algorithmically; none unifies EDGAR + CourtListener + FTC/DOJ in a single feed. The combination of automated clause extraction plus unified source aggregation plus materiality scoring is the structural moat.

**Must have — v1 (pilot-ready):**
- Supabase auth + team isolation — blocks all pilot onboarding; non-negotiable prerequisite
- SEC EDGAR filing ingestion (8-K, S-4, DEFM14A, 13D) — authoritative source; nothing else works without it
- LLM clause extraction (termination fees, MAE clauses, regulatory covenants) — the primary differentiator; justifies switching from Bloomberg
- Deal board with real data — populated from ingested filings, not mock data
- Email alert delivery — analysts need push notification; alert rule logic exists but delivery is unbuilt
- Spread display (polled, not streaming) — required for position assessment; 5-minute polling is good enough for MVP
- Outside date countdown / urgency indicator — trivially computable but high daily analyst value
- CourtListener litigation ingestion — second most important source; merger challenges and shareholder suits
- Inbox with real materiality-scored events — the differentiated UX pattern; scoring logic exists but has nothing to score

**Should have — v1.x (after pilot validation):**
- FTC/DOJ antitrust integration — adds regulatory event coverage after EDGAR/CourtListener are stable
- Slack alert delivery — most desks use Slack as primary channel; add after email works
- AI event summaries — 2-3 sentence LLM summaries of filings; accelerates time-to-comprehension
- Deal spread chart with event overlay — requires timeseries spread data; analytical depth
- Daily email digest — morning summary of overnight activity; natural after per-event alerts work
- RSS/news feed ingestion — law firm alerts and specialist feeds; lower priority than primary data sources
- CSV export via API — firms want to pipe data into internal models

**Defer — v2+:**
- Deal memo / research draft scaffolding — high value but requires stable extraction pipeline and rich text editor
- Webhook integrations — after API is stable and firms request it
- API key management for external consumption
- Break probability display (analyst-entered p_close estimates only; no ML model)

**Anti-features (do not build):**
- Real-time price streaming — market data vendor cost disproportionate for MVP; polling every 5 min is sufficient
- AI analyst chat ("ask anything") — hallucination risk on deal-critical facts is unacceptable for trading decisions
- Self-improving materiality ML — insufficient event history at pilot scale; use static scoring with analyst override

See `.planning/research/FEATURES.md` for full competitor analysis and feature dependency graph.

### Architecture Approach

The architecture follows a three-layer pipeline pattern: ingestion (pollers write raw documents to `raw_filings` / `raw_docket_entries` tables), extraction (BullMQ workers pull raw docs, chunk, call LLM via Zod-constrained `generateObject()`, and persist structured entities with pre-computed materiality scores), and delivery (REST API served by Hono to the frontend, with SSE for live inbox updates and BullMQ alert workers for email/Slack). The frontend `src/lib/api.ts` abstraction already supports flipping from mock data to real backend via environment variable — no frontend restructuring is needed to connect. Scoring must move from client-side recalculation to stored DB columns computed at extraction time, enabling inbox sorting/filtering server-side and consistent score use in alert evaluation.

**Major components:**
1. **BullMQ Pollers** (cron) — Fetch new filings/dockets on schedule (EDGAR: 15 min, CourtListener: webhook + 30 min fallback, FTC/DOJ RSS: 60 min); deduplicate by source ID; write raw docs to DB; enqueue extraction jobs
2. **Extraction Worker** (BullMQ) — Chunk large docs; call Claude via `generateObject()` with Zod schemas; validate verbatim citations; persist `events`, `clauses`, `deals`; score at insertion; publish to Redis for SSE
3. **Alert Worker** (BullMQ) — Evaluate `AlertRules` per user/deal against scored events; route: score >70 → email + Slack, 50-70 → Slack only, <50 → inbox only; enqueue digest jobs
4. **Hono REST API** — Serve structured data; verify Supabase JWTs; expose `GET /sse/events` endpoint for live inbox updates via Redis pub/sub
5. **Digest Scheduler** (BullMQ cron) — Daily at 07:00 UTC; aggregate events by severity; render react-email template; deliver via Resend
6. **PostgreSQL via Drizzle** — Single source of truth; `firm_id` scoping on every tenant-specific table; pre-computed `materiality_score` and `severity` columns on `events`

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, anti-patterns, and scaling considerations.

### Critical Pitfalls

1. **EDGAR IP block from missing/incorrect User-Agent** — Set `User-Agent: j16z/1.0 (contact@j16z.com)` per SEC policy; build a centralized EDGAR HTTP client enforcing this and a distributed token bucket (max 10 req/sec) before any production deployment; an IP block takes down ingestion for all tenants simultaneously.

2. **LLM hallucination in clause extraction** — Every extracted field must store `source_citation.verbatim_excerpt`; a post-extraction validator checks the excerpt exists in the source document before persistence; surface verbatim quotes in the UI to convert analyst skeptics into believers. A 17-33% hallucination rate is documented even for specialized legal AI tools.

3. **Multi-tenant data leakage via missing Row-Level Security** — Apply `firm_id` filter at the query builder layer (Drizzle `WHERE firm_id = $1`), not only at the Supabase RLS layer; write a cross-tenant isolation test as a blocking CI gate; run before onboarding Pilot Client 1. One query with wrong scoping is an existential breach for a hedge fund product.

4. **Alert fatigue destroying the notification channel** — Enforce channel-level materiality gates from day one (email ≥70, Slack ≥50, inbox-only <50); never bypass gates during testing; build per-analyst "mark not material" feedback in Phase 1 so adjustment data accumulates from day one. Research shows 40% of alerts are never investigated when systems over-trigger.

5. **LLM output drift breaking extraction pipelines silently** — Pin all LLM calls to specific model version IDs (e.g., `claude-3-5-sonnet-20241022`, not `claude-3-5-sonnet`); run nightly regression against 20 known-good filings with verified expected outputs; fail CI on any extraction delta. LLM providers update aliases without notice.

6. **PACER password rotation silently killing CourtListener ingestion** — Build a daily PACER credential health check alongside the CourtListener integration; surface last-sync timestamps prominently in Settings > Integrations; alert engineering team on any gap > 24 hours. Credentials expire after 180 days; silent failure leaves deal cards showing no court activity during active merger litigation.

See `.planning/research/PITFALLS.md` for full pitfall analysis including FTC/DOJ scraper fragility, EDGAR timezone confusion, performance traps, and a "looks done but isn't" verification checklist.

---

## Implications for Roadmap

Based on combined research, the dependency chain is clear and non-negotiable: database schema blocks everything; auth blocks pilot onboarding; EDGAR ingestion blocks LLM extraction; extraction blocks alert evaluation; alert evaluation blocks email/Slack delivery. The suggested phase structure follows these hard dependencies while grouping related concerns.

### Phase 1: Backend Foundation — Database, API Skeleton, Auth

**Rationale:** Everything downstream requires a running database schema with `firm_id` scoping, a Hono API that can verify Supabase JWTs, and the frontend flipped from mock data to real API responses. This is the unblocking phase — without it, no real data appears anywhere.
**Delivers:** `apps/api/` Hono service with Drizzle schema (all domain tables with `firm_id`), auth middleware, skeleton endpoints returning empty arrays from real DB, frontend connected to real backend via `NEXT_PUBLIC_USE_MOCK_DATA=false`.
**Addresses:** Supabase auth + team isolation (P1 table stakes), deal board with real data (prerequisite).
**Avoids:** Multi-tenant data leakage pitfall — `firm_id` scoping must be in the schema from Day 0, not retrofitted. Cross-tenant isolation test written before any pilot onboarding.

### Phase 2: SEC EDGAR Ingestion Pipeline

**Rationale:** EDGAR is the authoritative source, the best-documented external API, and the prerequisite for LLM extraction. Building and proving the ingestion architecture (BullMQ poller → raw store → extraction queue) with EDGAR validates the pattern for all subsequent sources. EDGAR is also where the rate-limiting and user-agent pitfalls live.
**Delivers:** `edgar-poller` BullMQ cron job (15-min interval); raw filing storage for 8-K, S-4, DEFM14A, 13D; deduplication by accession number; extraction job enqueue; deal board showing real filing metadata even before LLM extraction runs.
**Uses:** BullMQ + Upstash Redis, Drizzle ORM, `rss-parser` / native `fetch` against EDGAR REST API.
**Implements:** Two-stage ingestion pattern (fetch → async extract decoupled).
**Avoids:** EDGAR IP block pitfall — centralized HTTP client with `User-Agent` header and 10 req/sec token bucket built before first request. EDGAR timezone pitfall — timestamps converted to UTC at ingest, unit-tested against known filing values.

### Phase 3: LLM Extraction Pipeline (LangExtract)

**Rationale:** This is the primary differentiator and the phase where the most can go wrong. Building it after EDGAR ingestion provides real filings to extract from and validates the pipeline with actual data. Must include citation verification and Zod schema enforcement from the first commit, not as post-launch polish.
**Delivers:** `extraction-worker` BullMQ worker; Zod schemas for `ExtractedClause` (termination fee, reverse termination fee, MAE scope, regulatory efforts covenant, financing condition); verbatim citation storage and post-extraction validation; materiality scoring at insertion time (porting `severity-scoring.ts` and `materiality-scoring.ts` from frontend); deal cards populated with real structured terms; Inbox showing real scored events.
**Uses:** `@anthropic-ai/sdk`, `@langchain/core`, `@langchain/anthropic`, `@langchain/community` (PDF loader, chunker).
**Avoids:** LLM hallucination pitfall — citation validator in CI from day one; no extracted clause surfaced without verbatim quote. LLM output drift pitfall — model version pinned (not aliased) before first production deployment; nightly regression test against 20 known-good filings.

### Phase 4: CourtListener Litigation Ingestion

**Rationale:** The second most important data source after EDGAR. Building after LangExtract means the proven ingestion→extraction pattern applies directly. CourtListener's webhook support makes this more efficient than EDGAR polling.
**Delivers:** CourtListener webhook endpoint (`/webhooks/courtlistener`); fallback polling for initial discovery (30-min interval); litigation events in the Inbox with materiality scores; deal cards showing active merger challenges and shareholder suits.
**Uses:** `@us-legal-tools/courtlistener-sdk`, BullMQ, Drizzle.
**Avoids:** PACER password rotation pitfall — daily credential health check with 30-day advance expiry warning built alongside the integration, not later. CourtListener polling pitfall — webhooks as primary; polling as discovery fallback only (avoids burning 5K req/hr quota).

### Phase 5: Alert Delivery — Email and Slack

**Rationale:** Alert rule logic and materiality scoring are already built in the frontend. Alert delivery is now unblocked by the existence of real scored events in the database. Build email first (simpler, no OAuth), then Slack.
**Delivers:** `alert-worker` BullMQ worker evaluating `AlertRules` against scored events; Resend email delivery for CRITICAL events (score ≥70); Slack incoming webhook delivery for WARNING+ events (score ≥50); inbox-only for INFO events (<50); `notification_log` table for deduplication and audit; per-analyst alert threshold configuration in Settings.
**Uses:** Resend + react-email, `@slack/webhook`.
**Avoids:** Alert fatigue pitfall — channel-level gates enforced from the first alert; per-analyst "mark not material" feedback built into the alert worker from day one.

### Phase 6: FTC/DOJ Antitrust Integration + RSS

**Rationale:** Third data source priority after EDGAR and CourtListener. FTC/DOJ primarily via RSS feeds (low fragility path); HTML scraping for enforcement actions that require it. RSS ingestion also enables the watchlist-attached news feeds feature.
**Delivers:** `ftc-doj-poller` (RSS + selective HTML scraping); FTC enforcement actions and HSR second requests in the Inbox; canary monitor alerting engineering on item-count drops; `rss-poller` for watchlist-attached law firm newsletters and specialist feeds.
**Uses:** `rss-parser`, `@langchain/community` (CheerioWebBaseLoader for HTML), BullMQ.
**Avoids:** FTC/DOJ scraper fragility pitfall — canary assertion runs in CI on every deploy; all HTML selectors in one configuration module; integration health dashboard shows last-sync per source.

### Phase 7: Email Digest + Market Data + Spread Display

**Rationale:** Daily digest is the last push delivery channel; natural to build after per-event alerts are calibrated. Spread display requires a market data API contract decision (Polygon.io or IEX Cloud) which may need an independent procurement step. These can run in parallel if resourced separately.
**Delivers:** Daily digest BullMQ cron (07:00 UTC); react-email digest template aggregating CRITICAL/WARNING events overnight; spread polling worker (every 5 min); spread display with data-age indicator on deal board and deal cards; outside date urgency indicators.
**Avoids:** Stale market data pitfall — data-age badge on every spread display, color-coded (green <5 min, yellow 5-30 min, red >30 min).

### Phase 8: AI Event Summaries + CSV Export + v1.x Polish

**Rationale:** Once the core data pipeline and alerts are proven with pilot clients, add the features that increase depth of value. AI summaries accelerate analyst comprehension; CSV export enables integration with internal models; both are lower-risk add-ons to a stable pipeline.
**Delivers:** LLM-generated 2-3 sentence event summaries on Inbox cards; CSV export endpoint; deal spread chart with event overlay (requires timeseries spread data from Phase 7); API endpoint documentation via `@hono/zod-openapi`.
**Uses:** Claude for summarization (can route lower-stakes summaries to Gemini Flash via `@google/genai` for cost savings), LangChain.js.

### Phase Ordering Rationale

- **Phases 1-3 are a strict dependency chain** — schema before API, API before ingestion, ingestion before extraction. No parallelization possible.
- **Phase 4 (CourtListener) can overlap with Phase 3** — once the extraction pipeline pattern is proven and stable, a second developer can build CourtListener ingestion using the same pattern.
- **Phase 5 (Alerts) is unblocked by Phase 3** — alert workers need scored events in the DB; they don't depend on all ingestion sources being live.
- **Phase 6 (FTC/DOJ) can run in parallel with Phase 5** — independent data source, independent poller, no cross-dependency.
- **Phase 7 (Digests + Market Data) requires Phase 5** — digest builds on alert delivery infrastructure; market data is independent.
- **Multi-tenant isolation testing must gate pilot onboarding** regardless of which phase it falls in — this is a hard gating condition, not a feature.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (LLM Extraction):** The optimal chunking strategy for S-4 and DEFM14A filings (which can exceed 400 pages) needs validation against actual filing structure. Section boundary detection for legal documents is non-trivial. Recommend running extraction experiments on 5-10 real filings before committing to the production chunking design.
- **Phase 7 (Market Data):** Market data vendor selection (Polygon.io vs IEX Cloud vs Alpha Vantage) requires pricing and data quality evaluation. Implied consideration computation (offer price minus current price, adjusting for CVR terms) has edge cases for mixed-consideration deals. Needs a procurement decision and API-specific research before implementation.
- **Phase 5 (Slack OAuth):** If teams need to configure their own Slack workspace integration (vs a shared incoming webhook URL), OAuth app setup is required. The incoming webhook pattern avoids OAuth but limits configuration options. Needs UX decision before implementation.

Phases with well-documented patterns (skip research-phase):

- **Phase 1 (Backend Foundation):** Hono + Drizzle + Supabase is a well-documented combination with official tutorials. Standard patterns apply.
- **Phase 2 (EDGAR Ingestion):** SEC EDGAR API is fully documented with official developer resources. BullMQ patterns for polling jobs are standard.
- **Phase 6 (RSS Ingestion):** `rss-parser` is a commodity library. FTC/DOJ RSS URLs are confirmed and stable.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major package versions confirmed via npm. Official documentation verified for Hono, Drizzle+Supabase, BullMQ, LangChain.js 1.x. Multiple community sources agree on ORM and framework recommendations. |
| Features | MEDIUM-HIGH | Table stakes verified against live competitor tools (Bloomberg, InsideArbitrage, AlphaSense). LLM clause extraction value proposition supported by Harvey.ai and Mayer Brown practitioner sources. Analyst workflow priorities from practitioner guides. |
| Architecture | MEDIUM-HIGH | Two-stage ingestion and Zod-first extraction are official-docs-backed patterns (Vercel AI SDK, BullMQ, Drizzle). SSE vs WebSocket decision supported by multiple 2025 sources. Exact scaling thresholds are estimates. |
| Pitfalls | HIGH | EDGAR pitfalls from official SEC policy documents. CourtListener rate limits and PACER rotation from official API docs. LLM hallucination rates from peer-reviewed 2025 Stanford study. Multi-tenant leakage from CVE-referenced sources. Alert fatigue from cited industry statistics. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Market data vendor:** Polygon.io, IEX Cloud, and Alpha Vantage are the main candidates for spread data, but pricing, data freshness SLA, and implied consideration support have not been compared. Validate before Phase 7 planning.
- **CourtListener RECAP Fetch coverage:** For active merger challenges, PACER documents may not all be in RECAP (the free archive). Production coverage depends on whether relevant filings have been submitted to RECAP by PACER users. Validate coverage against a sample of known merger litigation cases before committing to CourtListener as the sole litigation source.
- **LLM extraction prompt engineering:** The optimal prompts for termination fee extraction from S-4 exhibit exhibits vs. from the merger agreement body section are not yet determined. These require empirical testing on real filings, not research. Budget a 1-2 week prompt iteration sprint during Phase 3.
- **Vercel vs. dedicated hosting:** The backend runs BullMQ workers that require persistent processes. If Vercel is the deployment target, Inngest replaces BullMQ and the architecture changes significantly. Deployment target must be decided before Phase 1 implementation.

---

## Sources

### Primary (HIGH confidence)
- `https://www.sec.gov/search-filings/edgar-application-programming-interfaces` — EDGAR API structure, rate limits, user-agent policy
- `https://www.sec.gov/filergroup/announcements-old/new-rate-control-limits` — EDGAR 10 req/sec IP block policy
- `https://www.courtlistener.com/help/api/rest/` — CourtListener REST API v4, rate limits, auth header format
- `https://www.courtlistener.com/help/api/webhooks/` — CourtListener webhook API
- `https://pacer.uscourts.gov/sites/default/files/files/PACER%20Authentication%20API-2025.pdf` — PACER 180-day password rotation policy
- `https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf` — 17-33% hallucination rate in legal AI tools (peer-reviewed 2025)
- `https://arxiv.org/abs/2511.07585` — LLM output consistency: 12.5% for large models at temperature=0 (peer-reviewed 2025)
- `https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase` — Drizzle + Supabase official integration tutorial
- `https://docs.bullmq.io/` — BullMQ official docs (rate limiting, cron, retry)
- `https://hono.dev/docs/` — Hono framework official docs
- `https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object` — Vercel AI SDK `generateObject()` pattern

### Secondary (MEDIUM confidence)
- `https://ionanalytics.com/dealreporter/` — Dealreporter competitor features
- `https://guides.library.sc.edu/c.php?g=1133564&p=8272562` — Bloomberg Terminal MA/MARB function descriptions
- `https://www.alpha-sense.com/solutions/mergers-and-acquisitions-database/` — AlphaSense M&A feature analysis
- `https://www.insidearbitrage.com/merger-arbitrage/` — InsideArbitrage spread tracker feature analysis
- `https://www.harvey.ai/blog/harvey-in-practice-how-m-and-a-teams-use-harvey` — LLM clause extraction benchmarks (vendor blog)
- `https://www.skadden.com/insights/publications/2024/03/insights-special-edition/managing-deal-risks-in-a-challenging-regulatory-environment` — MAE clause prevalence (95% of deals), termination fee ranges
- `https://bytebase.com` + `https://makerkit.dev` — Drizzle vs Prisma 2025-2026 comparison (multiple sources agree)
- `https://galileo.ai` + `https://invofox.com` — Claude vs GPT-4o legal extraction accuracy comparison
- `https://xmit.sh` + `https://zenblog.com` — Resend vs Postmark developer experience comparison
- `https://www.dropzone.ai/glossary/alert-fatigue-in-cybersecurity-definition-causes-modern-solutions-5tz9b` — Alert fatigue statistics (40% of alerts never investigated)

### Tertiary (LOW confidence)
- `https://www.tribe.ai/applied-ai/data-stack-for-ai-enabled-due-diligence` — contextual reference for AI due diligence data stack

---

*Research completed: 2026-02-25*
*Ready for roadmap: yes*
