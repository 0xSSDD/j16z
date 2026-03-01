"""
BullMQ Python worker entry point for the LangExtract extraction service.

Subscribes to the same 'ingestion' Redis queue as the Node.js API worker.
Filters to only process 'llm_extract' jobs — 'edgar_poll' and 'edgar_download'
jobs are silently skipped (handled by the Node.js worker).

CRITICAL: Both the Node.js worker (apps/api/src/worker.ts) and this Python
worker subscribe to the 'ingestion' queue. The Node.js worker skips
'llm_extract' jobs (no handler registered); this worker skips all other job
types. This is the resolved answer to Open Question 2 in RESEARCH.md.

Start with:
    python worker.py
Or via pnpm:
    pnpm --filter @j16z/langextract dev
"""
from __future__ import annotations

import asyncio
import logging
import os
import signal

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s %(message)s',
)
logger = logging.getLogger('langextract.worker')

# ---------------------------------------------------------------------------
# Job processor
# ---------------------------------------------------------------------------

async def process(job, job_token):  # noqa: ANN001
    """
    BullMQ job processor for the ingestion queue.

    Filters to only process 'llm_extract' jobs. All other job types
    (edgar_poll, edgar_download, etc.) are skipped immediately — they are
    handled by the Node.js worker (apps/api/src/worker.ts).
    """
    if job.name != 'llm_extract':
        # Silent skip — do not log at INFO level to avoid noise for every
        # edgar_poll / edgar_download job that the Node.js worker handles.
        logger.debug(f'[worker] Skipping job {job.name} (not llm_extract)')
        return

    filing_id: str = job.data.get('filing_id', '')
    filing_type: str = job.data.get('filing_type', '')
    deal_id: str | None = job.data.get('deal_id')
    firm_ids: list[str] = job.data.get('firm_ids', [])

    logger.info(
        f'[worker] Processing llm_extract job — filing_id={filing_id} '
        f'filing_type={filing_type} deal_id={deal_id} firm_count={len(firm_ids)}'
    )

    # Fetch rawContent from DB (not from job payload — Pitfall 1: payload too large)
    from db import fetch_filing_content
    raw_content, resolved_filing_type = await fetch_filing_content(filing_id)

    if raw_content is None:
        logger.warning(f'[worker] rawContent is None for filing {filing_id} — skipping extraction')
        return

    # Use resolved filing_type from DB as source of truth (more reliable than job payload)
    effective_filing_type = resolved_filing_type or filing_type

    # Route to per-filing-type pipeline
    if effective_filing_type in ('S-4', 'S-4/A', 'DEFM14A', 'PREM14A'):
        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id=filing_id,
            deal_id=deal_id,
            firm_ids=firm_ids,
            raw_content=raw_content,
        )
    elif effective_filing_type in ('8-K', '8-K/A'):
        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id=filing_id,
            deal_id=deal_id,
            firm_ids=firm_ids,
            raw_content=raw_content,
        )
    elif effective_filing_type in ('SC 13D', 'SC 13D/A', 'SC 13G', 'SC 13G/A'):
        from pipelines.thirteend_g import run_13dg_pipeline
        await run_13dg_pipeline(
            filing_id=filing_id,
            deal_id=deal_id,
            firm_ids=firm_ids,
            raw_content=raw_content,
        )
    else:
        logger.warning(
            f'[worker] No pipeline for filing_type={effective_filing_type} '
            f'(filing_id={filing_id}) — skipping'
        )

    logger.info(f'[worker] Completed llm_extract for filing {filing_id}')


# ---------------------------------------------------------------------------
# Worker startup
# ---------------------------------------------------------------------------

async def main() -> None:
    from bullmq import Worker

    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    logger.info(f'[worker] Connecting to Redis: {redis_url}')

    worker = Worker(
        'ingestion',
        process,
        {'connection': redis_url},
    )

    logger.info('[worker] LangExtract BullMQ worker started. Waiting for llm_extract jobs...')

    # Graceful shutdown handler
    shutdown_event = asyncio.Event()

    def _handle_signal(sig_name: str) -> None:
        logger.info(f'[worker] Received {sig_name}. Shutting down gracefully...')
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGTERM, lambda: _handle_signal('SIGTERM'))
    loop.add_signal_handler(signal.SIGINT, lambda: _handle_signal('SIGINT'))

    try:
        await worker.run()
    finally:
        logger.info('[worker] Worker stopped. Closing DB pool...')
        from db import close_pool
        await close_pool()
        logger.info('[worker] Shutdown complete.')


if __name__ == '__main__':
    asyncio.run(main())
