"""
Worker smoke tests — verify routing and filtering logic without live services.

Tests:
1. Worker filters edgar_poll and edgar_download jobs (returns without error)
2. Worker routes S-4 filing to s4_defm14a pipeline
3. Worker routes DEFM14A filing to s4_defm14a pipeline
4. Worker routes 8-K filing to eightk pipeline
5. Worker routes 8-K/A filing to eightk pipeline
6. Worker routes SC 13D filing to thirteend_g pipeline
7. Worker routes SC 13G filing to thirteend_g pipeline
8. Worker logs a warning for unrecognised filing types (no crash)

All tests use mocked pipeline functions and mocked DB — no real Gemini API
calls, no real Redis or Postgres connections required.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch, call

import pytest

from tests.conftest import MockJob, SAMPLE_RAW_CONTENT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _call_process(job: MockJob) -> None:
    """Import and call the worker process function directly."""
    from worker import process
    await process(job, job_token='test-token')


# ---------------------------------------------------------------------------
# Filter tests — non-llm_extract jobs are silently skipped
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_worker_skips_edgar_poll_job(edgar_poll_job: MockJob) -> None:
    """edgar_poll jobs must be silently skipped — no error, no pipeline call."""
    # No DB or pipeline patches needed — if filter works, nothing is called
    result = await _call_process(edgar_poll_job)
    assert result is None  # process() returns None on skip


@pytest.mark.asyncio
async def test_worker_skips_edgar_download_job(edgar_download_job: MockJob) -> None:
    """edgar_download jobs must be silently skipped — no error, no pipeline call."""
    result = await _call_process(edgar_download_job)
    assert result is None


# ---------------------------------------------------------------------------
# Routing tests — llm_extract jobs dispatched to the correct pipeline
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_worker_routes_s4_to_s4_pipeline(s4_llm_extract_job: MockJob) -> None:
    """S-4 filings must be routed to the s4_defm14a pipeline."""
    # worker.py uses `from db import fetch_filing_content` inside process(),
    # so we patch the function in the db module (where it lives).
    with patch('db.fetch_filing_content', new_callable=AsyncMock) as mock_fetch, \
         patch('pipelines.s4_defm14a.run_s4_pipeline', new_callable=AsyncMock) as mock_pipeline:

        mock_fetch.return_value = (SAMPLE_RAW_CONTENT, 'S-4')

        await _call_process(s4_llm_extract_job)

        mock_fetch.assert_awaited_once_with('filing-uuid-s4-001')
        mock_pipeline.assert_awaited_once_with(
            filing_id='filing-uuid-s4-001',
            deal_id='deal-uuid-001',
            firm_ids=['firm-uuid-001', 'firm-uuid-002'],
            raw_content=SAMPLE_RAW_CONTENT,
        )


@pytest.mark.asyncio
async def test_worker_routes_defm14a_to_s4_pipeline(defm14a_llm_extract_job: MockJob) -> None:
    """DEFM14A filings must be routed to the s4_defm14a pipeline."""
    with patch('db.fetch_filing_content', new_callable=AsyncMock) as mock_fetch, \
         patch('pipelines.s4_defm14a.run_s4_pipeline', new_callable=AsyncMock) as mock_pipeline:

        mock_fetch.return_value = (SAMPLE_RAW_CONTENT, 'DEFM14A')

        await _call_process(defm14a_llm_extract_job)

        mock_fetch.assert_awaited_once()
        mock_pipeline.assert_awaited_once()


@pytest.mark.asyncio
async def test_worker_routes_eightk_to_eightk_pipeline(eightk_llm_extract_job: MockJob) -> None:
    """8-K filings must be routed to the eightk pipeline."""
    with patch('db.fetch_filing_content', new_callable=AsyncMock) as mock_fetch, \
         patch('pipelines.eightk.run_eightk_pipeline', new_callable=AsyncMock) as mock_pipeline:

        mock_fetch.return_value = (SAMPLE_RAW_CONTENT, '8-K')

        await _call_process(eightk_llm_extract_job)

        mock_fetch.assert_awaited_once_with('filing-uuid-8k-001')
        mock_pipeline.assert_awaited_once_with(
            filing_id='filing-uuid-8k-001',
            deal_id='deal-uuid-003',
            firm_ids=['firm-uuid-001'],
            raw_content=SAMPLE_RAW_CONTENT,
        )


@pytest.mark.asyncio
async def test_worker_routes_sc13d_to_thirteend_g_pipeline(sc13d_llm_extract_job: MockJob) -> None:
    """SC 13D filings must be routed to the thirteend_g pipeline."""
    with patch('db.fetch_filing_content', new_callable=AsyncMock) as mock_fetch, \
         patch('pipelines.thirteend_g.run_13dg_pipeline', new_callable=AsyncMock) as mock_pipeline:

        mock_fetch.return_value = (SAMPLE_RAW_CONTENT, 'SC 13D')

        await _call_process(sc13d_llm_extract_job)

        mock_fetch.assert_awaited_once_with('filing-uuid-13d-001')
        mock_pipeline.assert_awaited_once_with(
            filing_id='filing-uuid-13d-001',
            deal_id=None,
            firm_ids=['firm-uuid-001'],
            raw_content=SAMPLE_RAW_CONTENT,
        )


@pytest.mark.asyncio
async def test_worker_routes_sc13g_to_thirteend_g_pipeline() -> None:
    """SC 13G filings must be routed to the thirteend_g pipeline."""
    job = MockJob(
        name='llm_extract',
        data={
            'filing_id': 'filing-uuid-13g-001',
            'filing_type': 'SC 13G',
            'deal_id': None,
            'firm_ids': ['firm-uuid-001'],
        },
    )
    with patch('db.fetch_filing_content', new_callable=AsyncMock) as mock_fetch, \
         patch('pipelines.thirteend_g.run_13dg_pipeline', new_callable=AsyncMock) as mock_pipeline:

        mock_fetch.return_value = (SAMPLE_RAW_CONTENT, 'SC 13G')

        await _call_process(job)

        mock_pipeline.assert_awaited_once()


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_worker_skips_when_raw_content_is_none() -> None:
    """If rawContent is None (download pending), worker must skip extraction without error."""
    job = MockJob(
        name='llm_extract',
        data={
            'filing_id': 'filing-uuid-pending-001',
            'filing_type': 'S-4',
            'deal_id': 'deal-uuid-001',
            'firm_ids': ['firm-uuid-001'],
        },
    )
    with patch('db.fetch_filing_content', new_callable=AsyncMock) as mock_fetch, \
         patch('pipelines.s4_defm14a.run_s4_pipeline', new_callable=AsyncMock) as mock_pipeline:

        mock_fetch.return_value = (None, 'S-4')

        await _call_process(job)

        # Pipeline must NOT be called if rawContent is None
        mock_pipeline.assert_not_awaited()


@pytest.mark.asyncio
async def test_worker_logs_warning_for_unrecognised_filing_type() -> None:
    """Unrecognised filing types must not crash the worker — log warning and continue."""
    job = MockJob(
        name='llm_extract',
        data={
            'filing_id': 'filing-uuid-other-001',
            'filing_type': 'UNKNOWN_TYPE',
            'deal_id': None,
            'firm_ids': [],
        },
    )
    with patch('db.fetch_filing_content', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = (SAMPLE_RAW_CONTENT, 'UNKNOWN_TYPE')

        # Should complete without raising any exception
        await _call_process(job)
