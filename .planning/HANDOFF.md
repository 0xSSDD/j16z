# j16z Handoff Document

**Written:** 2026-03-07
**Branch:** `rehaul`
**State:** Phases 1-3 code-complete, critical integration bugs found, phases 4-7 not yet planned

---

## What Exists

### Planning Infrastructure

All planning lives in `.planning/`. The GSD (Get Shit Done) workflow system lives in `.claude/get-shit-done/` and provides orchestration for research → requirements → roadmap → plan → execute → verify cycles.

| File | What it is |
|------|-----------|
| `/Users/arpan/Documents/j16z/.planning/PROJECT.md` | Product vision, validated requirements, key decisions log |
| `/Users/arpan/Documents/j16z/.planning/REQUIREMENTS.md` | 62 requirements across 12 categories, traceability table mapping each to a phase |
| `/Users/arpan/Documents/j16z/.planning/ROADMAP.md` | 7-phase roadmap with success criteria per phase, dependency chain, progress table |
| `/Users/arpan/Documents/j16z/.planning/STATE.md` | Current position (phase 3 of 7 complete), velocity metrics, accumulated decisions |
| `/Users/arpan/Documents/j16z/.planning/config.json` | GSD workflow config (parallelization, branching, model profiles) |
| `/Users/arpan/Documents/j16z/.planning/v1.0-MILESTONE-AUDIT.md` | Milestone audit with integration findings — **read this for current problems** |

### Research (pre-roadmap)

Initial domain research that informed the roadmap. Produced by 4 parallel researcher agents.

| File | What it covers |
|------|---------------|
| `/Users/arpan/Documents/j16z/.planning/research/STACK.md` | Tech stack analysis and recommendations |
| `/Users/arpan/Documents/j16z/.planning/research/FEATURES.md` | Feature breakdown and prioritization |
| `/Users/arpan/Documents/j16z/.planning/research/ARCHITECTURE.md` | System architecture decisions |
| `/Users/arpan/Documents/j16z/.planning/research/PITFALLS.md` | Known risks and failure modes |
| `/Users/arpan/Documents/j16z/.planning/research/SUMMARY.md` | Synthesized research overview |

### Codebase Analysis

Structural analysis of the existing codebase produced by mapper agents.

| File | What it covers |
|------|---------------|
| `/Users/arpan/Documents/j16z/.planning/codebase/ARCHITECTURE.md` | Component relationships, data flow |
| `/Users/arpan/Documents/j16z/.planning/codebase/STACK.md` | Actual tech stack in use |
| `/Users/arpan/Documents/j16z/.planning/codebase/STRUCTURE.md` | Directory layout, key files |
| `/Users/arpan/Documents/j16z/.planning/codebase/CONVENTIONS.md` | Code style, naming patterns |
| `/Users/arpan/Documents/j16z/.planning/codebase/TESTING.md` | Test setup and patterns |
| `/Users/arpan/Documents/j16z/.planning/codebase/INTEGRATIONS.md` | External service connections |
| `/Users/arpan/Documents/j16z/.planning/codebase/CONCERNS.md` | Code quality issues, tech debt |

---

## Phases Completed

### Phase 1: Backend Foundation + Auth

**Goal:** Database schema, Hono API, Supabase auth, multi-tenant isolation CI gate

| Artifact | Path |
|----------|------|
| Research | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/01-RESEARCH.md` |
| Context | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/01-CONTEXT.md` |
| Plan 01-01 | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/01-01-PLAN.md` |
| Plan 01-02 | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/01-02-PLAN.md` |
| Plan 01-03 | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/01-03-PLAN.md` |
| Summary 01-01 | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/01-01-SUMMARY.md` |
| Summary 01-02 | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/01-02-SUMMARY.md` |
| Summary 01-03 | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/01-03-SUMMARY.md` |
| Verification | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/VERIFICATION.md` |
| Deferred items | `/Users/arpan/Documents/j16z/.planning/phases/01-backend-foundation-auth/deferred-items.md` |

**What it built:** Hono API at `apps/api/`, Drizzle ORM with 13+ tables, Supabase auth (magic link + email/password), BullMQ + Redis queues, firm-scoped RLS, cross-tenant isolation test, login page, onboarding flow, frontend `api.ts` with JWT passthrough.

**Requirements satisfied:** BACK-01→05, AUTH-01→06 (11 total)

### Phase 2: SEC EDGAR Ingestion

**Goal:** Poll EDGAR every 15 min, store raw filings, show filing metadata on deal board

| Artifact | Path |
|----------|------|
| Research | `/Users/arpan/Documents/j16z/.planning/phases/02-sec-edgar-ingestion/02-RESEARCH.md` |
| Context | `/Users/arpan/Documents/j16z/.planning/phases/02-sec-edgar-ingestion/02-CONTEXT.md` |
| Plans | `02-01-PLAN.md`, `02-02-PLAN.md`, `02-03-PLAN.md` (same directory) |
| Summaries | `02-01-SUMMARY.md`, `02-02-SUMMARY.md`, `02-03-SUMMARY.md` |
| Verification | `/Users/arpan/Documents/j16z/.planning/phases/02-sec-edgar-ingestion/02-VERIFICATION.md` |

**What it built:** EDGAR HTTP client with 9 req/s rate limiter, 15-min cron poll via BullMQ, two-stage ingestion (poll → download), deal matcher with auto-deal creation, firm-scoped event factory, Hono filings API, frontend filing display on deal board and deal card with EDGAR source links.

**Requirements satisfied:** EDGAR-01→06 (6 total)

### Phase 3: LLM Extraction Pipeline

**Goal:** Process raw filings into structured deal terms with citations; real data on deal cards and scored inbox

| Artifact | Path |
|----------|------|
| Research | `/Users/arpan/Documents/j16z/.planning/phases/03-llm-extraction-pipeline/03-RESEARCH.md` |
| Context | `/Users/arpan/Documents/j16z/.planning/phases/03-llm-extraction-pipeline/03-CONTEXT.md` |
| Plans | `03-01-PLAN.md`, `03-02-PLAN.md`, `03-03-PLAN.md` (same directory) |
| Summaries | `03-01-SUMMARY.md`, `03-02-SUMMARY.md`, `03-03-SUMMARY.md` |
| Verification | `/Users/arpan/Documents/j16z/.planning/phases/03-llm-extraction-pipeline/03-VERIFICATION.md` |

**What it built:** Python `apps/langextract/` service with BullMQ worker, 3 extraction pipelines (S-4/DEFM14A, 8-K, 13D/13G) using Google's LangExtract library + Gemini models, few-shot JSONL examples, analyst summary generation, Python materiality scoring port, frontend clause display with grouped categories and verbatim quotes, regression test harness scaffold.

**Requirements satisfied (at code level):** EXTRACT-01→07 (7 total)

**Phase 3 is broken.** The code exists but the pipeline cannot function. See Problems 1-3 below — all are bugs introduced by the Phase 3 executor agents.

---

## The Current Problems

### Phase 3 Bugs (introduced by executor agents)

#### Bug 1: Payload Key Mismatch (CRITICAL — extraction pipeline is dead on arrival)

**Who broke it:** Plan 03-01 agent. It wrote BOTH sides of the queue handoff in the same plan and used different key conventions on each side.

**What happened:** The agent added the Node.js enqueue call to `download.ts` using camelCase (matching the existing JS codebase convention) and then created the Python `worker.py` using snake_case (matching Python convention). It never checked that the keys match across the language boundary. BullMQ passes JSON through Redis verbatim — there is no automatic key transformation.

```typescript
// apps/api/src/edgar/download.ts, lines 96-101 — written by 03-01
await ingestionQueue.add('llm_extract', {
  filingId,       // camelCase
  filingType,     // camelCase
  dealId,         // camelCase
  firmIds,        // camelCase
});
```

```python
# apps/langextract/worker.py, lines 53-56 — written by 03-01
filing_id  = job.data.get('filing_id', '')      # snake_case — WRONG
filing_type = job.data.get('filing_type', '')    # snake_case — WRONG
deal_id    = job.data.get('deal_id')             # snake_case — WRONG
firm_ids   = job.data.get('firm_ids', [])        # snake_case — WRONG
```

**Result:** Every `llm_extract` job receives empty defaults. The worker silently does nothing. No extraction has ever run or can run.

**Why it wasn't caught:** The 03-01 tests mock the BullMQ job data with snake_case keys (matching the Python side), so tests pass. The verifier checked that both files exist and are "wired" but didn't cross-check the actual key names across the language boundary. The mismatch is invisible to any single-language analysis.

**Fix:** Change `worker.py` lines 53-56 to read camelCase keys: `job.data.get('filingId', '')`, etc. Four lines.

#### Bug 2: Missing Clauses API Route (CRITICAL — extracted data unreachable from frontend)

**Who broke it:** Plan 03-03 agent. It updated the frontend to call `getClauses(dealId)` which hits `/api/deals/${dealId}/clauses`, but never created the backend Hono route to serve that endpoint.

**What happened:** The agent wrote the frontend consumer (deal-card.tsx calls `getClauses()`, api.ts has `authFetch('/api/deals/${dealId}/clauses')`) but forgot to add the corresponding route in `apps/api/src/routes/deals.ts`. The `clauses` table exists in the schema. Python `db.py` writes to it. But nothing exposes it over HTTP.

```typescript
// apps/j16z-frontend/src/lib/api.ts, line 118 — written by 03-03
const response = await authFetch(`/api/deals/${dealId}/clauses`);
// This endpoint does not exist. Returns 404.
```

**Result:** The frontend catch block silently falls back to `MOCK_CLAUSES`. The deal card ALWAYS shows mock data regardless of `USE_MOCK_DATA` setting. Even if Bug 1 were fixed and real clauses were in the DB, they'd be unreachable.

**Why it wasn't caught:** The verifier checked that `getClauses()` exists in api.ts and that deal-card.tsx calls it — both true. It verified the "key link" as `getClauses(dealId) → authFetch('/api/deals/${dealId}/clauses')` and marked it "WIRED." But "wired" only meant the frontend call chain exists, not that the backend endpoint exists. The verifier never checked `deals.ts` for the actual route.

**Fix:** Add a `GET /deals/:id/clauses` route in `apps/api/src/routes/deals.ts` that queries `schema.clauses` where `dealId` matches, scoped through firm ownership. ~15 lines.

#### Bug 3: All Tests Are Mocked — Zero Real Validation

**Who caused it:** All three Phase 3 agents (03-01, 03-02, 03-03). Every test mocks `lx.extract()`, `genai.GenerativeModel()`, and the DB layer. Not a single test calls the Gemini API or processes a real document.

**What this means concretely:**
- The few-shot JSONL examples in `apps/langextract/examples/` are invented, not validated against real extraction output
- The confidence scoring ladder (MATCH_EXACT=0.9, MATCH_GREATER=0.7, etc.) is based on library docs, not observed LangExtract behavior
- The 500-page S-4 chunking strategy (`extraction_passes=5`, `max_workers=10`) is a guess — never tested against a real document
- The regression test harness has empty `fixtures/` and `golden/` directories — the harness works but has nothing to regress against
- The `google-generativeai` package is deprecated (should be `google.genai`) — flagged in decisions but not fixed

**The user asked "how did you test all this without my Gemini API key?" — the answer is: we didn't.** The agents wrote structurally correct code with mocked tests that pass, but no pipeline has ever processed a real filing. The entire extraction layer is untested against reality.

**Next step:** Run a manual extraction experiment with a real Gemini API key against 5-10 actual EDGAR filings. Validate that LangExtract produces usable output, that the confidence scoring makes sense, and that the chunking strategy handles large documents.

### Other Problems (not Phase 3 agent bugs)

#### Problem 4: Redis TLS Mismatch (deployment blocker)

Node.js (`apps/api/src/queues/connection.ts`) uses Upstash with `tls: {}` (TLS required). Python (`apps/langextract/worker.py`) defaults to `redis://localhost:6379` (no TLS). The two services can't talk to the same Redis in production without manually setting `REDIS_URL=rediss://:PASSWORD@HOST:6379`.

#### Problem 5: Missing Market Snapshots Route (minor, expected)

`getMarketSnapshots()` in `api.ts` calls `/api/deals/${dealId}/market-snapshots` — doesn't exist. Spread chart always uses mock data. Scheduled for Phase 5 (Market Data).

### Problem 6: Alert Rules in localStorage (architecture gap)

DB `alert_rules` table exists in schema but has no API route. Frontend writes alert rules to `localStorage` instead. Settings are per-browser, not per-team. Scheduled for Phase 5 (Alert Delivery).

### Problem 7: Stale ROADMAP Progress Table

The ROADMAP progress table shows Phase 2 as "2/3 In Progress" and Phase 3 plan checkboxes as `[ ]` unchecked, despite both phases being complete. The `phase complete` CLI updates the phase-level status but doesn't always update the plan-level checkboxes.

### Problem 8: Phase 1 VERIFICATION.md Naming

Phase 1's verification file is named `VERIFICATION.md` (no phase prefix), while Phases 2 and 3 use `02-VERIFICATION.md` and `03-VERIFICATION.md`. The milestone audit Glob pattern `*-VERIFICATION.md` missed Phase 1's file and incorrectly flagged it as "missing." The file exists and shows 6/6 criteria passed.

---

## What Has NOT Been Built

Phases 4-7 from the ROADMAP are not yet planned or executed:

| Phase | What | Requirements | Status |
|-------|------|-------------|--------|
| 4 | CourtListener, FTC/DOJ, RSS Ingestion | COURT-01→05, AGENCY-01→04, RSS-01→03 (12 reqs) | Not planned |
| 5 | Alert Delivery + Market Data | ALERT-01→06, MKT-01→04 (10 reqs) | Not planned |
| 6 | Digests + Deal Memo Editor | DIGEST-01→04, MEMO-01→04 (8 reqs) | Not planned |
| 7 | Frontend Refinement + Exports | UI-01→05, EXPORT-01→03 (8 reqs) | Not planned |

39 of 62 total requirements are unaddressed.

---

## Key Architecture Decisions (reference)

All decisions are logged in STATE.md (see "Accumulated Context > Decisions" section). The most consequential ones:

- **Two Drizzle clients:** `db` (RLS, pooled port 6543) and `adminDb` (service-role, direct port 5432)
- **Filings table is global** (no `firm_id`) — firm-scoped Event records bridge filings to firms
- **Auto-deal creation:** High-signal filings (S-4, SC TO-T) auto-create deals with `firmId=null`, `source='auto_edgar'`
- **Python service uses psycopg3** (not supabase-py) — direct Postgres, consistent with adminDb pattern
- **LangExtract 1.1.1 pinned** — AlignmentStatus uses `MATCH_EXACT/GREATER/LESSER/FUZZY` (not the `ALIGNED/APPROXIMATE/FAILED` documented in research)
- **google-generativeai package is deprecated** — google.genai is the replacement; flagged for migration but not blocking

---

## How to Resume

1. **Fix the integration breaks** — Problems 1 and 2 are ~30 minutes of work and unblock the entire extraction pipeline
2. **Run real extraction experiment** — Need Gemini API key to validate pipelines against actual EDGAR filings
3. **Continue with Phase 4** — `/gsd:plan-phase 4` to start CourtListener/FTC/DOJ/RSS ingestion
4. **Or run gap closure** — `/gsd:plan-milestone-gaps` to create fix plans for audit findings

The GSD workflow commands:
- `/gsd:progress` — see current state and recommended next action
- `/gsd:plan-phase N` — plan a phase before executing
- `/gsd:execute-phase N` — execute all plans in a phase
- `/gsd:help` — full command reference

---

## File Tree Reference

```
.planning/
├── PROJECT.md                          # Product vision and decisions
├── REQUIREMENTS.md                     # 62 requirements with traceability
├── ROADMAP.md                          # 7-phase roadmap
├── STATE.md                            # Current position and velocity
├── config.json                         # GSD workflow config
├── v1.0-MILESTONE-AUDIT.md             # Audit findings (GAPS FOUND)
├── HANDOFF.md                          # This file
├── research/                           # Pre-roadmap domain research
│   ├── SUMMARY.md, STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
├── codebase/                           # Codebase structural analysis
│   ├── ARCHITECTURE.md, STACK.md, STRUCTURE.md, CONVENTIONS.md
│   ├── TESTING.md, INTEGRATIONS.md, CONCERNS.md
└── phases/
    ├── 01-backend-foundation-auth/     # COMPLETE — 3 plans, 6/6 verified
    │   ├── 01-RESEARCH.md, 01-CONTEXT.md
    │   ├── 01-{01,02,03}-PLAN.md, 01-{01,02,03}-SUMMARY.md
    │   ├── VERIFICATION.md             # Note: no phase prefix (naming inconsistency)
    │   └── deferred-items.md
    ├── 02-sec-edgar-ingestion/         # COMPLETE — 3 plans, 7/7 verified
    │   ├── 02-RESEARCH.md, 02-CONTEXT.md
    │   ├── 02-{01,02,03}-PLAN.md, 02-{01,02,03}-SUMMARY.md
    │   └── 02-VERIFICATION.md
    └── 03-llm-extraction-pipeline/     # COMPLETE (code) — 3 plans, 5/5 verified
        ├── 03-RESEARCH.md, 03-CONTEXT.md  # BUT integration breaks make it non-functional
        ├── 03-{01,02,03}-PLAN.md, 03-{01,02,03}-SUMMARY.md
        └── 03-VERIFICATION.md
```
