"""
SC 13D / SC 13G extraction pipeline stub.

Handles filing types: SC 13D, SC 13D/A, SC 13G, SC 13G/A
These are beneficial ownership filings — activist stakes, position changes,
and investment intent (passive vs active).

Model: gemini-2.5-flash (pinned, non-aliased — shorter docs)
Config: extraction_passes=2, max_workers=5, max_char_buffer=1200

NOTE: lx.extract() is synchronous — use asyncio.to_thread() to avoid blocking
the BullMQ event loop (Pitfall 2 in RESEARCH.md).
"""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def run_13dg_pipeline(
    filing_id: str,
    deal_id: Optional[str],
    firm_ids: list[str],
    raw_content: str,
) -> None:
    """
    Run SC 13D/13G LangExtract extraction pipeline.

    STUB: Logs and returns. Full implementation in Plan 03-02.
    """
    logger.info(
        f'[thirteend_g_pipeline] STUB — filing_id={filing_id} '
        f'deal_id={deal_id} firm_count={len(firm_ids)} '
        f'content_len={len(raw_content)}'
    )
    # TODO Plan 03-02: implement LangExtract extraction, DB writes, event creation
