"""
8-K extraction pipeline stub.

Handles filing types: 8-K, 8-K/A
These are material event filings — shorter than S-4, focus on deal announcements,
amendments, and regulatory/litigation developments.

Model: gemini-2.5-flash (pinned, non-aliased — faster for shorter docs)
Config: extraction_passes=3, max_workers=5, max_char_buffer=1200

NOTE: lx.extract() is synchronous — use asyncio.to_thread() to avoid blocking
the BullMQ event loop (Pitfall 2 in RESEARCH.md).
"""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def run_eightk_pipeline(
    filing_id: str,
    deal_id: Optional[str],
    firm_ids: list[str],
    raw_content: str,
) -> None:
    """
    Run 8-K LangExtract extraction pipeline.

    STUB: Logs and returns. Full implementation in Plan 03-02.
    """
    logger.info(
        f'[eightk_pipeline] STUB — filing_id={filing_id} '
        f'deal_id={deal_id} firm_count={len(firm_ids)} '
        f'content_len={len(raw_content)}'
    )
    # TODO Plan 03-02: implement LangExtract extraction, DB writes, event creation
