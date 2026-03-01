"""
Shared pytest fixtures for langextract tests.

Provides:
- Mock job objects for BullMQ worker tests
- Mocked pipeline functions (no real extraction)
- Mocked DB functions (no real Postgres connection)
- Sample job data fixtures by filing type
"""
from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Mock BullMQ Job
# ---------------------------------------------------------------------------

class MockJob:
    """Minimal mock of a BullMQ Job object."""

    def __init__(self, name: str, data: dict[str, Any]) -> None:
        self.name = name
        self.data = data
        self.id = 'test-job-id-001'


# ---------------------------------------------------------------------------
# Job data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def s4_job_data() -> dict[str, Any]:
    return {
        'filing_id': 'filing-uuid-s4-001',
        'filing_type': 'S-4',
        'deal_id': 'deal-uuid-001',
        'firm_ids': ['firm-uuid-001', 'firm-uuid-002'],
    }


@pytest.fixture
def s4a_job_data() -> dict[str, Any]:
    return {
        'filing_id': 'filing-uuid-s4a-001',
        'filing_type': 'S-4/A',
        'deal_id': 'deal-uuid-001',
        'firm_ids': ['firm-uuid-001'],
    }


@pytest.fixture
def defm14a_job_data() -> dict[str, Any]:
    return {
        'filing_id': 'filing-uuid-defm-001',
        'filing_type': 'DEFM14A',
        'deal_id': 'deal-uuid-002',
        'firm_ids': ['firm-uuid-001'],
    }


@pytest.fixture
def eightk_job_data() -> dict[str, Any]:
    return {
        'filing_id': 'filing-uuid-8k-001',
        'filing_type': '8-K',
        'deal_id': 'deal-uuid-003',
        'firm_ids': ['firm-uuid-001'],
    }


@pytest.fixture
def eightka_job_data() -> dict[str, Any]:
    return {
        'filing_id': 'filing-uuid-8ka-001',
        'filing_type': '8-K/A',
        'deal_id': 'deal-uuid-003',
        'firm_ids': ['firm-uuid-001'],
    }


@pytest.fixture
def sc13d_job_data() -> dict[str, Any]:
    return {
        'filing_id': 'filing-uuid-13d-001',
        'filing_type': 'SC 13D',
        'deal_id': None,
        'firm_ids': ['firm-uuid-001'],
    }


@pytest.fixture
def sc13g_job_data() -> dict[str, Any]:
    return {
        'filing_id': 'filing-uuid-13g-001',
        'filing_type': 'SC 13G',
        'deal_id': None,
        'firm_ids': ['firm-uuid-001'],
    }


@pytest.fixture
def unrecognized_job_data() -> dict[str, Any]:
    return {
        'filing_id': 'filing-uuid-other-001',
        'filing_type': 'UNKNOWN_TYPE',
        'deal_id': None,
        'firm_ids': [],
    }


# ---------------------------------------------------------------------------
# Mock jobs
# ---------------------------------------------------------------------------

@pytest.fixture
def edgar_poll_job() -> MockJob:
    """Non-llm_extract job — should be filtered out by the worker."""
    return MockJob(name='edgar_poll', data={})


@pytest.fixture
def edgar_download_job() -> MockJob:
    """Non-llm_extract job — should be filtered out by the worker."""
    return MockJob(name='edgar_download', data={'filingId': 'abc', 'accessionNumber': '000123'})


@pytest.fixture
def s4_llm_extract_job(s4_job_data: dict[str, Any]) -> MockJob:
    return MockJob(name='llm_extract', data=s4_job_data)


@pytest.fixture
def defm14a_llm_extract_job(defm14a_job_data: dict[str, Any]) -> MockJob:
    return MockJob(name='llm_extract', data=defm14a_job_data)


@pytest.fixture
def eightk_llm_extract_job(eightk_job_data: dict[str, Any]) -> MockJob:
    return MockJob(name='llm_extract', data=eightk_job_data)


@pytest.fixture
def sc13d_llm_extract_job(sc13d_job_data: dict[str, Any]) -> MockJob:
    return MockJob(name='llm_extract', data=sc13d_job_data)


# ---------------------------------------------------------------------------
# Mocked DB and pipeline patches
# ---------------------------------------------------------------------------

SAMPLE_RAW_CONTENT = 'Sample merger agreement text for testing. This would normally be 400-800KB.'


@pytest.fixture
def mock_fetch_filing_content():
    """Patch db.fetch_filing_content to return sample content without hitting Postgres."""
    with patch('worker.fetch_filing_content', new_callable=AsyncMock) as mock:
        mock.return_value = (SAMPLE_RAW_CONTENT, None)
        yield mock


@pytest.fixture
def mock_s4_pipeline():
    """Patch the S-4 pipeline function to avoid real extraction."""
    with patch('pipelines.s4_defm14a.run_s4_pipeline', new_callable=AsyncMock) as mock:
        yield mock


@pytest.fixture
def mock_eightk_pipeline():
    """Patch the 8-K pipeline function to avoid real extraction."""
    with patch('pipelines.eightk.run_eightk_pipeline', new_callable=AsyncMock) as mock:
        yield mock


@pytest.fixture
def mock_thirteend_g_pipeline():
    """Patch the 13D/G pipeline function to avoid real extraction."""
    with patch('pipelines.thirteend_g.run_13dg_pipeline', new_callable=AsyncMock) as mock:
        yield mock
