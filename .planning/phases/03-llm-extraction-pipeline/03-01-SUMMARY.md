---
phase: 03-llm-extraction-pipeline
plan: 1
subsystem: extraction-infrastructure
tags: [python, bullmq, drizzle, schema, cross-language-queue]
dependency_graph:
  requires: []
  provides:
    - llm_extract job protocol (filingId, filingType, dealId, firmIds)
    - Python BullMQ worker subscribed to ingestion queue
    - DB columns: clauses.confidence_score, clauses.analyst_verified, filings.headline_summary, filings.section_summary
  affects:
    - apps/api/src/edgar/download.ts (Stage 3 enqueue added)
    - apps/api/src/db/schema.ts (new columns)
    - apps/langextract/ (new Python service)
tech_stack:
  added:
    - psycopg3 (psycopg[binary]>=3.1.0) — direct Postgres connection for Python service
    - psycopg-pool — async connection pooling
    - bullmq (Python) >=2.19.5 — cross-language queue consumer
    - python-dotenv — env file loading
    - pytest + pytest-asyncio — Python unit test framework
  patterns:
    - BullMQ cross-language queue (Node.js enqueue → Python consume)
    - Per-filing-type pipeline dispatch (routing in worker.py process())
    - Service-role DB pattern via DATABASE_URL (no RLS, consistent with adminDb)
    - Lazy pipeline imports inside process() for clean dependency isolation
key_files:
  created:
    - apps/langextract/pyproject.toml
    - apps/langextract/requirements.txt
    - apps/langextract/.env.example
    - apps/langextract/.gitignore
    - apps/langextract/package.json
    - apps/langextract/worker.py
    - apps/langextract/db.py
    - apps/langextract/pipelines/__init__.py
    - apps/langextract/pipelines/s4_defm14a.py
    - apps/langextract/pipelines/eightk.py
    - apps/langextract/pipelines/thirteend_g.py
    - apps/langextract/scoring/__init__.py
    - apps/langextract/summaries/__init__.py
    - apps/langextract/examples/.gitkeep
    - apps/langextract/tests/__init__.py
    - apps/langextract/tests/conftest.py
    - apps/langextract/tests/test_worker.py
    - apps/api/drizzle/0001_melodic_gunslinger.sql
  modified:
    - apps/api/src/db/schema.ts
    - apps/api/src/edgar/download.ts
    - apps/api/src/worker.ts
decisions:
  - Python mock patching target is db.fetch_filing_content (not worker.fetch_filing_content) because worker.py uses lazy local imports inside the process() function; patching at the module-level source (db module) correctly intercepts all calls
  - Raw content excluded from llm_extract job payload per Pitfall 1: S-4 files are 400-800KB; Python worker fetches from DB via filingId
  - psycopg3 chosen over supabase-py for Python DB writes — consistent with adminDb service-role pattern in Node.js; direct Postgres on DATABASE_URL
  - Pipeline imports are lazy (inside process()) to avoid circular dependencies and allow mocking without importing full pipeline module trees
metrics:
  duration_seconds: 406
  duration_display: "~7 min"
  tasks_completed: 3
  tasks_total: 3
  files_created: 17
  files_modified: 3
  completed_date: "2026-03-01"
---

# Phase 3 Plan 1: LLM Extraction Infrastructure Summary

**One-liner:** Cross-language BullMQ scaffold connecting Node.js edgar_download to Python langextract service via shared Redis queue, with expanded Drizzle schema for extraction confidence and analyst verification.

## What Was Built

### Task 1: DB Schema Expansion (commit 6b5f9e6)

Expanded the `clauses` table with two new columns for extraction quality tracking:
- `confidence_score` (numeric, nullable) — stores 0-1 float derived from LangExtract `alignment_status` (ALIGNED→0.9, APPROXIMATE→0.6, FAILED→0.3)
- `analyst_verified` (boolean, default false) — guards analyst corrections from re-extraction overwrites

Expanded the `filings` table with two new summary columns:
- `headline_summary` (text, nullable) — 2-3 sentence analyst summary for Inbox feed
- `section_summary` (text, nullable) — expandable section-level summary for S-4/DEFM14A

The `type` column in clauses was already `text` (not a Postgres enum), so no `ALTER TYPE` migration was needed. Instead, valid ClauseType values are documented in a code comment: TERMINATION_FEE, REVERSE_TERMINATION_FEE, MAE, REGULATORY_EFFORTS, LITIGATION_CONDITION, FINANCING_CONDITION, GO_SHOP, TICKING_FEE, HELL_OR_HIGH_WATER, SPECIFIC_PERFORMANCE, NO_SHOP, MATCHING_RIGHTS, OTHER.

Drizzle migration generated: `apps/api/drizzle/0001_melodic_gunslinger.sql`

### Task 2: Python Service Scaffold (commit 2888fbf)

Created the complete `apps/langextract/` Python service:

**Package config (`pyproject.toml`):** Python 3.10+ requirement, pinned langextract==1.1.1, bullmq>=2.19.5, psycopg[binary]>=3.1.0, psycopg-pool, python-dotenv, google-generativeai. Dev extras: pytest, pytest-regressions, pytest-asyncio.

**BullMQ worker (`worker.py`):** Subscribes to the `ingestion` queue (same Redis as Node.js API). Filters by `job.name == 'llm_extract'` — all other jobs (edgar_poll, edgar_download) are silently skipped. Routes by `filing_type` to per-pipeline functions. Fetches rawContent from DB (not from job payload, per Pitfall 1). Includes graceful SIGTERM/SIGINT shutdown.

**DB utilities (`db.py`):** psycopg3 async connection pool, `fetch_filing_content()`, `insert_clause()` with ON CONFLICT DO NOTHING, `mark_filing_extracted()`, `insert_filing_summary()`, `create_extraction_event()`.

**Pipeline stubs:** `s4_defm14a.py`, `eightk.py`, `thirteend_g.py` — each has the correct function signature with logging; actual extraction in Plan 03-02.

**Workspace shim (`package.json`):** `@j16z/langextract` with `dev`, `test`, `install:py` scripts for pnpm monorepo compatibility (Pitfall 7 resolution).

**Tests (9 passing):**
- `test_worker_skips_edgar_poll_job` — filter works
- `test_worker_skips_edgar_download_job` — filter works
- `test_worker_routes_s4_to_s4_pipeline` — S-4 routing
- `test_worker_routes_defm14a_to_s4_pipeline` — DEFM14A routing
- `test_worker_routes_eightk_to_eightk_pipeline` — 8-K routing
- `test_worker_routes_sc13d_to_thirteend_g_pipeline` — SC 13D routing
- `test_worker_routes_sc13g_to_thirteend_g_pipeline` — SC 13G routing
- `test_worker_skips_when_raw_content_is_none` — None rawContent handled
- `test_worker_logs_warning_for_unrecognised_filing_type` — unknown types don't crash

### Task 3: Node.js to Python Job Wiring (commit bb5acdd)

Updated `apps/api/src/edgar/download.ts` to enqueue `llm_extract` after storing rawContent:
1. Query the filing row to get `filingType` and `dealId`
2. Query deals to resolve `firmIds` for multi-tenant event fanout
3. `await ingestionQueue.add('llm_extract', { filingId, filingType, dealId, firmIds })`
4. rawContent is NOT included in the payload — Python worker fetches from DB

Updated `apps/api/src/worker.ts` handler registry comment to document that `llm_extract` jobs are processed by the Python worker. The Node.js worker's existing fallback (warn + skip) handles unknown job names safely.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mock patch target corrected from worker.fetch_filing_content to db.fetch_filing_content**
- **Found during:** Task 2 — first test run
- **Issue:** worker.py uses `from db import fetch_filing_content` inside `process()` as a lazy local import. Patching `worker.fetch_filing_content` fails with `AttributeError` because the name is never bound in the worker module's namespace. The function only exists in `db` module scope.
- **Fix:** Changed all test `patch()` calls to target `db.fetch_filing_content` — where the function actually lives. Python's mock system intercepts at the source module, which works regardless of where it's imported from.
- **Files modified:** `apps/langextract/tests/test_worker.py`
- **Commit:** 2888fbf (included in Task 2 commit)

## Self-Check: PASSED

All created files verified present. All task commits verified in git history.

| Check | Result |
|-------|--------|
| apps/langextract/pyproject.toml | FOUND |
| apps/langextract/worker.py | FOUND |
| apps/langextract/db.py | FOUND |
| apps/langextract/package.json | FOUND |
| apps/langextract/pipelines/s4_defm14a.py | FOUND |
| apps/langextract/pipelines/eightk.py | FOUND |
| apps/langextract/pipelines/thirteend_g.py | FOUND |
| apps/langextract/tests/test_worker.py | FOUND |
| apps/api/drizzle/0001_melodic_gunslinger.sql | FOUND |
| Commit 6b5f9e6 (Task 1 — DB schema) | FOUND |
| Commit 2888fbf (Task 2 — Python scaffold) | FOUND |
| Commit bb5acdd (Task 3 — Node.js wiring) | FOUND |
