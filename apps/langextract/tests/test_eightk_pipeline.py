"""
Tests for the 8-K extraction pipeline.

Uses mocked lx.extract() and mocked DB functions — no real API calls.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from langextract.core.data import AnnotatedDocument
from langextract.data import AlignmentStatus, CharInterval, Extraction


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_extraction(
    extraction_class: str,
    extraction_text: str,
    start_pos: int = 50,
    end_pos: int = 150,
    alignment_status: AlignmentStatus = AlignmentStatus.MATCH_EXACT,
    attributes: dict[str, str | list[str]] | None = None,
) -> Extraction:
    return Extraction(
        extraction_class=extraction_class,
        extraction_text=extraction_text,
        char_interval=CharInterval(start_pos=start_pos, end_pos=end_pos),
        alignment_status=alignment_status,
        attributes=attributes,
    )


def _make_annotated_doc(extractions: list[Extraction]) -> AnnotatedDocument:
    return AnnotatedDocument(extractions=extractions, text="sample 8-K text")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_eightk_pipeline_uses_flash_model_id():
    """8-K pipeline uses gemini-2.5-flash (not pro) model ID."""
    from pipelines.eightk import MODEL_ID
    assert MODEL_ID == "gemini-2.5-flash"


@pytest.mark.asyncio
async def test_eightk_pipeline_extracts_material_event():
    """8-K pipeline correctly processes MATERIAL_EVENT extractions."""
    material_event_extraction = _make_extraction(
        "MATERIAL_EVENT",
        "entered into an Agreement and Plan of Merger with TechCorp Inc.",
        start_pos=116,
        end_pos=297,
        attributes={"event_type": "merger_agreement_signed", "item_number": "Item 1.01"},
    )
    mock_doc = _make_annotated_doc([material_event_extraction])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Merger agreement announced."

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id="test-8k-001",
            deal_id="deal-001",
            firm_ids=["firm-001"],
            raw_content="sample 8-K text",
        )

    assert mock_insert.call_count == 1
    call_kwargs = mock_insert.call_args.kwargs
    # 8-K MATERIAL_EVENT maps to "OTHER" clause type
    assert call_kwargs["clause_type"] == "OTHER"
    assert call_kwargs["verbatim_text"] == "entered into an Agreement and Plan of Merger with TechCorp Inc."
    assert call_kwargs["source_location"] == "116:297"


@pytest.mark.asyncio
async def test_eightk_pipeline_handles_all_8k_classes():
    """8-K pipeline maps all 8-K-specific extraction classes to valid clause types."""
    extractions_by_class = [
        _make_extraction("AMENDMENT", "amended the merger agreement", 10, 50),
        _make_extraction("MATERIAL_EVENT", "entered into merger agreement", 60, 120),
        _make_extraction("ENTRY_EXIT", "terminated prior agreement", 130, 200),
        _make_extraction("COMPLETION", "merger closed effective today", 210, 280),
        _make_extraction("OTHER", "other item not covered above", 290, 360),
    ]
    mock_doc = _make_annotated_doc(extractions_by_class)

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "8-K filing summary."

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id="test-8k-002",
            deal_id="deal-002",
            firm_ids=["firm-001"],
            raw_content="sample 8-K text",
        )

    # All 5 extractions should produce DB inserts
    assert mock_insert.call_count == 5
    # All should map to "OTHER" clause type (8-K classes map to OTHER)
    for call in mock_insert.call_args_list:
        assert call.kwargs["clause_type"] == "OTHER"


@pytest.mark.asyncio
async def test_eightk_pipeline_no_section_summary():
    """8-K pipeline calls headline summary only — NOT section summary."""
    mock_doc = _make_annotated_doc([
        _make_extraction("MATERIAL_EVENT", "signed merger agreement", 10, 60),
    ])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock), \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock) as mock_summary_store, \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "8-K headline."

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id="test-8k-003",
            deal_id="deal-003",
            firm_ids=["firm-001"],
            raw_content="short 8-K text",
        )

    mock_headline.assert_called_once()
    mock_section.assert_not_called()

    # insert_filing_summary called with section=None for 8-K
    call_kwargs = mock_summary_store.call_args.kwargs
    assert call_kwargs["section"] is None


@pytest.mark.asyncio
async def test_eightk_pipeline_shorter_chunking_config():
    """8-K pipeline uses less aggressive chunking config than S-4."""
    from pipelines.eightk import EXTRACTION_PASSES, MAX_CHAR_BUFFER, MAX_WORKERS
    from pipelines.s4_defm14a import (
        EXTRACTION_PASSES as S4_PASSES,
        MAX_CHAR_BUFFER as S4_MAX_CHAR_BUFFER,
    )

    assert EXTRACTION_PASSES < S4_PASSES, "8-K should use fewer extraction passes than S-4"
    assert MAX_CHAR_BUFFER > S4_MAX_CHAR_BUFFER, "8-K should use larger char buffer (simpler docs)"
    assert MAX_WORKERS > 10, "8-K should support more parallel workers (shorter docs)"


@pytest.mark.asyncio
async def test_eightk_pipeline_calls_insert_clause_per_firm():
    """insert_clause is called once per firm for each extraction."""
    mock_doc = _make_annotated_doc([
        _make_extraction("MATERIAL_EVENT", "merger signed", 10, 60),
    ])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Headline."

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id="test-8k-004",
            deal_id="deal-004",
            firm_ids=["firm-A", "firm-B"],
            raw_content="short text",
        )

    # 1 extraction × 2 firms = 2 calls
    assert mock_insert.call_count == 2
    inserted_firms = {call.kwargs["firm_id"] for call in mock_insert.call_args_list}
    assert inserted_firms == {"firm-A", "firm-B"}


@pytest.mark.asyncio
async def test_eightk_pipeline_marks_filing_extracted():
    """mark_filing_extracted is called after successful extraction."""
    mock_doc = _make_annotated_doc([])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock), \
         patch("db.mark_filing_extracted", new_callable=AsyncMock) as mock_mark, \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "No extractions."

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id="test-8k-005",
            deal_id=None,
            firm_ids=[],
            raw_content="short text",
        )

    mock_mark.assert_called_once_with("test-8k-005")


@pytest.mark.asyncio
async def test_eightk_pipeline_hsr_second_request_sets_attribute():
    mock_doc = _make_annotated_doc([
        _make_extraction(
            'MATERIAL_EVENT',
            'The Company received a second request from the Federal Trade Commission.',
            10,
            95,
        ),
    ])

    with patch('langextract.extract') as mock_lx, \
         patch('db.insert_clause', new_callable=AsyncMock), \
         patch('db.mark_filing_extracted', new_callable=AsyncMock), \
         patch('db.insert_filing_summary', new_callable=AsyncMock), \
         patch('summaries.analyst_summary.generate_headline_summary', new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = 'HSR second request disclosed.'

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id='test-8k-hsr-001',
            deal_id='deal-hsr-001',
            firm_ids=['firm-001'],
            raw_content='sample 8-K text',
        )

    clauses = mock_headline.call_args.kwargs['clauses']
    assert clauses[0]['attributes']['hsr_event_type'] == 'SECOND_REQUEST'


@pytest.mark.asyncio
async def test_eightk_pipeline_hsr_early_termination_sets_attribute():
    mock_doc = _make_annotated_doc([
        _make_extraction(
            'MATERIAL_EVENT',
            'The parties received early termination of the waiting period under the HSR Act.',
            10,
            120,
        ),
    ])

    with patch('langextract.extract') as mock_lx, \
         patch('db.insert_clause', new_callable=AsyncMock), \
         patch('db.mark_filing_extracted', new_callable=AsyncMock), \
         patch('db.insert_filing_summary', new_callable=AsyncMock), \
         patch('summaries.analyst_summary.generate_headline_summary', new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = 'HSR waiting period update.'

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id='test-8k-hsr-002',
            deal_id='deal-hsr-002',
            firm_ids=['firm-001'],
            raw_content='sample 8-K text',
        )

    clauses = mock_headline.call_args.kwargs['clauses']
    assert clauses[0]['attributes']['hsr_event_type'] == 'HSR_EARLY_TERMINATION'


@pytest.mark.asyncio
async def test_eightk_pipeline_without_hsr_keywords_has_no_hsr_event_type_attribute():
    mock_doc = _make_annotated_doc([
        _make_extraction('MATERIAL_EVENT', 'The parties entered into an amendment to the merger agreement.', 10, 90),
    ])

    with patch('langextract.extract') as mock_lx, \
         patch('db.insert_clause', new_callable=AsyncMock), \
         patch('db.mark_filing_extracted', new_callable=AsyncMock), \
         patch('db.insert_filing_summary', new_callable=AsyncMock), \
         patch('summaries.analyst_summary.generate_headline_summary', new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = 'No HSR language found.'

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id='test-8k-hsr-003',
            deal_id='deal-hsr-003',
            firm_ids=['firm-001'],
            raw_content='sample 8-K text',
        )

    clauses = mock_headline.call_args.kwargs['clauses']
    assert 'hsr_event_type' not in clauses[0]['attributes']


@pytest.mark.asyncio
async def test_eightk_pipeline_hsr_second_request_boosts_confidence():
    second_request_extraction = _make_extraction(
        'MATERIAL_EVENT',
        'The Company received a second request under the Hart-Scott-Rodino Act.',
        10,
        120,
        alignment_status=AlignmentStatus.MATCH_FUZZY,
    )
    mock_doc = _make_annotated_doc([second_request_extraction])

    with patch('langextract.extract') as mock_lx, \
         patch('db.insert_clause', new_callable=AsyncMock) as mock_insert, \
         patch('db.mark_filing_extracted', new_callable=AsyncMock), \
         patch('db.insert_filing_summary', new_callable=AsyncMock), \
         patch('summaries.analyst_summary.generate_headline_summary', new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = 'HSR second request disclosed.'

        from pipelines.eightk import run_eightk_pipeline
        await run_eightk_pipeline(
            filing_id='test-8k-hsr-004',
            deal_id='deal-hsr-004',
            firm_ids=['firm-001'],
            raw_content='sample 8-K text',
        )

    assert mock_insert.call_args.kwargs['confidence_score'] == 0.95
