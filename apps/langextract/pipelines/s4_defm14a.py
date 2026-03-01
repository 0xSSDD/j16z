"""
S-4 / DEFM14A extraction pipeline stub.

Handles filing types: S-4, S-4/A, DEFM14A, PREM14A
These are merger proxy filings — the richest source for M&A clauses.

Clauses extracted (Plan 03-02 implementation):
  TERMINATION_FEE, REVERSE_TERMINATION_FEE, MAE, REGULATORY_EFFORTS,
  LITIGATION_CONDITION, FINANCING_CONDITION, GO_SHOP, TICKING_FEE,
  HELL_OR_HIGH_WATER, SPECIFIC_PERFORMANCE, NO_SHOP, MATCHING_RIGHTS, OTHER

Model: gemini-2.5-pro (pinned, non-aliased)
Config: extraction_passes=5, max_workers=10, max_char_buffer=800

NOTE: lx.extract() is synchronous — use asyncio.to_thread() to avoid blocking
the BullMQ event loop (Pitfall 2 in RESEARCH.md).
"""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def run_s4_pipeline(
    filing_id: str,
    deal_id: Optional[str],
    firm_ids: list[str],
    raw_content: str,
) -> None:
    """
    Run S-4/DEFM14A LangExtract clause extraction pipeline.

    STUB: Logs and returns. Full implementation in Plan 03-02.
    """
    logger.info(
        f'[s4_pipeline] STUB — filing_id={filing_id} '
        f'deal_id={deal_id} firm_count={len(firm_ids)} '
        f'content_len={len(raw_content)}'
    )
    # TODO Plan 03-02: implement LangExtract extraction, DB writes, event creation
