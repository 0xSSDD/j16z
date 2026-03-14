# Phase 3: LLM Extraction Pipeline - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Raw EDGAR filings are automatically processed into structured deal terms and clauses with verbatim source citations using Google's LangExtract library. Deal cards show real extracted data (not mock), the Inbox shows real materiality-scored events derived from ingested filings, and analysts get filing summaries with risk flags. Creating the `apps/langextract/` Python service, BullMQ extraction workers, few-shot M&A extraction prompts, chunking for long filings, citation verification, materiality scoring at DB level, and a regression test harness.

</domain>

<decisions>
## Implementation Decisions

### Extraction Scope
- Extract **everything we can get**: clauses, deal-level terms, AND additional signals (go-shop provisions, ticking fees, specific regulatory approvals, breakup triggers, specific performance, matching rights)
- Deal-level terms include: consideration structure (cash/stock/mixed), deal value, expected close date, conditions precedent, shareholder vote threshold
- Expand ClauseType enum beyond current 6 types: add GO_SHOP, TICKING_FEE, HELL_OR_HIGH_WATER, SPECIFIC_PERFORMANCE, NO_SHOP, MATCHING_RIGHTS — plus an OTHER fallback for anything unexpected (belt and suspenders)
- Extract a **structured deal summary** (1-paragraph overview: who's acquiring whom, consideration, timeline, key conditions) as a separate extraction class alongside clause-by-clause extraction — from S-4/DEFM14A filings

### Pipeline Architecture
- **Per-filing-type pipelines** with tailored LangExtract prompts and examples:
  - S-4/DEFM14A pipeline (merger proxy — richest source, most clauses, deal summary)
  - 8-K pipeline (material events, amendments)
  - 13D/13G pipeline (activist stakes, beneficial ownership)
- Each pipeline has its own prompt_description, examples, and chunking config

### Analyst Summaries
- **Analyst-note style with risk flags** — factual but highlighting what matters (e.g., "Reverse termination fee at 4.2% of deal value — above median. MAE clause notably excludes pandemic.")
- Summaries generated via **separate post-extraction LLM call** (not part of LangExtract extraction) — takes extracted clauses + deal context as input, produces analyst summary with more control over tone
- **Two-level summaries**: one headline summary (2-3 sentences for Inbox/feed) + expandable section-level summaries for S-4/DEFM14A on the deal card
- **Delta-aware summaries**: compare against previously extracted data for the same deal, highlight what changed (e.g., "Revised S-4 increases termination fee from $1.8B to $2.1B")

### Deal Card Display
- Clauses **grouped by category** as default (Termination Provisions, Conditions, Protective Provisions) — configurable by analyst
- Verbatim quotes **collapsed by default** — show extracted value/summary inline (e.g., "Termination Fee: $2.1B"), click to expand verbatim quote with EDGAR source link
- Citation links to **EDGAR filing page** (using existing raw_url from filings table)
- **Per-clause provenance**: each clause shows which filing it came from (e.g., "From S-4 filed 2026-01-15") and when extraction ran

### Confidence & Review
- **Hidden confidence, flag only low** — don't show confidence scores by default, but auto-flag low-confidence extractions with a warning icon for analyst review
- **Inline edit with audit trail** — analysts can click an extracted value and edit it; original extraction preserved in history; corrected values marked as "analyst-verified" and never overwritten by re-extraction
- **Auto-extract, merge with existing** — new filing auto-triggers extraction; new clauses added, updated clauses show the change (delta-aware); analyst-verified values are never overwritten

### Few-Shot Example Strategy
- **Bootstrap with LLM, then refine** — use Gemini Pro or Claude to do initial extraction on real filings, manually review and correct results to create the example set
- **2-3 annotated examples per filing type** (S-4/DEFM14A, 8-K, 13D/13G) — enough to generalize without over-investing upfront; expand as we see regression test results
- Examples **versioned in repo** at `apps/langextract/examples/` as JSON/JSONL files — reviewable in PRs, referenced by regression test harness
- **Model selection**: Gemini 2.5 Pro for S-4/DEFM14A (complex legal language), Gemini 2.5 Flash for 8-K and 13D/13G (shorter, simpler filings)
- **Model version pinned** (not aliased) per requirements — nightly regression test against 20 real EDGAR filings fails CI on extraction delta
- API key: `GOOGLE_API_KEY` or `LANGEXTRACT_API_KEY` in `apps/langextract/.env` — user will set this manually

### Regression Testing
- **Real EDGAR filings** as golden set (not synthetic) — 20 curated M&A filings with known-good extraction results
- CI fails on any extraction delta from the golden set

### Claude's Discretion
- Exact LangExtract chunking config per filing type (max_char_buffer, extraction_passes, max_workers)
- BullMQ worker topology (single worker vs separate workers per filing type)
- Confidence score calculation method
- Database migration specifics for expanded ClauseType enum and new columns
- Summary LLM prompt engineering details
- Error handling and retry strategy for failed extractions

</decisions>

<specifics>
## Specific Ideas

- LangExtract's `char_interval` (start_pos/end_pos) maps directly to the existing `sourceLocation` column in the clauses table — use character offsets for source grounding
- DataCamp tutorial recommends legal documents get: small chunks (`max_char_buffer=800`), more passes (`extraction_passes=5`), fewer workers (`max_workers=10`) — accuracy over speed
- LangExtract relationship extraction via shared attributes (e.g., `clause_group`) can link related extractions (a clause, its dollar amount, and its conditions)
- Delta-aware summaries: "Revised S-4 increases termination fee from $1.8B to $2.1B" — compare current extraction against prior extraction for same deal
- Analyst-note tone reference: "S-4 reveals $2.1B reverse termination fee (4.2% of deal value — above median). MAE clause notably excludes pandemic. Watch: shareholder vote March 15."

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/db/schema.ts` — `clauses` table already has `verbatimText`, `sourceLocation`, `extractedAt`, `filingId` FK; `filings` table has `extracted` boolean flag for two-stage ingestion
- `apps/j16z-frontend/src/lib/types.ts` — `Clause` interface and `ClauseType` enum (needs expanding)
- `apps/j16z-frontend/src/lib/materiality-scoring.ts` — Full client-side scoring system (needs porting to DB columns per EXTRACT-07)
- `apps/j16z-frontend/src/lib/severity-scoring.ts` — Severity scoring (companion to materiality)
- `@google/genai` — Already a dependency in frontend package.json
- `apps/j16z-frontend/src/lib/services/gemini.ts` — Stub file (TODO: port from mock)
- BullMQ + Redis queue infrastructure already set up from Phase 1

### Established Patterns
- Two-stage ingestion: filings stored raw first (`extracted: false`), then processed — extraction flips the flag
- API abstraction layer (`api.ts`) switches mock/real via env var — extraction results will flow through this
- Firm-scoped RLS on clauses table (extraction must set `firm_id`)
- Filings table is global (no firm_id) — clauses are firm-scoped via deal → firm relationship

### Integration Points
- Extraction worker triggered by filing ingestion (Phase 2 BullMQ pipeline)
- Extracted clauses populate deal card (`/app/deals/[id]` page)
- Materiality scores (stored in DB) feed into Inbox event display
- Analyst summaries appear in Inbox event cards and deal card event timeline
- Frontend `Clause` type and `getClauses()` API function need updating for expanded types

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-llm-extraction-pipeline*
*Context gathered: 2026-03-01*
