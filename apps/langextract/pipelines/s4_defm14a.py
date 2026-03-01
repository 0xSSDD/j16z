"""
S-4 / DEFM14A extraction pipeline.

Handles filing types: S-4, S-4/A, DEFM14A, PREM14A
These are merger proxy filings — the richest source for M&A clauses.

Clauses extracted:
  TERMINATION_FEE, REVERSE_TERMINATION_FEE, MAE, REGULATORY_EFFORTS,
  LITIGATION_CONDITION, FINANCING_CONDITION, GO_SHOP, TICKING_FEE,
  HELL_OR_HIGH_WATER, SPECIFIC_PERFORMANCE, NO_SHOP, MATCHING_RIGHTS, OTHER

Model: gemini-2.5-pro (pinned, non-aliased)
Config: extraction_passes=5, max_workers=10, max_char_buffer=800

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
# Prompt for S-4 / DEFM14A extraction
# ---------------------------------------------------------------------------

PROMPT = """
Extract M&A deal clauses from this merger agreement proxy filing (S-4 or DEFM14A).
For each clause, extract the EXACT VERBATIM TEXT as it appears in the document — do not paraphrase.

Classify each clause into one of these types:
- TERMINATION_FEE: Fee payable by the target company upon deal termination
- REVERSE_TERMINATION_FEE: Fee payable by the acquirer upon deal termination
- MAE: Material Adverse Effect definition and exclusions
- REGULATORY_EFFORTS: Regulatory approval covenants (HSR, FTC, DOJ, international)
- LITIGATION_CONDITION: Conditions related to pending litigation
- FINANCING_CONDITION: Conditions related to financing availability
- GO_SHOP: Period during which target can solicit competing offers
- TICKING_FEE: Fee that increases over time if deal is delayed
- HELL_OR_HIGH_WATER: Obligation to accept regulatory remedies
- SPECIFIC_PERFORMANCE: Right to seek specific performance vs. damages
- NO_SHOP: Restriction on soliciting competing offers
- MATCHING_RIGHTS: Right to match competing offers
- OTHER: Any other material clause not in the above categories

For each extraction, include these attributes:
- "amount": Dollar amount or percentage if applicable (e.g., "$2,100,000,000" or "4.2%")
- "direction": Who pays/benefits (e.g., "company_to_parent", "parent_to_company")
- "conditions": Key conditions or triggers (brief description)
- "section_ref": Section reference in the filing (e.g., "Section 8.1(c)")
""".strip()

# Model: Gemini 2.5 Pro for S-4/DEFM14A (complex legal language) — PINNED
MODEL_ID = "gemini-2.5-pro"

# Chunking config for legal documents (DataCamp recommendation)
EXTRACTION_PASSES = 5
MAX_WORKERS = 10
MAX_CHAR_BUFFER = 800

# Valid clause types accepted by this pipeline
VALID_CLAUSE_TYPES = {
    "TERMINATION_FEE",
    "REVERSE_TERMINATION_FEE",
    "MAE",
    "REGULATORY_EFFORTS",
    "LITIGATION_CONDITION",
    "FINANCING_CONDITION",
    "GO_SHOP",
    "TICKING_FEE",
    "HELL_OR_HIGH_WATER",
    "SPECIFIC_PERFORMANCE",
    "NO_SHOP",
    "MATCHING_RIGHTS",
    "OTHER",
}


# ---------------------------------------------------------------------------
# Few-shot examples loader
# ---------------------------------------------------------------------------

def load_examples() -> list[ExampleData]:
    """Load versioned few-shot examples from the JSONL file."""
    examples_path = Path(__file__).parent.parent / "examples" / "s4_examples.jsonl"
    examples: list[ExampleData] = []

    if not examples_path.exists():
        logger.warning(f"[s4_pipeline] Examples file not found: {examples_path}")
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

    logger.info(f"[s4_pipeline] Loaded {len(examples)} few-shot examples")
    return examples


# ---------------------------------------------------------------------------
# Confidence score from alignment status
# ---------------------------------------------------------------------------

def get_confidence_score(extraction: Extraction) -> float:
    """
    Derive a confidence score from char_interval and alignment_status.

    MATCH_EXACT → 0.9 (full grounding)
    MATCH_GREATER / MATCH_LESSER → 0.7 (approximate grounding)
    MATCH_FUZZY → 0.6 (fuzzy grounding)
    No char_interval → 0.3 (no grounding = low confidence)
    """
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
    # Has char_interval but unknown alignment status — treat as approximate
    return 0.6


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

async def run_s4_pipeline(
    filing_id: str,
    deal_id: Optional[str],
    firm_ids: list[str],
    raw_content: str,
) -> None:
    """
    Run S-4/DEFM14A LangExtract clause extraction pipeline.

    1. Load few-shot examples
    2. Run lx.extract() wrapped in asyncio.to_thread() (blocking call)
    3. For each extraction: map to ClauseType, compute confidence, write to DB
    4. Mark filing as extracted
    5. Generate headline + section summaries, store in DB
    """
    from db import insert_clause, mark_filing_extracted, insert_filing_summary
    from summaries.analyst_summary import generate_headline_summary, generate_section_summary

    logger.info(
        f"[s4_pipeline] Starting extraction — filing_id={filing_id} "
        f"deal_id={deal_id} firm_count={len(firm_ids)} "
        f"content_len={len(raw_content)}"
    )

    examples = load_examples()

    # CRITICAL: lx.extract() is synchronous — wrap in asyncio.to_thread()
    # to avoid blocking the BullMQ async event loop (Pitfall 2)
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
        logger.exception(f"[s4_pipeline] lx.extract() failed for filing {filing_id}")
        raise

    # lx.extract() returns AnnotatedDocument (single text) or list[AnnotatedDocument]
    if not isinstance(result, list):
        result = [result]

    # Collect all extractions with source grounding data
    all_extractions: list[Extraction] = []
    for doc in result:
        if hasattr(doc, "extractions"):
            all_extractions.extend(doc.extractions)

    logger.info(f"[s4_pipeline] Extracted {len(all_extractions)} clauses for filing {filing_id}")

    # Prepare clause data for summary generation
    clause_dicts: list[dict] = []

    # Write each extraction to DB for every firm
    for extraction in all_extractions:
        # Normalise clause type — fall back to OTHER for unknown classes
        clause_type = extraction.extraction_class.upper()
        if clause_type not in VALID_CLAUSE_TYPES:
            clause_type = "OTHER"

        # Build source_location from char_interval
        if (
            extraction.char_interval
            and extraction.char_interval.start_pos is not None
            and extraction.char_interval.end_pos is not None
        ):
            source_location = f"{extraction.char_interval.start_pos}:{extraction.char_interval.end_pos}"
        else:
            source_location = ""

        confidence = get_confidence_score(extraction)

        # Build a brief title from clause type + section_ref if available
        section_ref = ""
        if extraction.attributes and extraction.attributes.get("section_ref"):
            section_ref = f" ({extraction.attributes['section_ref']})"
        title = f"{clause_type.replace('_', ' ').title()}{section_ref}"

        # Summary: use attributes.conditions or first 200 chars of verbatim text
        summary = ""
        if extraction.attributes and extraction.attributes.get("conditions"):
            summary = str(extraction.attributes["conditions"])
        else:
            summary = extraction.extraction_text[:200]

        # Insert one row per firm (multi-tenant isolation)
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
                    f"[s4_pipeline] insert_clause failed for firm={firm_id} "
                    f"filing={filing_id} type={clause_type}"
                )

        clause_dicts.append({
            "type": clause_type,
            "verbatim_text": extraction.extraction_text,
            "attributes": extraction.attributes or {},
        })

    # Mark the filing as fully extracted
    try:
        await mark_filing_extracted(filing_id)
    except Exception:
        logger.exception(f"[s4_pipeline] mark_filing_extracted failed for filing {filing_id}")

    # Generate summaries — non-blocking: failure does not abort pipeline
    headline = ""
    section_text = None
    try:
        filing_metadata = {"filing_id": filing_id, "deal_id": deal_id}
        headline = await generate_headline_summary(
            clauses=clause_dicts,
            filing_type="S-4/DEFM14A",
            filing_metadata=filing_metadata,
        )
        # Section summary only for S-4/DEFM14A (per locked decision)
        clauses_by_category = _group_clauses_by_category(clause_dicts)
        section_text = await generate_section_summary(
            clauses_by_category=clauses_by_category,
            filing_type="S-4/DEFM14A",
        )
    except Exception:
        logger.exception(f"[s4_pipeline] Summary generation failed for filing {filing_id}")
        if not headline:
            headline = "Summary generation failed — review extracted clauses directly."

    try:
        await insert_filing_summary(
            filing_id=filing_id,
            headline=headline,
            section=section_text,
        )
    except Exception:
        logger.exception(f"[s4_pipeline] insert_filing_summary failed for filing {filing_id}")

    # Create Inbox event with DB-stored materiality score (EXTRACT-07)
    try:
        from scoring.materiality import calculate_materiality_score, get_severity
        from db import create_extraction_event

        if deal_id:
            mat_score = calculate_materiality_score("FILING", "S4_DEFM14A")
            mat_severity = get_severity(mat_score)
            event_title = f"S-4/DEFM14A extraction complete — {len(all_extractions)} clauses extracted"
            event_description = headline or f"Extracted {len(all_extractions)} M&A clauses from S-4/DEFM14A filing."
            filing_url = f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=&type=S-4&dateb=&owner=include&count=40"

            for firm_id in firm_ids:
                await create_extraction_event(
                    firm_id=firm_id,
                    deal_id=deal_id,
                    title=event_title,
                    description=event_description,
                    source_url=filing_url,
                    materiality_score=mat_score,
                    severity=mat_severity,
                    sub_type="S4_DEFM14A",
                )
    except Exception:
        logger.exception(f"[s4_pipeline] create_extraction_event failed for filing {filing_id}")

    logger.info(f"[s4_pipeline] Completed extraction for filing {filing_id}")


def _group_clauses_by_category(clauses: list[dict]) -> dict[str, list[dict]]:
    """Group extracted clauses into analyst-facing categories for section summaries."""
    categories: dict[str, list[dict]] = {
        "Termination Provisions": [],
        "Conditions": [],
        "Protective Provisions": [],
        "Other": [],
    }
    termination_types = {"TERMINATION_FEE", "REVERSE_TERMINATION_FEE", "TICKING_FEE"}
    condition_types = {"REGULATORY_EFFORTS", "FINANCING_CONDITION", "LITIGATION_CONDITION", "MAE"}
    protective_types = {
        "GO_SHOP", "NO_SHOP", "MATCHING_RIGHTS", "SPECIFIC_PERFORMANCE",
        "HELL_OR_HIGH_WATER",
    }
    for clause in clauses:
        ct = clause.get("type", "OTHER")
        if ct in termination_types:
            categories["Termination Provisions"].append(clause)
        elif ct in condition_types:
            categories["Conditions"].append(clause)
        elif ct in protective_types:
            categories["Protective Provisions"].append(clause)
        else:
            categories["Other"].append(clause)
    return categories
