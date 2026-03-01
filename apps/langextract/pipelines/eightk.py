"""
8-K extraction pipeline.

Handles filing types: 8-K, 8-K/A
These are material event filings — shorter than S-4, focus on deal announcements,
amendments, and regulatory/litigation developments.

Model: gemini-2.5-flash (pinned, non-aliased — faster for shorter docs)
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
# Prompt for 8-K extraction
# ---------------------------------------------------------------------------

PROMPT = """
Extract material events and key details from this 8-K or 8-K/A SEC filing.
For each item, extract the EXACT VERBATIM TEXT as it appears in the document — do not paraphrase.

Classify each extraction into one of these types:
- AMENDMENT: Details about amendments to existing agreements (8-K/A items)
- MATERIAL_EVENT: Material definitive agreements, deals, regulatory actions
- ENTRY_EXIT: Entry into or exit from material agreements
- COMPLETION: Completion or closing of a transaction
- OTHER: Any other notable item not captured above

For each extraction, include these attributes:
- "event_type": Specific type of event (e.g., "merger_agreement_signed", "ftc_second_request", "deal_closed")
- "item_number": SEC item number (e.g., "Item 1.01", "Item 8.01")
- "effective_date": Date the event occurred or agreement was entered (if stated)
- "consideration": Financial consideration or key terms (if applicable)
""".strip()

# Model: Gemini 2.5 Flash for 8-K filings — shorter, simpler docs
MODEL_ID = "gemini-2.5-flash"

# Chunking config — less aggressive than S-4
EXTRACTION_PASSES = 3
MAX_WORKERS = 20
MAX_CHAR_BUFFER = 1000

# 8-K-specific extraction classes mapped to DB clause types
_CLASS_TO_CLAUSE_TYPE = {
    "AMENDMENT": "OTHER",
    "MATERIAL_EVENT": "OTHER",
    "ENTRY_EXIT": "OTHER",
    "COMPLETION": "OTHER",
    "OTHER": "OTHER",
}


# ---------------------------------------------------------------------------
# Few-shot examples loader
# ---------------------------------------------------------------------------

def load_examples() -> list[ExampleData]:
    """Load versioned few-shot examples from the JSONL file."""
    examples_path = Path(__file__).parent.parent / "examples" / "eightk_examples.jsonl"
    examples: list[ExampleData] = []

    if not examples_path.exists():
        logger.warning(f"[eightk_pipeline] Examples file not found: {examples_path}")
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

    logger.info(f"[eightk_pipeline] Loaded {len(examples)} few-shot examples")
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

async def run_eightk_pipeline(
    filing_id: str,
    deal_id: Optional[str],
    firm_ids: list[str],
    raw_content: str,
) -> None:
    """
    Run 8-K LangExtract extraction pipeline.

    1. Load few-shot examples
    2. Run lx.extract() wrapped in asyncio.to_thread()
    3. Map 8-K classes to clause types, write to DB
    4. Mark filing extracted
    5. Generate headline summary (no section summary for 8-K)
    """
    from db import insert_clause, mark_filing_extracted, insert_filing_summary
    from summaries.analyst_summary import generate_headline_summary

    logger.info(
        f"[eightk_pipeline] Starting extraction — filing_id={filing_id} "
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
        logger.exception(f"[eightk_pipeline] lx.extract() failed for filing {filing_id}")
        raise

    if not isinstance(result, list):
        result = [result]

    all_extractions: list[Extraction] = []
    for doc in result:
        if hasattr(doc, "extractions"):
            all_extractions.extend(doc.extractions)

    logger.info(f"[eightk_pipeline] Extracted {len(all_extractions)} items for filing {filing_id}")

    clause_dicts: list[dict] = []

    for extraction in all_extractions:
        # Map 8-K-specific class to DB clause type
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

        item_num = ""
        if extraction.attributes and extraction.attributes.get("item_number"):
            item_num = f" ({extraction.attributes['item_number']})"
        title = f"8-K {raw_class.replace('_', ' ').title()}{item_num}"

        summary = ""
        if extraction.attributes and extraction.attributes.get("event_type"):
            summary = str(extraction.attributes["event_type"])
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
                    f"[eightk_pipeline] insert_clause failed for firm={firm_id} "
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
        logger.exception(f"[eightk_pipeline] mark_filing_extracted failed for filing {filing_id}")

    # Headline summary only — no section summary for 8-K (per locked decision)
    headline = ""
    try:
        filing_metadata = {"filing_id": filing_id, "deal_id": deal_id}
        headline = await generate_headline_summary(
            clauses=clause_dicts,
            filing_type="8-K",
            filing_metadata=filing_metadata,
        )
    except Exception:
        logger.exception(f"[eightk_pipeline] Summary generation failed for filing {filing_id}")
        if not headline:
            headline = "Summary generation failed — review extracted clauses directly."

    try:
        await insert_filing_summary(filing_id=filing_id, headline=headline, section=None)
    except Exception:
        logger.exception(f"[eightk_pipeline] insert_filing_summary failed for filing {filing_id}")

    logger.info(f"[eightk_pipeline] Completed extraction for filing {filing_id}")
