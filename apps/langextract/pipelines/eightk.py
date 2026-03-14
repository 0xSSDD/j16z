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
import re
from pathlib import Path
from typing import Optional, TypedDict, cast

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
EXTRACTION_PASSES = 2
MAX_WORKERS = 1
MAX_CHAR_BUFFER = 1000

# 8-K-specific extraction classes mapped to DB clause types
_CLASS_TO_CLAUSE_TYPE = {
    "AMENDMENT": "OTHER",
    "MATERIAL_EVENT": "OTHER",
    "ENTRY_EXIT": "OTHER",
    "COMPLETION": "OTHER",
    "OTHER": "OTHER",
}


class HsrEventSpec(TypedDict):
    sub_type: str
    score: int
    title: str
    description: str


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


def detect_hsr_event_type(text: str) -> Optional[str]:
    normalized = text.lower()

    has_second_request = 'second request' in normalized
    has_waiting_period = 'waiting period' in normalized
    has_early_termination = 'early termination' in normalized
    has_expired = 'expired' in normalized
    has_extended = 'extended' in normalized
    has_terminated = 'terminated' in normalized

    has_ftc = 'federal trade commission' in normalized
    has_doj = 'department of justice' in normalized
    has_review = 'review' in normalized
    has_investigation = 'investigation' in normalized

    has_hsr_reference = (
        'hart-scott-rodino' in normalized
        or 'hsr act' in normalized
        or 'premerger notification' in normalized
        or 'additional information and documentary material' in normalized
        or bool(re.search(r'\bhsr\b', normalized))
    )

    has_waiting_period_signal = has_waiting_period and (
        has_extended or has_expired or has_terminated or has_early_termination
    )
    has_regulator_review_signal = (has_ftc or has_doj) and (
        has_review or has_investigation or has_second_request
    )

    if has_second_request:
        return 'SECOND_REQUEST'
    if has_waiting_period and has_early_termination:
        return 'HSR_EARLY_TERMINATION'
    if has_waiting_period and has_expired:
        return 'HSR_WAITING_PERIOD_EXPIRED'
    if has_regulator_review_signal:
        return 'HSR_INVESTIGATION'
    if has_hsr_reference or has_waiting_period_signal:
        return 'HSR_INVESTIGATION'
    return None


def apply_hsr_confidence_boost(confidence: float, hsr_event_type: Optional[str]) -> float:
    if hsr_event_type == 'SECOND_REQUEST':
        return max(confidence, 0.95)
    if hsr_event_type == 'HSR_EARLY_TERMINATION':
        return max(confidence, 0.9)
    if hsr_event_type == 'HSR_WAITING_PERIOD_EXPIRED':
        return max(confidence, 0.88)
    if hsr_event_type == 'HSR_INVESTIGATION':
        return max(confidence, 0.85)
    return confidence


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
        extractions = getattr(doc, 'extractions', None)
        if isinstance(extractions, list) and extractions:
            all_extractions.extend(cast(list[Extraction], extractions))

    logger.info(f"[eightk_pipeline] Extracted {len(all_extractions)} items for filing {filing_id}")

    clause_dicts: list[dict[str, object]] = []
    detected_hsr_event_types: set[str] = set()

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

        hsr_event_type = detect_hsr_event_type(extraction.extraction_text)
        attributes = dict(extraction.attributes or {})
        if hsr_event_type:
            attributes['hsr_event_type'] = hsr_event_type
            extraction.attributes = attributes
            detected_hsr_event_types.add(hsr_event_type)

        confidence = get_confidence_score(extraction)
        confidence = apply_hsr_confidence_boost(confidence, hsr_event_type)

        item_num = ""
        if attributes.get('item_number'):
            item_num = f" ({attributes['item_number']})"
        title = f"8-K {raw_class.replace('_', ' ').title()}{item_num}"

        summary = ""
        if attributes.get('event_type'):
            summary = str(attributes['event_type'])
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
            "attributes": attributes,
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

    # Create Inbox event with DB-stored materiality score (EXTRACT-07)
    try:
        from scoring.materiality import calculate_materiality_score, get_severity
        from db import create_extraction_event

        if deal_id:
            mat_score = calculate_materiality_score("FILING", "8K_AMENDMENT")
            mat_severity = get_severity(mat_score)
            event_title = f"8-K extraction complete — {len(all_extractions)} items extracted"
            event_description = headline or f"Extracted {len(all_extractions)} material events from 8-K filing."

            for firm_id in firm_ids:
                await create_extraction_event(
                    firm_id=firm_id,
                    deal_id=deal_id,
                    title=event_title,
                    description=event_description,
                    source_url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K",
                    materiality_score=mat_score,
                    severity=mat_severity,
                    sub_type="8K_AMENDMENT",
                )

            hsr_event_specs: dict[str, HsrEventSpec] = {
                'SECOND_REQUEST': {
                    'sub_type': 'FTC_SECOND_REQUEST',
                    'score': calculate_materiality_score('AGENCY', 'FTC_SECOND_REQUEST'),
                    'title': 'FTC second request disclosed in 8-K',
                    'description': '8-K disclosure indicates the transaction received an HSR second request.',
                },
                'HSR_EARLY_TERMINATION': {
                    'sub_type': 'HSR_EARLY_TERMINATION',
                    'score': calculate_materiality_score('AGENCY', 'DOJ_PRESS_RELEASE'),
                    'title': 'HSR waiting period early termination disclosed in 8-K',
                    'description': '8-K disclosure indicates early termination of the HSR waiting period.',
                },
            }

            for hsr_event_type in sorted(detected_hsr_event_types):
                if hsr_event_type not in hsr_event_specs:
                    continue

                spec = hsr_event_specs[hsr_event_type]
                hsr_score = spec['score']
                hsr_severity = get_severity(hsr_score)
                for firm_id in firm_ids:
                    await create_extraction_event(
                        firm_id=firm_id,
                        deal_id=deal_id,
                        title=spec['title'],
                        description=spec['description'],
                        source_url='https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K',
                        materiality_score=hsr_score,
                        severity=hsr_severity,
                        event_type='AGENCY',
                        sub_type=spec['sub_type'],
                    )
    except Exception:
        logger.exception(f"[eightk_pipeline] create_extraction_event failed for filing {filing_id}")

    logger.info(f"[eightk_pipeline] Completed extraction for filing {filing_id}")
