"""
Post-extraction analyst summary generation via Google Gemini API.

Uses the google.generativeai SDK for direct Gemini calls (NOT LangExtract).
Per locked decision: summaries generated via separate post-extraction LLM call.

Two summary levels:
  - headline: 2-3 sentences for Inbox feed (all filing types)
  - section:  Expandable section-level summary (S-4/DEFM14A only)

Delta-aware:
  - generate_delta_summary() compares new extraction against prior for same deal.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini setup
# ---------------------------------------------------------------------------

genai.configure(api_key=os.environ.get("LANGEXTRACT_API_KEY") or os.environ.get("GOOGLE_API_KEY"))

# Use Flash for summaries — cost-efficient, summaries are simpler than extraction
_MODEL_NAME = "gemini-2.5-flash"
MODEL = genai.GenerativeModel(_MODEL_NAME)

# Fallback string returned when Gemini call fails
_FALLBACK_SUMMARY = "Summary generation failed — review extracted clauses directly."


# ---------------------------------------------------------------------------
# Headline summary
# ---------------------------------------------------------------------------

async def generate_headline_summary(
    clauses: list[dict],
    filing_type: str,
    filing_metadata: dict,
) -> str:
    """
    Generate a 2-3 sentence analyst-note style headline summary.

    Args:
        clauses:          Extracted clauses — list of {type, verbatim_text, attributes}
        filing_type:      Filing type string (e.g., "S-4/DEFM14A", "8-K", "SC 13D/13G")
        filing_metadata:  {filing_id, deal_id} for context

    Returns:
        2-3 sentence headline summary string.
    """
    if not clauses:
        return f"No clauses extracted from {filing_type} filing."

    clause_summary = _format_clauses_for_prompt(clauses)

    prompt = f"""You are a merger-arbitrage analyst. Generate a 2-3 sentence analyst-note style summary of this {filing_type} filing.

Highlight what matters most for a merger-arb analyst: key deal terms, risk flags, unusual provisions.
Be factual but opinionated — flag things that deviate from standard M&A practice.

Risk flags to watch for:
- Termination fees above 3% of deal value (flag as "above median")
- MAE clauses that exclude pandemic, war, or other broad categories
- Go-shop periods shorter than 30 days
- Hell-or-high-water obligations for regulatory remedies

Example tone: "S-4 reveals $2.1B reverse termination fee (4.2% of deal value — above median). MAE clause notably excludes pandemic. Watch: shareholder vote March 15."

Extracted clauses:
{clause_summary}

Generate a 2-3 sentence headline summary:"""

    try:
        response = await asyncio.to_thread(MODEL.generate_content, prompt)
        return response.text.strip()
    except Exception:
        logger.exception(f"[analyst_summary] generate_headline_summary failed for {filing_type}")
        return _FALLBACK_SUMMARY


# ---------------------------------------------------------------------------
# Section-level summary (S-4/DEFM14A only)
# ---------------------------------------------------------------------------

async def generate_section_summary(
    clauses_by_category: dict[str, list[dict]],
    filing_type: str,
) -> str:
    """
    Generate expandable section-level summaries for each clause category.

    Only called for S-4/DEFM14A filings (per locked decision).

    Args:
        clauses_by_category:  Clauses grouped by category key
                              (e.g., "Termination Provisions", "Conditions")
        filing_type:          Filing type string

    Returns:
        Multi-paragraph summary with section headers.
    """
    if not any(clauses_by_category.values()):
        return f"No clause categories extracted from {filing_type} filing."

    sections_text = ""
    for category, clauses in clauses_by_category.items():
        if clauses:
            sections_text += f"\n## {category}\n"
            sections_text += _format_clauses_for_prompt(clauses)

    prompt = f"""You are a merger-arbitrage analyst reviewing an {filing_type} filing.

Generate a detailed section-by-section summary for analysts. For each section:
- Summarise the key terms in 2-4 sentences
- Note any unusual or non-standard provisions
- Flag analyst risk concerns

{sections_text}

Write the section-level summary with clear headers for each category:"""

    try:
        response = await asyncio.to_thread(MODEL.generate_content, prompt)
        return response.text.strip()
    except Exception:
        logger.exception(f"[analyst_summary] generate_section_summary failed for {filing_type}")
        return _FALLBACK_SUMMARY


# ---------------------------------------------------------------------------
# Delta-aware summary
# ---------------------------------------------------------------------------

async def generate_delta_summary(
    new_clauses: list[dict],
    previous_clauses: list[dict],
    filing_type: str,
) -> str:
    """
    Generate a delta-aware summary comparing new extraction against prior extraction.

    Highlights what changed: "Revised S-4 increases termination fee from $1.8B to $2.1B"

    Args:
        new_clauses:       Newly extracted clauses
        previous_clauses:  Previously extracted clauses for same deal (may be empty)
        filing_type:       Filing type string

    Returns:
        Delta summary string; falls back to headline summary if no prior clauses.
    """
    if not previous_clauses:
        # No prior extraction — fall back to standard headline
        return await generate_headline_summary(
            clauses=new_clauses,
            filing_type=filing_type,
            filing_metadata={},
        )

    new_summary = _format_clauses_for_prompt(new_clauses)
    prev_summary = _format_clauses_for_prompt(previous_clauses)

    prompt = f"""You are a merger-arbitrage analyst reviewing an amended {filing_type} filing.

Compare the new extraction against the prior extraction and highlight what changed.
Focus on material changes relevant to merger-arb analysis:
- Fee changes (termination fees, reverse termination fees)
- Changes to MAE exclusions or definitions
- Updated regulatory commitments or closing conditions
- Changes to voting thresholds or timing

Example output: "Revised S-4 increases termination fee from $1.8B to $2.1B (+17%). MAE clause now explicitly excludes tariff-related impacts — new addition. Outside date extended from March 31 to June 30."

Prior extraction:
{prev_summary}

New extraction:
{new_summary}

Write a 2-4 sentence delta summary highlighting what changed:"""

    try:
        response = await asyncio.to_thread(MODEL.generate_content, prompt)
        return response.text.strip()
    except Exception:
        logger.exception(f"[analyst_summary] generate_delta_summary failed for {filing_type}")
        return _FALLBACK_SUMMARY


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_clauses_for_prompt(clauses: list[dict]) -> str:
    """Format clause list as a readable block for LLM prompts."""
    lines: list[str] = []
    for i, clause in enumerate(clauses, 1):
        clause_type = clause.get("type", "UNKNOWN")
        text = clause.get("verbatim_text", "")[:500]  # Truncate very long verbatim text
        attrs = clause.get("attributes", {})
        attr_str = ""
        if attrs:
            attr_parts = [f"{k}={v}" for k, v in attrs.items() if v]
            attr_str = f" [{', '.join(attr_parts)}]" if attr_parts else ""
        lines.append(f"{i}. {clause_type}{attr_str}: {text}")
    return "\n".join(lines)
