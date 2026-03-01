"""
SC 13D / SC 13G extraction pipeline.

Handles filing types: SC 13D, SC 13D/A, SC 13G, SC 13G/A
These are beneficial ownership filings — activist stakes, position changes,
and investment intent (passive vs active).

Model: gemini-2.5-flash (pinned, non-aliased — shorter docs)
Config: extraction_passes=3, max_workers=20, max_char_buffer=1000

NOTE: lx.extract() is synchronous — use asyncio.to_thread() to avoid blocking
the BullMQ event loop (Pitfall 2 in RESEARCH.md).
"""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Optional

import langextract as lx
from langextract.data import AlignmentStatus, CharInterval, ExampleData, Extraction

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt for 13D/13G extraction
# ---------------------------------------------------------------------------

PROMPT = """
Extract beneficial ownership and activist investor details from this SEC Schedule 13D or 13G filing.
For each item, extract the EXACT VERBATIM TEXT as it appears in the document — do not paraphrase.

Classify each extraction into one of these types:
- OWNERSHIP_STAKE: Beneficial ownership percentage and share count
- PURPOSE_OF_TRANSACTION: Filing purpose — passive investment, activist intent, acquisition plan
- SOURCE_OF_FUNDS: Source of funds used to acquire the shares
- OTHER: Any other material disclosure not captured above

For each extraction, include these attributes:
- "percentage": Ownership percentage (e.g., "9.8%")
- "shares_held": Number of shares beneficially owned
- "filing_type": SC 13D (activist) or SC 13G (passive)
- "as_of_date": Date of the ownership position
- "intent": "active" (13D) or "passive" (13G)
""".strip()

# Model: Gemini 2.5 Flash — shorter docs, simpler extraction
MODEL_ID = "gemini-2.5-flash"

# Chunking config
EXTRACTION_PASSES = 3
MAX_WORKERS = 20
MAX_CHAR_BUFFER = 1000

# 13D/13G-specific extraction classes mapped to DB clause types
_CLASS_TO_CLAUSE_TYPE = {
    "OWNERSHIP_STAKE": "OTHER",
    "PURPOSE_OF_TRANSACTION": "OTHER",
    "SOURCE_OF_FUNDS": "OTHER",
    "OTHER": "OTHER",
}


# ---------------------------------------------------------------------------
# Few-shot examples loader
# ---------------------------------------------------------------------------

def load_examples() -> list[ExampleData]:
    """Load versioned few-shot examples from the JSONL file."""
    examples_path = Path(__file__).parent.parent / "examples" / "thirteend_examples.jsonl"
    examples: list[ExampleData] = []

    if not examples_path.exists():
        logger.warning(f"[thirteend_g_pipeline] Examples file not found: {examples_path}")
        return examples

    with examples_path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)
            extractions = [
                Extraction(
                    extraction_class=e["extraction_class"],
                    extraction_text=e["extraction_text"],
                    char_interval=CharInterval(
                        start_pos=e["char_interval"]["start_pos"],
                        end_pos=e["char_interval"]["end_pos"],
                    ) if e.get("char_interval") else None,
                    attributes=e.get("attributes"),
                )
                for e in data.get("extractions", [])
            ]
            examples.append(ExampleData(text=data["text"], extractions=extractions))

    logger.info(f"[thirteend_g_pipeline] Loaded {len(examples)} few-shot examples")
    return examples


# ---------------------------------------------------------------------------
# Confidence score from alignment status
# ---------------------------------------------------------------------------

def get_confidence_score(extraction: Extraction) -> float:
    """Derive confidence score from char_interval and alignment_status."""
    if not extraction.char_interval:
        return 0.3
    if extraction.char_interval.start_pos is None or extraction.char_interval.end_pos is None:
        return 0.3
    status = extraction.alignment_status
    if status == AlignmentStatus.MATCH_EXACT:
        return 0.9
    if status in (AlignmentStatus.MATCH_GREATER, AlignmentStatus.MATCH_LESSER):
        return 0.7
    if status == AlignmentStatus.MATCH_FUZZY:
        return 0.6
    return 0.6


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

async def run_13dg_pipeline(
    filing_id: str,
    deal_id: Optional[str],
    firm_ids: list[str],
    raw_content: str,
) -> None:
    """
    Run SC 13D/13G LangExtract extraction pipeline.

    1. Load few-shot examples
    2. Run lx.extract() wrapped in asyncio.to_thread()
    3. Map ownership classes to clause types, write to DB
    4. Mark filing extracted
    5. Generate headline summary only (no section summary for 13D/13G)
    """
    from db import insert_clause, mark_filing_extracted, insert_filing_summary
    from summaries.analyst_summary import generate_headline_summary

    logger.info(
        f"[thirteend_g_pipeline] Starting extraction — filing_id={filing_id} "
        f"deal_id={deal_id} firm_count={len(firm_ids)} "
        f"content_len={len(raw_content)}"
    )

    examples = load_examples()

    try:
        result = await asyncio.to_thread(
            lx.extract,
            raw_content,
            prompt_description=PROMPT,
            examples=examples,
            model_id=MODEL_ID,
            extraction_passes=EXTRACTION_PASSES,
            max_workers=MAX_WORKERS,
            max_char_buffer=MAX_CHAR_BUFFER,
        )
    except Exception:
        logger.exception(f"[thirteend_g_pipeline] lx.extract() failed for filing {filing_id}")
        raise

    if not isinstance(result, list):
        result = [result]

    all_extractions: list[Extraction] = []
    for doc in result:
        if hasattr(doc, "extractions"):
            all_extractions.extend(doc.extractions)

    logger.info(
        f"[thirteend_g_pipeline] Extracted {len(all_extractions)} items for filing {filing_id}"
    )

    clause_dicts: list[dict] = []

    for extraction in all_extractions:
        raw_class = extraction.extraction_class.upper()
        clause_type = _CLASS_TO_CLAUSE_TYPE.get(raw_class, "OTHER")

        if (
            extraction.char_interval
            and extraction.char_interval.start_pos is not None
            and extraction.char_interval.end_pos is not None
        ):
            source_location = f"{extraction.char_interval.start_pos}:{extraction.char_interval.end_pos}"
        else:
            source_location = ""

        confidence = get_confidence_score(extraction)

        # Build a descriptive title for ownership extractions
        if raw_class == "OWNERSHIP_STAKE" and extraction.attributes:
            pct = extraction.attributes.get("percentage", "")
            title = f"Ownership Stake: {pct}" if pct else "Ownership Stake"
        else:
            title = raw_class.replace("_", " ").title()

        # Summary: combine key ownership attributes
        if extraction.attributes:
            parts = []
            if extraction.attributes.get("percentage"):
                parts.append(f"{extraction.attributes['percentage']} ownership")
            if extraction.attributes.get("intent"):
                parts.append(f"intent={extraction.attributes['intent']}")
            summary = "; ".join(parts) if parts else extraction.extraction_text[:200]
        else:
            summary = extraction.extraction_text[:200]

        for firm_id in firm_ids:
            try:
                await insert_clause(
                    firm_id=firm_id,
                    deal_id=deal_id or "",
                    filing_id=filing_id,
                    clause_type=clause_type,
                    title=title,
                    summary=summary,
                    verbatim_text=extraction.extraction_text,
                    source_location=source_location,
                    confidence_score=confidence,
                )
            except Exception:
                logger.exception(
                    f"[thirteend_g_pipeline] insert_clause failed for firm={firm_id} "
                    f"filing={filing_id}"
                )

        clause_dicts.append({
            "type": raw_class,
            "verbatim_text": extraction.extraction_text,
            "attributes": extraction.attributes or {},
        })

    try:
        await mark_filing_extracted(filing_id)
    except Exception:
        logger.exception(
            f"[thirteend_g_pipeline] mark_filing_extracted failed for filing {filing_id}"
        )

    # Headline summary only — no section summary for 13D/13G (per locked decision)
    headline = ""
    try:
        filing_metadata = {"filing_id": filing_id, "deal_id": deal_id}
        headline = await generate_headline_summary(
            clauses=clause_dicts,
            filing_type="SC 13D/13G",
            filing_metadata=filing_metadata,
        )
    except Exception:
        logger.exception(
            f"[thirteend_g_pipeline] Summary generation failed for filing {filing_id}"
        )
        if not headline:
            headline = "Summary generation failed — review extracted clauses directly."

    try:
        await insert_filing_summary(filing_id=filing_id, headline=headline, section=None)
    except Exception:
        logger.exception(
            f"[thirteend_g_pipeline] insert_filing_summary failed for filing {filing_id}"
        )

    # Create Inbox event with DB-stored materiality score (EXTRACT-07)
    # Note: 13D/13G may not have a deal_id (activist filings without tracked deal)
    try:
        from scoring.materiality import calculate_materiality_score, get_severity
        from db import create_extraction_event

        if deal_id:
            mat_score = calculate_materiality_score("FILING", "ROUTINE_UPDATE")
            mat_severity = get_severity(mat_score)
            event_title = f"SC 13D/13G extraction complete — {len(all_extractions)} items extracted"
            event_description = headline or f"Extracted {len(all_extractions)} ownership items from SC 13D/13G filing."

            for firm_id in firm_ids:
                await create_extraction_event(
                    firm_id=firm_id,
                    deal_id=deal_id,
                    title=event_title,
                    description=event_description,
                    source_url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=SC+13D",
                    materiality_score=mat_score,
                    severity=mat_severity,
                    sub_type="ROUTINE_UPDATE",
                )
    except Exception:
        logger.exception(
            f"[thirteend_g_pipeline] create_extraction_event failed for filing {filing_id}"
        )

    logger.info(f"[thirteend_g_pipeline] Completed extraction for filing {filing_id}")
