---
phase: 03-llm-extraction-pipeline
plan: 2
subsystem: extraction-pipelines
tags: [python, langextract, gemini, llm, clause-extraction, few-shot, s4, 8k, 13d, 13g, analyst-summary]

requires:
  - phase: 03-01
    provides: Python langextract scaffold, db.py insert_clause/mark_filing_extracted/insert_filing_summary, worker.py routing stubs

provides:
  - S-4/DEFM14A extraction pipeline extracting all 12 M&A clause types (TERMINATION_FEE, REVERSE_TERMINATION_FEE, MAE, REGULATORY_EFFORTS, etc.)
  - 8-K extraction pipeline (MATERIAL_EVENT, AMENDMENT, ENTRY_EXIT, COMPLETION, OTHER)
  - 13D/13G extraction pipeline (OWNERSHIP_STAKE, PURPOSE_OF_TRANSACTION, SOURCE_OF_FUNDS)
  - Versioned JSONL few-shot examples for all three filing types
  - Post-extraction analyst summary generation: headline (all types) + section (S-4/DEFM14A only)
  - Delta-aware summaries comparing amended filings against prior extraction
  - AlignmentStatus confidence scoring: MATCH_EXACT=0.9, MATCH_GREATER/LESSER=0.7, MATCH_FUZZY=0.6, null=0.3

affects:
  - 03-03 (Plan 3 — any further pipeline integration or scoring)
  - Phase 5 (alerting — uses summaries for digest content)

tech-stack:
  added:
    - langextract==1.1.1 (lx.extract with few-shot ExampleData, CharInterval, AlignmentStatus)
    - google-generativeai>=0.8.0 (Gemini Flash for post-extraction summaries)
  patterns:
    - asyncio.to_thread() wrapping for lx.extract() (synchronous blocking call in async context)
    - Per-firm insert_clause loop (multi-tenant isolation — one row per firm per clause)
    - Two-level summary: headline for all types, section-level for S-4/DEFM14A only
    - Non-blocking summary generation: failure falls back to "Summary generation failed — review extracted clauses directly."
    - AlignmentStatus confidence scoring (not ALIGNED/APPROXIMATE/FAILED — actual langextract enum)
    - Few-shot examples as versioned JSONL files loaded at extraction time

key-files:
  created:
    - apps/langextract/pipelines/s4_defm14a.py
    - apps/langextract/pipelines/eightk.py
    - apps/langextract/pipelines/thirteend_g.py
    - apps/langextract/examples/s4_examples.jsonl
    - apps/langextract/examples/eightk_examples.jsonl
    - apps/langextract/examples/thirteend_examples.jsonl
    - apps/langextract/summaries/analyst_summary.py
    - apps/langextract/tests/test_s4_pipeline.py
    - apps/langextract/tests/test_eightk_pipeline.py
    - apps/langextract/tests/test_thirteend_pipeline.py
    - apps/langextract/tests/test_summaries.py
  modified: []

key-decisions:
  - "langextract 1.1.1 AlignmentStatus uses MATCH_EXACT/MATCH_GREATER/MATCH_LESSER/MATCH_FUZZY — NOT ALIGNED/APPROXIMATE/FAILED as RESEARCH.md stated; confidence mapping adjusted accordingly"
  - "S-4 uses gemini-2.5-pro, 8-K and 13D/13G use gemini-2.5-flash (per locked plan decision)"
  - "Section summary called only for S-4/DEFM14A; 8-K and 13D/13G get headline only (per locked decision)"
  - "lx.extract() returns AnnotatedDocument or list[AnnotatedDocument]; pipeline normalises to list before iterating"
  - "google.generativeai package is deprecated (FutureWarning); google.genai is the replacement — flagged for future migration, not blocking now since pyproject.toml pins google-generativeai>=0.8.0"

patterns-established:
  - "Pipeline isolation pattern: each filing type has independent module with its own prompt, model, chunking config, example loader"
  - "asyncio.to_thread() is mandatory for all lx.extract() calls — enforced by test_s4_pipeline_uses_asyncio_to_thread"
  - "Confidence scoring uses 4-tier AlignmentStatus ladder, not binary aligned/not-aligned"
  - "Multi-tenant clause writes: iterate firm_ids and call insert_clause once per firm (not batch)"

requirements-completed: [EXTRACT-02, EXTRACT-03, EXTRACT-04, EXTRACT-06]

duration: ~8min
completed: 2026-03-01
---

# Phase 3 Plan 2: LLM Extraction Pipelines Summary

**Three per-filing-type LangExtract extraction pipelines (S-4/DEFM14A using gemini-2.5-pro, 8-K and 13D/13G using gemini-2.5-flash) with versioned JSONL few-shot examples, char_interval source grounding, and post-extraction two-level analyst summaries via Gemini API.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-01T22:00:49Z
- **Completed:** 2026-03-01T22:08:51Z
- **Tasks:** 2
- **Files modified/created:** 11

## Accomplishments

- Full S-4/DEFM14A pipeline extracting all 12 M&A clause types with verbatim text and char_interval source grounding
- 8-K and 13D/13G pipelines with appropriate model, chunking, and extraction class mappings
- Versioned JSONL few-shot examples (4 for S-4, 2 for 8-K, 2 for 13D/13G) with realistic M&A clause text
- Post-extraction analyst summary module with headline, section, and delta-aware generation via Gemini Flash
- 45 total tests passing (24 pipeline + 12 summary + 9 carry-forward from 03-01)

## Task Commits

1. **Task 1: S-4/DEFM14A, 8-K, 13D/13G pipelines + few-shot examples + pipeline tests** - `756014a` (feat)
2. **Task 2: Post-extraction analyst summary generation** - `3da04b0` (feat)

## Files Created/Modified

- `apps/langextract/pipelines/s4_defm14a.py` — Full S-4/DEFM14A pipeline: gemini-2.5-pro, extraction_passes=5, all 12 clause types, confidence scoring, asyncio.to_thread()
- `apps/langextract/pipelines/eightk.py` — 8-K pipeline: gemini-2.5-flash, extraction_passes=3, 5 event classes mapped to OTHER
- `apps/langextract/pipelines/thirteend_g.py` — 13D/13G pipeline: gemini-2.5-flash, OWNERSHIP_STAKE/PURPOSE_OF_TRANSACTION/SOURCE_OF_FUNDS
- `apps/langextract/examples/s4_examples.jsonl` — 4 verbatim S-4 few-shot examples (termination fee, RTF, regulatory efforts, MAE)
- `apps/langextract/examples/eightk_examples.jsonl` — 2 8-K examples (merger signed, FTC second request)
- `apps/langextract/examples/thirteend_examples.jsonl` — 2 13D examples (ownership stake, activist intent)
- `apps/langextract/summaries/analyst_summary.py` — generate_headline_summary(), generate_section_summary(), generate_delta_summary()
- `apps/langextract/tests/test_s4_pipeline.py` — 10 tests including long document chunking (<30s with mocked extraction)
- `apps/langextract/tests/test_eightk_pipeline.py` — 7 tests
- `apps/langextract/tests/test_thirteend_pipeline.py` — 7 tests
- `apps/langextract/tests/test_summaries.py` — 12 tests with mocked Gemini API

## Decisions Made

1. **AlignmentStatus confidence mapping corrected to actual enum values**: langextract 1.1.1 uses `MATCH_EXACT`, `MATCH_GREATER`, `MATCH_LESSER`, `MATCH_FUZZY` — not `ALIGNED`, `APPROXIMATE`, `FAILED` as the plan's RESEARCH.md stated. Confidence ladder: EXACT=0.9, GREATER/LESSER=0.7, FUZZY=0.6, null=0.3.

2. **lx.extract() return type handled as list**: `lx.extract(text_or_documents=str, ...)` returns `AnnotatedDocument` (single) or `list[AnnotatedDocument]` (multiple). Pipeline normalises to list before iterating extractions.

3. **google.generativeai FutureWarning acknowledged**: The installed `google-generativeai>=0.8.0` package (as specified in pyproject.toml) shows a deprecation warning recommending migration to `google.genai`. Not breaking now; flagged for future migration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AlignmentStatus enum values corrected**
- **Found during:** Task 1 — empirical library inspection before implementation
- **Issue:** RESEARCH.md stated `AlignmentStatus` has values `ALIGNED`, `APPROXIMATE`, `FAILED`. The actual langextract 1.1.1 library uses `MATCH_EXACT`, `MATCH_GREATER`, `MATCH_LESSER`, `MATCH_FUZZY`. Using the plan's enum names would cause `AttributeError` at runtime.
- **Fix:** Used actual enum values: `AlignmentStatus.MATCH_EXACT` (→0.9), `MATCH_GREATER/LESSER` (→0.7), `MATCH_FUZZY` (→0.6). Added a 4-tier ladder instead of the plan's 3-tier.
- **Files modified:** `pipelines/s4_defm14a.py`, `pipelines/eightk.py`, `pipelines/thirteend_g.py`
- **Verification:** `test_s4_pipeline_confidence_score_from_alignment_status` passes with all 4 enum values
- **Committed in:** 756014a (Task 1)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in RESEARCH.md documentation of library API)
**Impact on plan:** Auto-fix necessary for correctness. No scope creep. Confidence scoring intent preserved.

## Issues Encountered

- `google.generativeai` deprecation warning appears in test output — not a test failure but worth tracking for future migration to `google.genai` SDK.

## Next Phase Readiness

- All three extraction pipelines ready to receive real EDGAR filing text from worker.py routing
- Analyst summaries ready for integration with Inbox event feed (Phase 5)
- Few-shot examples are versioned JSONL and can be expanded with real filing excerpts during empirical testing sprint (flagged in Phase 3 blockers)

---
*Phase: 03-llm-extraction-pipeline*
*Completed: 2026-03-01*

## Self-Check: PASSED

All created files verified present. All task commits verified in git history.

| Check | Result |
|-------|--------|
| apps/langextract/pipelines/s4_defm14a.py | FOUND |
| apps/langextract/pipelines/eightk.py | FOUND |
| apps/langextract/pipelines/thirteend_g.py | FOUND |
| apps/langextract/examples/s4_examples.jsonl | FOUND |
| apps/langextract/examples/eightk_examples.jsonl | FOUND |
| apps/langextract/examples/thirteend_examples.jsonl | FOUND |
| apps/langextract/summaries/analyst_summary.py | FOUND |
| apps/langextract/tests/test_s4_pipeline.py | FOUND |
| apps/langextract/tests/test_eightk_pipeline.py | FOUND |
| apps/langextract/tests/test_thirteend_pipeline.py | FOUND |
| apps/langextract/tests/test_summaries.py | FOUND |
| Commit 756014a (Task 1 — pipelines + examples + tests) | FOUND |
| Commit 3da04b0 (Task 2 — analyst summary + tests) | FOUND |
