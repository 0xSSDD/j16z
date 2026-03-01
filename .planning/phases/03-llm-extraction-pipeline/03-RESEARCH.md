# Phase 3: LLM Extraction Pipeline - Research

**Researched:** 2026-03-01
**Domain:** LLM-based structured extraction (LangExtract + Gemini), Python service integration, BullMQ cross-language queue, DB migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Extraction Library:** Google's LangExtract library — Python service at `apps/langextract/`

**Extraction Scope:**
- Extract **everything we can get**: clauses, deal-level terms, AND additional signals (go-shop provisions, ticking fees, specific regulatory approvals, breakup triggers, specific performance, matching rights)
- Deal-level terms: consideration structure (cash/stock/mixed), deal value, expected close date, conditions precedent, shareholder vote threshold
- Expand ClauseType enum beyond current 6 types: add GO_SHOP, TICKING_FEE, HELL_OR_HIGH_WATER, SPECIFIC_PERFORMANCE, NO_SHOP, MATCHING_RIGHTS — plus an OTHER fallback
- Extract a **structured deal summary** (1-paragraph overview) as a separate extraction class alongside clause-by-clause extraction — from S-4/DEFM14A filings

**Pipeline Architecture:** Per-filing-type pipelines with tailored LangExtract prompts and examples:
- S-4/DEFM14A pipeline (merger proxy — richest source, most clauses, deal summary)
- 8-K pipeline (material events, amendments)
- 13D/13G pipeline (activist stakes, beneficial ownership)

**Analyst Summaries:**
- Analyst-note style with risk flags — factual but highlighting what matters
- Summaries generated via **separate post-extraction LLM call** (not LangExtract extraction)
- **Two-level summaries**: headline (2-3 sentences for Inbox/feed) + expandable section-level for S-4/DEFM14A
- **Delta-aware summaries**: compare against previously extracted data, highlight what changed

**Deal Card Display:**
- Clauses grouped by category as default (configurable by analyst)
- Verbatim quotes collapsed by default — click to expand with EDGAR source link
- Citation links to EDGAR filing page (using existing `raw_url` from filings table)
- Per-clause provenance: which filing, when extraction ran

**Confidence & Review:**
- Hidden confidence scores, flag only low-confidence extractions with a warning icon
- Inline edit with audit trail — analyst corrections marked "analyst-verified", never overwritten by re-extraction
- Auto-extract, merge with existing — new filings auto-trigger, analyst-verified values protected

**Few-Shot Example Strategy:**
- Bootstrap with LLM, then refine — use Gemini to do initial extraction on real filings, manually review to create example set
- 2-3 annotated examples per filing type, versioned in repo at `apps/langextract/examples/`
- **Model selection**: Gemini 2.5 Pro for S-4/DEFM14A; Gemini 2.5 Flash for 8-K and 13D/13G
- **Model version pinned** (not aliased) — nightly regression test against 20 real EDGAR filings fails CI on extraction delta
- API key: `GOOGLE_API_KEY` or `LANGEXTRACT_API_KEY` in `apps/langextract/.env`

**Regression Testing:**
- Real EDGAR filings as golden set (not synthetic) — 20 curated M&A filings with known-good extraction results
- CI fails on any extraction delta from the golden set

### Claude's Discretion
- Exact LangExtract chunking config per filing type (max_char_buffer, extraction_passes, max_workers)
- BullMQ worker topology (single worker vs separate workers per filing type)
- Confidence score calculation method
- Database migration specifics for expanded ClauseType enum and new columns
- Summary LLM prompt engineering details
- Error handling and retry strategy for failed extractions

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXTRACT-01 | Python extraction service runs in monorepo at `apps/langextract/` using Google's LangExtract library | LangExtract 1.1.1 confirmed on PyPI; Python service pattern in pnpm monorepo documented; BullMQ Python worker enables same Redis queue as Node.js API |
| EXTRACT-02 | System extracts termination fees, MAE clauses, regulatory covenants, and litigation terms from SEC filings | LangExtract's few-shot extraction approach handles arbitrary domain clauses; expanded ClauseType enum covers all required clause types; per-filing-type pipelines differentiate extraction strategies |
| EXTRACT-03 | Every extracted field maps to exact source location in original document (source grounding) | LangExtract `char_interval` (start_pos, end_pos) provides character-level offsets that map directly to existing `sourceLocation` column in clauses table |
| EXTRACT-04 | Extraction uses few-shot examples trained on M&A document patterns | LangExtract `ExampleData` + `Extraction` objects define few-shot examples per filing type; examples versioned in `apps/langextract/examples/` as JSONL |
| EXTRACT-05 | System handles long filings (500+ page S-4s) via chunking and parallel processing | `lx.extract()` parameters `max_char_buffer`, `extraction_passes`, `max_workers` provide built-in chunking + parallelism; DataCamp recommends `max_char_buffer=800`, `extraction_passes=5`, `max_workers=10` for legal documents |
| EXTRACT-06 | System generates 2-3 sentence analyst-facing summaries of filings and docket entries | Separate post-extraction Gemini API call (using `@google/genai`) takes extracted clauses + deal context as input; two-level summaries (headline + section-level) |
| EXTRACT-07 | Materiality scoring runs at extraction time; scores stored as DB columns | Port existing `materiality-scoring.ts` logic to Python; store `materiality_score` and `severity` in `events` table at extraction time (columns already exist in schema) |

</phase_requirements>

---

## Summary

Phase 3 builds a Python extraction service (`apps/langextract/`) that slots into the existing BullMQ pipeline as Stage 3: after `edgar_download` stores `rawContent`, a new `llm_extract` job calls the Python service to extract structured deal terms using Google's LangExtract library. The Python service and Node.js API communicate via a shared Redis queue (BullMQ supports cross-language interoperability natively) and/or an HTTP endpoint trigger pattern. LangExtract version 1.1.1 (released November 2025) is the confirmed library; it uses Gemini models via `LANGEXTRACT_API_KEY`, returns character-offset source grounding via `char_interval.start_pos/end_pos`, and handles long documents natively via `max_char_buffer`, `extraction_passes`, and `max_workers` parameters.

The most complex integration challenge is the Python-in-pnpm-monorepo setup: Python apps are not pnpm workspace members (they use `requirements.txt` / `pyproject.toml`), so `apps/langextract/` lives in the monorepo directory but has its own Python environment. The BullMQ cross-language queue approach (Node.js enqueues `llm_extract` jobs; Python worker consumes them) is the cleanest pattern, avoiding HTTP service overhead and aligning with the existing worker architecture in `apps/api/src/worker.ts`. The alternative is an HTTP trigger (Node.js POSTs to a FastAPI endpoint), which is viable but adds a service dependency.

The DB migration for expanded ClauseType enum uses Drizzle's `pgEnum` ADD VALUE support (introduced in drizzle-kit 0.26.2); adding values is non-destructive in Postgres. The clauses table already has `verbatimText`, `sourceLocation`, `extractedAt`, and `filingId` — all needed columns exist. New columns needed: `confidenceScore` (numeric, nullable) and `analystVerified` (boolean, default false) for the inline-edit audit trail. The `events` table already has `materialityScore` (integer) and `severity` (text) columns — no new columns needed for EXTRACT-07.

**Primary recommendation:** Use BullMQ Python worker (not HTTP FastAPI endpoint) as the integration pattern. Node.js `edgar_download` handler enqueues `llm_extract` job after storing `rawContent`; Python BullMQ worker processes it with LangExtract. This keeps all extraction async, retryable, and observable through the existing queue infrastructure.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `langextract` | 1.1.1 | Structured extraction with source grounding | The locked user decision; Google-maintained; Apache 2.0; Gemini-native |
| `bullmq` (Python) | 2.19.5+ | Python BullMQ worker consuming Node.js-enqueued jobs | Same Redis backend as existing Node.js queue; cross-language interoperability is documented by BullMQ team |
| `redis-py` (`redis.asyncio`) | 5.x | Redis connection for Python BullMQ | Required by BullMQ Python; asyncio-native |
| `google-generativeai` / `@google/genai` | latest | Gemini API calls for summary generation (post-extraction) | Already a dependency in frontend; use `google-generativeai` in Python (PyPI) for the Python service |
| `python-dotenv` | 1.x | Load `apps/langextract/.env` | Standard Python env management |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fastapi` + `uvicorn` | optional | HTTP trigger alternative to BullMQ Python | Only if BullMQ Python worker proves difficult to integrate with existing Node.js queue; adds HTTP overhead |
| `pytest` | 8.x | Regression test harness for golden file comparisons | Already the de-facto Python test framework; supports golden file pattern via `pytest-regressions` |
| `pytest-regressions` | 0.6+ | Golden file diff assertions | `data_regression.check()` serializes/diffs extraction output JSON against versioned golden files |
| `python-json-logger` | 2.x | Structured JSON logging from Python service | Consistent log format with Node.js workers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ Python worker | FastAPI HTTP endpoint triggered by Node.js | HTTP adds a service dependency and a network hop; BullMQ gives retries, backoff, and observability for free |
| BullMQ Python worker | Node.js child_process spawning Python script | Child process lacks retry/backoff; not production-grade for 500-page S-4 processing times |
| `google-generativeai` Python | LangChain | LangChain is heavy; direct SDK is simpler for a single post-extraction summary call |
| `pytest-regressions` | Custom JSON diff assertions | `pytest-regressions` handles JSONL golden files natively with `--gen-files` to regenerate |

**Installation:**
```bash
# In apps/langextract/ — Python environment
pip install langextract==1.1.1 bullmq redis python-dotenv google-generativeai

# Dev / test dependencies
pip install pytest pytest-regressions

# Or via pyproject.toml (preferred)
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/langextract/
├── pyproject.toml           # Python package config; pinned dependency versions
├── requirements.txt          # Locked deps for deployment (pip freeze output)
├── .env                      # LANGEXTRACT_API_KEY, REDIS_URL — not committed
├── .env.example              # Committed template
├── worker.py                 # BullMQ Python worker entry point
├── pipelines/
│   ├── s4_defm14a.py         # S-4/DEFM14A extraction pipeline
│   ├── eightk.py             # 8-K extraction pipeline
│   └── thirteend_g.py        # 13D/13G extraction pipeline
├── examples/
│   ├── s4_examples.jsonl     # Few-shot examples for S-4/DEFM14A (versioned)
│   ├── eightk_examples.jsonl # Few-shot examples for 8-K
│   └── thirteend_examples.jsonl
├── scoring/
│   └── materiality.py        # Port of materiality-scoring.ts logic
├── summaries/
│   └── analyst_summary.py    # Post-extraction summary LLM call
└── tests/
    ├── conftest.py            # Shared fixtures; golden file registry
    ├── golden/               # Golden extraction outputs (JSONL) — 20 filings
    │   ├── s4_golden_01.jsonl
    │   └── ...
    └── test_regression.py    # Nightly regression test — fails CI on extraction delta
```

### Pattern 1: BullMQ Cross-Language Queue (Node.js enqueue → Python consume)

**What:** Node.js `edgar_download` handler enqueues `llm_extract` jobs after storing `rawContent`. Python BullMQ worker consumes from the same `ingestion` Redis queue.

**When to use:** This is the primary pattern. Keeps extraction async and observable without adding HTTP service dependencies.

**Example — Node.js side (in `apps/api/src/edgar/download.ts`, after storing rawContent):**
```typescript
// After updating filing with rawContent, enqueue extraction job
await ingestionQueue.add('llm_extract', {
  filingId: filingId,
  filingType: filingType,      // 'S-4' | '8-K' | 'SC 13D' etc.
  dealId: dealId,
  firmIds: firmIds,            // array of firm IDs tracking this deal
  rawContent: plainText,       // pass content inline (avoid second DB read in Python)
});
```

**Example — Python side (`apps/langextract/worker.py`):**
```python
import asyncio
from bullmq import Worker
import os

async def process(job, job_token):
    filing_type = job.data.get('filing_type')
    raw_content = job.data.get('raw_content')
    filing_id = job.data.get('filing_id')
    deal_id = job.data.get('deal_id')
    firm_ids = job.data.get('firm_ids', [])

    if filing_type in ('S-4', 'S-4/A', 'DEFM14A', 'PREM14A'):
        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(filing_id, deal_id, firm_ids, raw_content)
    elif filing_type in ('8-K', '8-K/A'):
        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(filing_id, deal_id, firm_ids, raw_content)
    elif filing_type in ('SC 13D', 'SC 13D/A', 'SC 13G', 'SC 13G/A'):
        from pipelines.thirteend_g import run_13dg_pipeline
        await run_13dg_pipeline(filing_id, deal_id, firm_ids, raw_content)

worker = Worker(
    'ingestion',
    process,
    {'connection': os.environ['REDIS_URL']}
)

asyncio.run(worker.run())
```

### Pattern 2: LangExtract Per-Pipeline Extraction

**What:** Each filing type has its own `prompt_description`, `examples`, and chunking config. Extractions return `AnnotatedDocument` with `extractions: list[Extraction]`, each having `char_interval.start_pos/end_pos`.

**When to use:** All extraction calls. The per-pipeline separation is a locked user decision.

**Example — S-4/DEFM14A pipeline (`apps/langextract/pipelines/s4_defm14a.py`):**
```python
import langextract as lx
from langextract.data import ExampleData, Extraction

PROMPT = """
Extract M&A deal clauses from this merger agreement proxy filing.
For each clause, extract the exact verbatim text as it appears in the document.
Classify each clause into one of: TERMINATION_FEE, REVERSE_TERMINATION_FEE,
MAE, REGULATORY_EFFORTS, LITIGATION_CONDITION, FINANCING_CONDITION,
GO_SHOP, TICKING_FEE, HELL_OR_HIGH_WATER, SPECIFIC_PERFORMANCE,
NO_SHOP, MATCHING_RIGHTS, OTHER.
Include the clause value (dollar amount or description) as an attribute.
""".strip()

# Load examples from versioned JSONL file
def load_examples() -> list[ExampleData]:
    # ... load from apps/langextract/examples/s4_examples.jsonl
    pass

async def run_s4_pipeline(filing_id: str, deal_id: str, firm_ids: list[str], content: str):
    examples = load_examples()

    result = lx.extract(
        text_or_documents=content,
        prompt_description=PROMPT,
        examples=examples,
        model_id="gemini-2.5-pro",  # PINNED — non-aliased stable version
        extraction_passes=5,         # More passes for 500-page documents
        max_workers=10,              # Fewer workers for accuracy over speed
        max_char_buffer=800,         # Small chunks for legal text precision
    )

    # result is an AnnotatedDocument; result.extractions is list[Extraction]
    for extraction in result.extractions:
        clause_type = extraction.extraction_class
        verbatim_text = extraction.extraction_text
        # char_interval maps to sourceLocation column
        start_pos = extraction.char_interval.start_pos if extraction.char_interval else None
        end_pos = extraction.char_interval.end_pos if extraction.char_interval else None
        source_location = f"{start_pos}:{end_pos}" if start_pos is not None else ""
        attributes = extraction.attributes or {}

        # Write to DB via Supabase REST API (or shared postgres connection)
        await insert_clause(
            filing_id=filing_id,
            deal_id=deal_id,
            firm_ids=firm_ids,
            clause_type=clause_type,
            verbatim_text=verbatim_text,
            source_location=source_location,
            attributes=attributes,
        )

    # Flip filings.extracted = true
    await mark_filing_extracted(filing_id)
```

**Source grounding return format (HIGH confidence — verified from `langextract/core/data.py`):**
```python
# CharInterval dataclass
@dataclasses.dataclass
class CharInterval:
    start_pos: int | None = None
    end_pos: int | None = None

# Extraction dataclass
@dataclasses.dataclass
class Extraction:
    extraction_class: str          # maps to ClauseType
    extraction_text: str           # verbatimText — exact quote from document
    char_interval: CharInterval | None = None  # start_pos:end_pos offset
    attributes: dict[str, str | list[str]] | None = None  # structured values
    group_index: int | None = None # for relationship linking
    # ... other fields
```

The `sourceLocation` column in the `clauses` table stores this as `"52:134"` (string format `start_pos:end_pos`).

### Pattern 3: DB Write from Python

**What:** Python service writes extracted clauses to Supabase Postgres using the service-role key (bypasses RLS, same as `adminDb` in Node.js).

**When to use:** The Python service has no Drizzle ORM. Use `psycopg` (psycopg3) or `supabase-py` with service-role key for direct DB writes.

**Example — Python DB write:**
```python
import os
import psycopg

async def insert_clause(filing_id, deal_id, firm_ids, clause_type, verbatim_text, source_location, attributes):
    # Insert one row per firm (firm_id scoping)
    async with await psycopg.AsyncConnection.connect(os.environ['DATABASE_URL']) as conn:
        for firm_id in firm_ids:
            await conn.execute("""
                INSERT INTO clauses
                  (firm_id, deal_id, filing_id, type, title, summary, verbatim_text,
                   source_location, extracted_at, confidence_score, analyst_verified)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, FALSE)
                ON CONFLICT DO NOTHING
            """, (firm_id, deal_id, filing_id, clause_type, ..., verbatim_text,
                  source_location, confidence_score))
```

### Pattern 4: Regression Test Golden File Pattern

**What:** 20 real EDGAR filings stored as fixtures. Extraction runs against them; output compared to JSONL golden files. CI fails on any delta.

**When to use:** Nightly CI gate. Protects against model behavior changes when model version is pinned.

**Example — `apps/langextract/tests/test_regression.py`:**
```python
import pytest
import json
from pathlib import Path

GOLDEN_DIR = Path(__file__).parent / "golden"
FIXTURES_DIR = Path(__file__).parent / "fixtures"  # Real EDGAR filing texts

@pytest.mark.parametrize("filing_fixture", list(FIXTURES_DIR.glob("*.txt")))
def test_extraction_regression(filing_fixture, data_regression):
    filing_text = filing_fixture.read_text()
    filing_type = filing_fixture.stem.split("_")[0]  # e.g. "s4_microsoft_2024"

    result = run_extraction_sync(filing_text, filing_type)

    # Serialize to comparable dict; data_regression.check() diffs against golden
    extraction_output = [
        {
            "extraction_class": e.extraction_class,
            "extraction_text": e.extraction_text,
            "start_pos": e.char_interval.start_pos if e.char_interval else None,
            "end_pos": e.char_interval.end_pos if e.char_interval else None,
            "attributes": e.attributes,
        }
        for e in result.extractions
    ]
    data_regression.check(extraction_output)
```

### Anti-Patterns to Avoid

- **Passing full 500-page raw content in job payload**: BullMQ job data has Redis size limits. For very large filings, pass `filing_id` only and have the Python worker fetch `rawContent` from DB. Keep job payloads under 50KB.
- **Using aliased model IDs**: `gemini-2.5-pro` is the stable pinned ID; never use `gemini-2.5-pro-latest` or similar aliases — model behavior changes break the regression test.
- **Writing clauses without firm_id**: The `clauses` table has firm-level RLS. Every row must have a valid `firm_id`. The Python service receives `firm_ids` (plural) from the job data and inserts one row per firm.
- **Running materiality scoring in the frontend**: EXTRACT-07 requires scores stored in DB. The Python service computes scores at extraction time and stores in `events.materiality_score`.
- **Calling `lx.extract()` synchronously in async context**: LangExtract's `lx.extract()` is blocking. Wrap in `asyncio.to_thread()` or run in a thread pool to avoid blocking the BullMQ async event loop.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Long document chunking | Custom sliding-window chunker | `lx.extract()` `max_char_buffer` + `extraction_passes` | LangExtract handles chunk overlap, deduplication, and recall optimization internally |
| Source character offset tracking | Custom regex/offset calculator | `extraction.char_interval.start_pos/end_pos` | LangExtract grounding is aligned to the original text via internal tokenizer; DIY offsets will drift on edge cases |
| Golden file diff assertions | Custom JSON comparator | `pytest-regressions` `data_regression.check()` | Handles JSONL, produces readable diffs, integrates with `--gen-files` flag to regenerate |
| Retry logic for extraction jobs | Custom try/except loop | BullMQ `attempts: 3` + exponential backoff (already configured in `ingestion.ts`) | BullMQ retry is already configured; Python worker inherits it |
| Cross-language queue protocol | Custom message format | BullMQ's native cross-language support | BullMQ explicitly supports Node.js → Python job handoff via shared Redis format |

**Key insight:** LangExtract's built-in chunking + parallel processing is the entire reason this library was chosen. Do not replicate it. Configure it.

---

## Common Pitfalls

### Pitfall 1: Raw content too large for BullMQ job payload
**What goes wrong:** A 500-page S-4 plain text is typically 400-800KB. Passing this inline in the BullMQ job payload puts it in Redis, which has no size limit but is memory-expensive and can hit default configuration limits.
**Why it happens:** `edgar_download` handler stores content in DB and could pass it inline for convenience.
**How to avoid:** Pass only `filingId` in the `llm_extract` job. Have the Python worker fetch `rawContent` from DB via a single SELECT. For filings under 50KB (most 8-K), inline is acceptable.
**Warning signs:** Redis memory alerts; BullMQ `ENOMEM` errors.

### Pitfall 2: `lx.extract()` blocking the asyncio event loop
**What goes wrong:** BullMQ Python worker uses asyncio. `lx.extract()` makes synchronous Gemini API calls internally. Calling it directly in the async `process` function blocks the entire event loop, preventing other jobs from being processed.
**Why it happens:** LangExtract is not async-native despite running in an async context.
**How to avoid:** `result = await asyncio.to_thread(lx.extract, ...)` — runs extraction in a thread pool without blocking the event loop.
**Warning signs:** Worker processes one job at a time even with `concurrency > 1` set.

### Pitfall 3: Drizzle enum migration ordering
**What goes wrong:** Adding new values to a Postgres enum (`ClauseType`) and using them in the same migration transaction causes `"New enum values must be committed before they can be used"` error.
**Why it happens:** Postgres requires a transaction commit between `ALTER TYPE ADD VALUE` and using the new value.
**How to avoid:** Split into two separate Drizzle migrations: (1) `ALTER TYPE ADD VALUE` for new ClauseType values, (2) any queries that use those values. Run `drizzle-kit generate` twice, or use `sql` template in the migration to `COMMIT` between steps.
**Warning signs:** Migration fails at the second ALTER statement; `psycopg.errors.InvalidEnumValue`.

### Pitfall 4: Analyst-verified clauses overwritten on re-extraction
**What goes wrong:** When a new S-4/A amendment triggers re-extraction, the Python service overwrites all clauses including ones the analyst has manually corrected.
**Why it happens:** Simple `ON CONFLICT DO UPDATE` or `DELETE + INSERT` patterns don't check analyst verification status.
**How to avoid:** The insert/update query must check `analyst_verified = FALSE` before overwriting:
```sql
INSERT INTO clauses (...) VALUES (...)
ON CONFLICT (filing_id, type) DO UPDATE SET
  verbatim_text = EXCLUDED.verbatim_text,
  source_location = EXCLUDED.source_location,
  extracted_at = EXCLUDED.extracted_at
WHERE clauses.analyst_verified = FALSE
```
**Warning signs:** Analysts complain their corrections disappear after new filings come in.

### Pitfall 5: few-shot `extraction_text` must be verbatim
**What goes wrong:** Few-shot examples with paraphrased or summarized `extraction_text` cause LangExtract to output non-grounded extractions (low alignment scores, missing `char_interval`).
**Why it happens:** LangExtract uses string alignment to map `extraction_text` back to source document character positions. Any deviation from verbatim text breaks alignment.
**How to avoid:** When creating examples: copy-paste directly from the EDGAR filing text. Never paraphrase. LangExtract docs explicitly warn: "extraction_text should ideally be verbatim from the example's text (no paraphrasing), listed in order of appearance."
**Warning signs:** `alignment_status` field on extractions shows `FAILED`; `char_interval` is None on most extractions.

### Pitfall 6: Model aliasing breaks nightly regression
**What goes wrong:** Using `gemini-2.5-pro-latest` or `gemini-2.5-flash-latest` as the `model_id` means Google can silently update the model underneath the pinned version. Nightly regression test then fails unexpectedly not due to code changes but model changes.
**Why it happens:** Aliased model IDs (`-latest`, no version suffix) auto-update.
**How to avoid:** Use the stable non-aliased model ID: `gemini-2.5-pro` (confirmed stable, non-auto-updating per Google docs; no three-digit suffix). For Flash: `gemini-2.5-flash`.
**Warning signs:** CI nightly regression fails without any code changes; extraction delta on known-good filings.

### Pitfall 7: Python service not in pnpm workspace
**What goes wrong:** `pnpm dev` or `pnpm build` scripts that use `--filter ./apps/*` include `apps/langextract/` and try to run `pnpm install` or `pnpm dev` on a Python project that has no `package.json`.
**Why it happens:** pnpm workspace patterns glob `apps/*`.
**How to avoid:** Add a minimal `package.json` to `apps/langextract/` with the Python start script exposed as an npm script:
```json
{
  "name": "@j16z/langextract",
  "version": "0.1.0",
  "scripts": {
    "dev": "python worker.py",
    "test": "pytest tests/",
    "install": "pip install -r requirements.txt"
  }
}
```
This lets pnpm orchestrate the Python worker alongside Node.js apps without breaking workspace commands.

---

## Code Examples

Verified patterns from official sources:

### LangExtract: Basic M&A Clause Extraction Setup
```python
# Source: github.com/google/langextract README + core/data.py
import langextract as lx
from langextract.data import ExampleData, Extraction

# Few-shot example (verbatim text required — no paraphrasing)
examples = [
    ExampleData(
        text="""
        8.1 Termination Fee. If this Agreement is terminated by Parent pursuant to
        Section 8.1(c)(i) or Section 8.1(c)(iii), the Company shall pay to Parent
        a fee equal to $2,100,000,000 (the "Termination Fee").
        """,
        extractions=[
            Extraction(
                extraction_class="TERMINATION_FEE",
                extraction_text="a fee equal to $2,100,000,000 (the \"Termination Fee\")",
                attributes={"amount": "$2,100,000,000", "direction": "company_to_parent"}
            ),
        ]
    )
]

# Extract from S-4 content (lx.extract is synchronous — use asyncio.to_thread in async context)
result = lx.extract(
    text_or_documents=filing_content,
    prompt_description="Extract M&A deal clauses with exact verbatim text...",
    examples=examples,
    model_id="gemini-2.5-pro",       # Pinned stable model
    extraction_passes=5,              # 5 passes for 500-page legal documents
    max_workers=10,                   # 10 workers (accuracy over throughput)
    max_char_buffer=800,              # 800 char chunks for legal text
)

# Access results
for extraction in result.extractions:
    print(extraction.extraction_class)          # "TERMINATION_FEE"
    print(extraction.extraction_text)           # verbatim quote
    print(extraction.char_interval.start_pos)   # e.g. 52340
    print(extraction.char_interval.end_pos)     # e.g. 52412
    print(extraction.attributes)               # {"amount": "$2.1B", ...}
```

### BullMQ Python Worker Setup
```python
# Source: docs.bullmq.io/python/introduction
import asyncio
import os
from bullmq import Worker

async def process(job, job_token):
    filing_id = job.data['filing_id']
    filing_type = job.data['filing_type']
    # ... route to pipeline
    return {"status": "extracted", "clause_count": n}

worker = Worker(
    'ingestion',
    process,
    {'connection': os.environ['REDIS_URL']}  # Same Redis as Node.js API
)

asyncio.run(worker.run())
```

### Node.js: Enqueue llm_extract after edgar_download
```typescript
// Source: project pattern from apps/api/src/edgar/download.ts
// After updating filing with rawContent:
await ingestionQueue.add('llm_extract', {
  filingId: inserted.id,
  filingType: filing.filingType,
  dealId: matchResult.dealId,
  firmIds: matchResult.firmIds,
  // NOTE: Do NOT inline rawContent for large filings (>50KB)
  // Python worker will fetch from DB via filingId
});
```

### Drizzle: Expand ClauseType enum (migration)
```typescript
// Migration 1: Add new enum values (must commit before using)
// In a new Drizzle migration file:
import { sql } from 'drizzle-orm';

export async function up(db) {
  // Each ALTER TYPE runs in its own implicit transaction in Postgres
  await db.execute(sql`ALTER TYPE clause_type ADD VALUE IF NOT EXISTS 'GO_SHOP'`);
  await db.execute(sql`ALTER TYPE clause_type ADD VALUE IF NOT EXISTS 'TICKING_FEE'`);
  await db.execute(sql`ALTER TYPE clause_type ADD VALUE IF NOT EXISTS 'HELL_OR_HIGH_WATER'`);
  await db.execute(sql`ALTER TYPE clause_type ADD VALUE IF NOT EXISTS 'SPECIFIC_PERFORMANCE'`);
  await db.execute(sql`ALTER TYPE clause_type ADD VALUE IF NOT EXISTS 'NO_SHOP'`);
  await db.execute(sql`ALTER TYPE clause_type ADD VALUE IF NOT EXISTS 'MATCHING_RIGHTS'`);
  await db.execute(sql`ALTER TYPE clause_type ADD VALUE IF NOT EXISTS 'OTHER'`);
}
// Migration 2 (separate): Add new columns to clauses table
// confidence_score NUMERIC nullable, analyst_verified BOOLEAN DEFAULT FALSE
```

### Materiality Scoring in Python (port from TypeScript)
```python
# Source: apps/j16z-frontend/src/lib/materiality-scoring.ts (port)
BASE_SCORES = {
    "AGENCY:FTC_COMPLAINT": 95,
    "AGENCY:FTC_SECOND_REQUEST": 85,
    "FILING:S4_DEFM14A": 80,
    "FILING:8K_AMENDMENT": 60,
    "COURT:INJUNCTION_GRANTED": 90,
    # ... all event types from materiality-scoring.ts
}

def calculate_materiality_score(
    event_type: str,
    subtype: str | None,
    days_to_outside_date: int | None = None,
    p_close: float | None = None,
    litigation_count: int | None = None,
) -> int:
    key = f"{event_type}:{subtype}" if subtype else f"{event_type}:DEFAULT"
    base = BASE_SCORES.get(key, BASE_SCORES.get(f"{event_type}:DEFAULT", 50))
    urgency = 20 if days_to_outside_date is not None and days_to_outside_date < 30 else 0
    risk = 15 if p_close is not None and p_close < 40 else 0
    litigation = 10 if litigation_count is not None and litigation_count > 3 else 0
    return max(0, min(100, base + urgency + risk + litigation))
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom regex extraction for legal clauses | LangExtract few-shot LLM extraction with source grounding | 2024 (LangExtract initial release) | No regex maintenance; handles free-form legal language; verbatim grounding |
| Chunking legal docs manually (sliding window) | `lx.extract()` `max_char_buffer` + `extraction_passes` | LangExtract 1.0+ | Chunking is handled by library; researchers tested `max_char_buffer=800, passes=5` for legal docs |
| Single monolithic extraction prompt | Per-filing-type pipelines with tailored prompts | Best practice emerging 2024-2025 | S-4/DEFM14A has 500+ pages; 8-K has 2-5 pages — same prompt does not generalize |
| Run extraction in Node.js (OpenAI SDK) | Dedicated Python service (LangExtract is Python-only) | Phase 3 architectural decision | LangExtract has no Node.js SDK |
| Store confidence scores in application memory | Store `materiality_score` in DB (EXTRACT-07) | Phase 3 requirement | Enables DB-sorted Inbox by score; enables nightly regression diffs |

**Deprecated/outdated:**
- `LANGEXTRACT_API_KEY` vs `GOOGLE_API_KEY`: LangExtract accepts both; use `LANGEXTRACT_API_KEY` as the variable name per CONTEXT.md locked decision — it maps to the same Google API key
- Gemini preview model IDs (e.g., `gemini-2.5-pro-preview-06-05`): Replaced by stable `gemini-2.5-pro` (confirmed stable per Google docs as of mid-2025)

---

## Open Questions

1. **Job payload size vs DB fetch tradeoff**
   - What we know: `rawContent` for S-4 filings can be 400-800KB plain text; Redis handles large values but it's wasteful
   - What's unclear: At what KB threshold should the Python worker fetch from DB vs receive inline? 50KB is a reasonable heuristic but not benchmarked
   - Recommendation: Default to DB fetch (pass `filingId` only); add inline as optimization if benchmark shows DB round-trip is bottleneck

2. **BullMQ Python worker job name filtering**
   - What we know: Python worker subscribes to the `ingestion` queue which also receives `edgar_poll` and `edgar_download` jobs intended for Node.js workers
   - What's unclear: Whether BullMQ Python worker will error on jobs it doesn't have handlers for, or silently skip
   - Recommendation: Either (a) add a separate `extraction` queue for `llm_extract` jobs (cleanest), or (b) filter in the Python worker's `process` function by `job.name`. Research BullMQ Python docs to confirm behavior before implementation.

3. **psycopg vs supabase-py for Python DB writes**
   - What we know: `supabase-py` provides a higher-level client with RLS awareness; `psycopg3` is lower-level but faster and uses direct Postgres connection (same as `adminDb` in Node.js which bypasses RLS)
   - What's unclear: Whether the Python service should use service-role (bypass RLS) like `adminDb` or go through the API layer
   - Recommendation: Use `psycopg3` with `DATABASE_URL` (direct Postgres on port 5432) and service-role pattern — consistent with how `adminDb` works in Node.js. This is LOW confidence — verify connection string format with Supabase pooler docs.

4. **Confidence score calculation**
   - What we know: LangExtract returns `alignment_status` (an AlignmentStatus enum) but not a numeric confidence score out of the box
   - What's unclear: Whether `alignment_status` has enough resolution to derive a 0-1 confidence score, or whether we need to use a separate Gemini self-evaluation call
   - Recommendation: Use `alignment_status` as a proxy: ALIGNED → high confidence (0.9), APPROXIMATE → medium (0.6), FAILED → low (0.3). Flag FAILED extractions with warning icon per locked decision.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-regressions |
| Config file | `apps/langextract/pyproject.toml` (Wave 0) |
| Quick run command | `pytest tests/test_unit.py -x` |
| Full suite command | `pytest tests/ -v` |
| Nightly regression | `pytest tests/test_regression.py -v` (CI gate) |

Note: The monorepo root uses Vitest for TypeScript tests. Python service uses pytest independently. The root `pnpm test` script runs Vitest — add a separate CI step for `cd apps/langextract && pytest`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXTRACT-01 | Python worker starts and processes `llm_extract` jobs from queue | smoke | `pytest tests/test_worker.py::test_worker_starts -x` | Wave 0 |
| EXTRACT-02 | All required ClauseType values extracted from S-4 sample | unit | `pytest tests/test_s4_pipeline.py::test_extracts_required_clauses -x` | Wave 0 |
| EXTRACT-03 | Every extracted clause has non-null `char_interval` (source grounding) | unit | `pytest tests/test_s4_pipeline.py::test_all_clauses_have_grounding -x` | Wave 0 |
| EXTRACT-04 | Few-shot examples load and guide extraction correctly | unit | `pytest tests/test_pipelines.py::test_example_loading -x` | Wave 0 |
| EXTRACT-05 | 500-char test document with 10+ chunks processes without timeout (30s) | integration | `pytest tests/test_s4_pipeline.py::test_long_document_chunking -x` | Wave 0 |
| EXTRACT-06 | Summary LLM call produces 2-3 sentence output for each filing | unit | `pytest tests/test_summaries.py::test_summary_length -x` | Wave 0 |
| EXTRACT-07 | Materiality score stored in DB events table matches TypeScript logic | unit | `pytest tests/test_materiality.py::test_score_matches_ts_logic -x` | Wave 0 |
| REGRESSION | 20 golden filings produce identical extraction output | regression | `pytest tests/test_regression.py -v` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pytest tests/test_unit.py -x` (fast, no Gemini calls — mock the LLM)
- **Per wave merge:** `pytest tests/ -v` excluding `test_regression.py` (avoids Gemini API cost)
- **Phase gate:** `pytest tests/test_regression.py -v` — full golden file regression with live Gemini API calls

### Wave 0 Gaps

- [ ] `apps/langextract/tests/conftest.py` — shared fixtures; mock `lx.extract()` for unit tests; real extraction for regression tests
- [ ] `apps/langextract/tests/test_worker.py` — BullMQ Python worker smoke tests
- [ ] `apps/langextract/tests/test_s4_pipeline.py` — S-4 pipeline unit tests
- [ ] `apps/langextract/tests/test_eightk_pipeline.py` — 8-K pipeline unit tests
- [ ] `apps/langextract/tests/test_materiality.py` — Python materiality scoring matches TS logic
- [ ] `apps/langextract/tests/test_regression.py` — golden file regression harness
- [ ] `apps/langextract/tests/golden/` — 20 golden JSONL files (created during bootstrap sprint)
- [ ] `apps/langextract/tests/fixtures/` — 20 real EDGAR filing plain-text fixtures
- [ ] `apps/langextract/pyproject.toml` — pytest config, dependency declarations
- [ ] Framework install: `pip install pytest pytest-regressions` (in `apps/langextract/`)

---

## Sources

### Primary (HIGH confidence)

- `github.com/google/langextract` — LangExtract README, API parameters, ExtractionClass/ExampleData definitions verified from `langextract/core/data.py`
- `pypi.org/project/langextract/` — Version 1.1.1, released November 27, 2025; Python >=3.10 requirement
- `docs.bullmq.io/python/introduction` — Python BullMQ Worker API; cross-language queue confirmed
- `ai.google.dev/gemini-api/docs/models` — Gemini model versioning; `gemini-2.5-pro` confirmed as stable non-aliased ID
- `apps/api/src/db/schema.ts` — Existing `clauses` table columns (`verbatimText`, `sourceLocation`, `extractedAt`, `filingId`); `events` table has `materialityScore` and `severity`
- `apps/j16z-frontend/src/lib/materiality-scoring.ts` — Full TypeScript materiality scoring logic to port to Python
- `apps/api/src/worker.ts` — Existing BullMQ worker pattern; `handlers` registry; graceful shutdown
- `apps/api/src/edgar/download.ts` — Stage 2 handler; injection point for Stage 3 `llm_extract` job enqueue

### Secondary (MEDIUM confidence)

- DataCamp LangExtract tutorial (403 blocked, referenced via WebSearch result): legal document recommendations `max_char_buffer=800`, `extraction_passes=5`, `max_workers=10`
- `github.com/google/langextract` issues + DeepWiki: `AlignmentStatus` enum for confidence calculation; `char_interval` JSONL output format `{"start_pos": 52, "end_pos": 70}`
- Google Gemini model versioning blog (search result): `gemini-2.5-pro` is stable, `gemini-2.5-pro-preview-06-05` was the preview form; stable form confirmed non-auto-updating
- `drizzle-team/drizzle-orm` discussions: `ALTER TYPE ADD VALUE IF NOT EXISTS` + separate migration transaction requirement for enum expansion

### Tertiary (LOW confidence)

- Confidence score calculation from `alignment_status` values (ALIGNED/APPROXIMATE/FAILED) mapped to 0.9/0.6/0.3 — inferred from LangExtract behavior description, not verified against official docs
- `psycopg3` vs `supabase-py` for Python DB writes — recommended based on analogy with `adminDb` pattern; not verified against Supabase pooler compatibility
- BullMQ Python worker behavior on unrecognized job names (`edgar_poll`, `edgar_download`) — not explicitly documented; flagged as Open Question 2

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — LangExtract version confirmed on PyPI; BullMQ Python confirmed via official docs; Gemini model IDs confirmed
- Architecture: HIGH — based on verified LangExtract data classes and existing project patterns from schema.ts and worker.ts
- Pitfalls: MEDIUM-HIGH — LangExtract verbatim text requirement and enum migration issue verified from official sources; payload size and asyncio blocking are standard distributed systems pitfalls

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (LangExtract is actively developed — recheck for 1.2.x before implementation if more than 2 weeks elapse)
