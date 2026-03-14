# J16Z LangExtract — Python LLM Extraction Pipeline

**Generated:** 2026-03-07

## OVERVIEW

BullMQ Python worker that extracts deal terms from SEC filings via Google Gemini. Routes by filing type to specialized pipelines. Writes clauses, summaries, and materiality-scored events to Postgres. Shares `ingestion` queue with Node.js worker — filters for `llm_extract` jobs only.

## STRUCTURE

```
langextract/
├── worker.py              # BullMQ entry point — job filtering + filing-type routing
├── db.py                  # psycopg3 async pool — fetch content, insert clauses/events
├── pipelines/
│   ├── s4_defm14a.py      # S-4, DEFM14A: 13 clause types, gemini-2.5-pro, 5 passes
│   ├── eightk.py          # 8-K: material events, gemini-2.5-flash, 3 passes
│   └── thirteend_g.py     # SC 13D/13G: ownership stakes, gemini-2.5-flash, 3 passes
├── scoring/
│   └── materiality.py     # 0-100 scoring with severity tiers (CRITICAL/WARNING/INFO)
├── summaries/
│   └── analyst_summary.py # Headline + section + delta summaries via Gemini
├── examples/              # Few-shot JSONL for each pipeline
│   ├── s4_examples.jsonl
│   ├── eightk_examples.jsonl
│   └── thirteend_examples.jsonl
└── tests/
    ├── conftest.py        # MockJob, job fixtures, DB/pipeline mocks
    ├── test_worker.py     # Routing + filtering (8 cases)
    ├── test_s4_pipeline.py
    ├── test_eightk_pipeline.py
    ├── test_thirteend_pipeline.py (as test_thirteend_g_pipeline.py)
    ├── test_materiality.py  # Cross-language parity with TypeScript
    ├── test_summaries.py
    └── test_regression.py   # pytest-regressions golden files
```

## JOB FLOW

```
BullMQ job (llm_extract)
  │
  ├─ worker.py: process()
  │   ├─ Filter: skip non-llm_extract jobs
  │   ├─ Fetch rawContent from DB (NOT from job payload)
  │   └─ Route by filing_type:
  │
  ├─ S-4/S-4A/DEFM14A/PREM14A → run_s4_pipeline()
  │   ├─ lx.extract() via asyncio.to_thread() (blocking → async)
  │   ├─ 13 clause types (TERMINATION_FEE, MAE, REGULATORY_EFFORTS...)
  │   ├─ Confidence from alignment: EXACT=0.9, GREATER/LESSER=0.7, FUZZY=0.6, none=0.3
  │   ├─ insert_clause() per firm_id (multi-tenant: N rows per extraction)
  │   ├─ headline + section summary
  │   └─ create_extraction_event() with materiality score
  │
  ├─ 8-K/8-KA → run_eightk_pipeline()
  │   ├─ 5 event classes (AMENDMENT, MATERIAL_EVENT, ENTRY_EXIT, COMPLETION, OTHER)
  │   └─ headline summary only
  │
  └─ SC 13D/13DA/13G/13GA → run_13dg_pipeline()
      ├─ 4 ownership classes (OWNERSHIP_STAKE, PURPOSE, SOURCE_OF_FUNDS, OTHER)
      └─ headline summary only, event only if deal_id present
```

## MODEL SELECTION

| Filing Type | Model | Passes | Workers | Buffer | Rationale |
|-------------|-------|--------|---------|--------|-----------|
| S-4/DEFM14A | gemini-2.5-pro | 5 | 10 | 800 chars | Complex 500-page merger proxies |
| 8-K | gemini-2.5-flash | 3 | 20 | 1000 chars | Shorter material event filings |
| SC 13D/13G | gemini-2.5-flash | 3 | 20 | 1000 chars | Shorter activist filings |

## MATERIALITY SCORING

Base scores by event type → adjustments → capped [0, 100]:
- **AGENCY**: FTC_COMPLAINT=95, SECOND_REQUEST=85, DOJ=80, APPROVAL=60
- **COURT**: INJUNCTION=90, TRO_DENIED=75, MOTION=70, DOCKET=50
- **FILING**: S4=80, 8K_AMENDMENT=60, ROUTINE=40
- **Adjustments**: +20 if <30 days to close, +15 if p_close<40%, +10 if >3 litigation, -25 if analyst marked "not material"
- **Severity**: CRITICAL ≥70, WARNING ≥50, INFO <50

**MUST match TypeScript version** in `apps/j16z-frontend/src/lib/materiality-scoring.ts` — cross-language parity tested.

## TESTING

**pytest + pytest-asyncio (auto mode) + pytest-regressions.**

Mock patterns:
- `conftest.py`: MockJob class, job data fixtures, `@pytest.fixture` for DB/pipeline mocks
- `mock_fetch_filing_content`: patches `db.fetch_filing_content` (NOT `worker.fetch_filing_content`)
- Pipeline mocks: patch at source module (`pipelines.s4_defm14a.run_s4_pipeline`)
- `asyncio_mode = "auto"` — all async tests run without explicit markers

```bash
pnpm test         # pytest (all)
pnpm dev          # python worker.py
pnpm install:py   # pip install with dev deps
```

## ANTI-PATTERNS

- **NO** raw content in job payloads — fetch from DB by filing_id (avoids 800KB Redis payloads)
- **NO** synchronous `lx.extract()` on event loop — always `asyncio.to_thread()`
- **NO** `ALIGNED/APPROXIMATE/FAILED` for AlignmentStatus — use `MATCH_EXACT/GREATER/LESSER/FUZZY`
- **NO** overwriting analyst-verified clauses — `ON CONFLICT DO NOTHING` in insert_clause()
- **NO** `google.generativeai` for new code — use `google.genai` (deprecated package, migration pending)
- **NO** events for filings without deal_id (13D/13G only) — skip event creation

## NOTES

- Filing type resolution: DB value is source of truth (not job payload)
- Connection pool: psycopg3 AsyncConnectionPool, min_size=1, max_size=5
- `lx.extract()` returns AnnotatedDocument (single) or list — pipeline normalizes to list
- Few-shot examples versioned as JSONL in `examples/` — loaded at pipeline startup
- Regression fixtures in `tests/golden/` — empty (bootstrap sprint needed)
- Python 3.10+ required
