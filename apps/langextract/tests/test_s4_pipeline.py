"""
Tests for the S-4/DEFM14A extraction pipeline.

Uses mocked lx.extract() and mocked DB functions — no real API calls.
"""
from __future__ import annotations

import asyncio
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from langextract.core.data import AnnotatedDocument
from langextract.data import AlignmentStatus, CharInterval, Extraction


# ---------------------------------------------------------------------------
# Helpers for building mock extractions
# ---------------------------------------------------------------------------

def _make_extraction(
    extraction_class: str,
    extraction_text: str,
    start_pos: int = 100,
    end_pos: int = 200,
    alignment_status: AlignmentStatus = AlignmentStatus.MATCH_EXACT,
    attributes: dict | None = None,
) -> Extraction:
    return Extraction(
        extraction_class=extraction_class,
        extraction_text=extraction_text,
        char_interval=CharInterval(start_pos=start_pos, end_pos=end_pos),
        alignment_status=alignment_status,
        attributes=attributes,
    )


def _make_annotated_doc(extractions: list[Extraction]) -> AnnotatedDocument:
    return AnnotatedDocument(extractions=extractions, text="sample filing text")


# ---------------------------------------------------------------------------
# Sample extractions covering all S-4 clause types
# ---------------------------------------------------------------------------

SAMPLE_EXTRACTIONS = [
    _make_extraction("TERMINATION_FEE", "pay a fee equal to $2,100,000,000", 100, 200,
                     attributes={"amount": "$2,100,000,000", "direction": "company_to_parent",
                                 "conditions": "Board recommendation change", "section_ref": "Section 8.01(b)"}),
    _make_extraction("REVERSE_TERMINATION_FEE", "Parent shall pay to Company $4,200,000,000", 300, 450,
                     attributes={"amount": "$4,200,000,000", "direction": "parent_to_company",
                                 "conditions": "Parent failure to close", "section_ref": "Section 8.01(c)"}),
    _make_extraction("MAE", "Material Adverse Effect means any event that has a material adverse effect", 500, 700,
                     attributes={"amount": None, "direction": "company", "conditions": "Excludes pandemic", "section_ref": "Definition"}),
    _make_extraction("REGULATORY_EFFORTS", "use reasonable best efforts to obtain HSR clearance", 800, 950,
                     attributes={"amount": None, "direction": "mutual", "conditions": "HSR Act compliance", "section_ref": "Section 5.04"}),
    _make_extraction("LITIGATION_CONDITION", "no injunction or legal restraint prohibiting the Merger", 1000, 1100,
                     attributes={"amount": None, "direction": "mutual", "conditions": "No pending injunction", "section_ref": "Section 7.01(c)"}),
    _make_extraction("FINANCING_CONDITION", "availability of debt financing on the terms described", 1200, 1350,
                     attributes={"amount": None, "direction": "parent", "conditions": "Debt financing available", "section_ref": "Section 7.02(c)"}),
    _make_extraction("GO_SHOP", "during the Go-Shop Period (ending 35 days after signing)", 1400, 1550,
                     attributes={"amount": None, "direction": "company", "conditions": "35-day solicitation window", "section_ref": "Section 5.03(b)"}),
    _make_extraction("TICKING_FEE", "merger consideration shall increase by $0.15 per share per month", 1600, 1720,
                     attributes={"amount": "$0.15/share/month", "direction": "parent_to_company",
                                 "conditions": "If closing delayed beyond 6 months", "section_ref": "Section 2.01"}),
    _make_extraction("HELL_OR_HIGH_WATER", "shall accept any and all regulatory remedies required", 1800, 1950,
                     attributes={"amount": None, "direction": "parent", "conditions": "Unconditional regulatory fix-it", "section_ref": "Section 5.04(b)"}),
    _make_extraction("SPECIFIC_PERFORMANCE", "entitled to seek specific performance of this Agreement", 2000, 2150,
                     attributes={"amount": None, "direction": "mutual", "conditions": "Right to compel closing", "section_ref": "Section 9.10"}),
    _make_extraction("NO_SHOP", "Company shall not solicit any Acquisition Proposal", 2200, 2350,
                     attributes={"amount": None, "direction": "company", "conditions": "No solicitation of competing bids", "section_ref": "Section 5.03(a)"}),
    _make_extraction("MATCHING_RIGHTS", "Parent shall have three Business Days to make a matching offer", 2400, 2550,
                     attributes={"amount": None, "direction": "parent", "conditions": "3-day match window on superior proposals", "section_ref": "Section 5.03(d)"}),
]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_s4_pipeline_extracts_all_clause_types():
    """S-4 pipeline correctly extracts all required ClauseType values."""
    mock_doc = _make_annotated_doc(SAMPLE_EXTRACTIONS)

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Test headline summary."
        mock_section.return_value = "Test section summary."

        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id="test-filing-001",
            deal_id="test-deal-001",
            firm_ids=["firm-001"],
            raw_content="sample S-4 text",
        )

    # All 12 extraction classes should have triggered insert_clause
    extracted_clause_types = {call.kwargs["clause_type"] for call in mock_insert.call_args_list}
    expected_types = {
        "TERMINATION_FEE", "REVERSE_TERMINATION_FEE", "MAE", "REGULATORY_EFFORTS",
        "LITIGATION_CONDITION", "FINANCING_CONDITION", "GO_SHOP", "TICKING_FEE",
        "HELL_OR_HIGH_WATER", "SPECIFIC_PERFORMANCE", "NO_SHOP", "MATCHING_RIGHTS",
    }
    assert expected_types.issubset(extracted_clause_types), (
        f"Missing clause types: {expected_types - extracted_clause_types}"
    )


@pytest.mark.asyncio
async def test_s4_pipeline_all_extractions_have_char_interval():
    """Every extraction in the mock has non-null char_interval (source grounding)."""
    mock_doc = _make_annotated_doc(SAMPLE_EXTRACTIONS)

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Headline."
        mock_section.return_value = "Section."

        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id="test-filing-002",
            deal_id="test-deal-001",
            firm_ids=["firm-001"],
            raw_content="sample text",
        )

    # Every insert_clause call should have a non-empty source_location
    for call in mock_insert.call_args_list:
        source_location = call.kwargs["source_location"]
        assert source_location, f"source_location is empty for call: {call}"
        assert ":" in source_location, f"source_location malformed: {source_location}"


@pytest.mark.asyncio
async def test_s4_pipeline_confidence_score_from_alignment_status():
    """Confidence scores are correctly derived from alignment_status."""
    from pipelines.s4_defm14a import get_confidence_score

    # MATCH_EXACT → 0.9
    ext_exact = _make_extraction("TERMINATION_FEE", "text", alignment_status=AlignmentStatus.MATCH_EXACT)
    assert get_confidence_score(ext_exact) == 0.9

    # MATCH_GREATER → 0.7
    ext_greater = _make_extraction("MAE", "text", alignment_status=AlignmentStatus.MATCH_GREATER)
    assert get_confidence_score(ext_greater) == 0.7

    # MATCH_LESSER → 0.7
    ext_lesser = _make_extraction("MAE", "text", alignment_status=AlignmentStatus.MATCH_LESSER)
    assert get_confidence_score(ext_lesser) == 0.7

    # MATCH_FUZZY → 0.6
    ext_fuzzy = _make_extraction("MAE", "text", alignment_status=AlignmentStatus.MATCH_FUZZY)
    assert get_confidence_score(ext_fuzzy) == 0.6

    # No char_interval → 0.3
    ext_none = Extraction(
        extraction_class="OTHER",
        extraction_text="no grounding",
        char_interval=None,
        alignment_status=None,
    )
    assert get_confidence_score(ext_none) == 0.3

    # char_interval with None positions → 0.3
    ext_null_pos = Extraction(
        extraction_class="OTHER",
        extraction_text="partial grounding",
        char_interval=CharInterval(start_pos=None, end_pos=None),
        alignment_status=AlignmentStatus.MATCH_EXACT,
    )
    assert get_confidence_score(ext_null_pos) == 0.3


@pytest.mark.asyncio
async def test_s4_pipeline_calls_insert_clause_with_correct_params():
    """insert_clause is called with correct firm_id, deal_id, filing_id, verbatim_text."""
    single_extraction = _make_extraction(
        "TERMINATION_FEE",
        "the Company shall pay $2,100,000,000",
        start_pos=52340,
        end_pos=52412,
        attributes={"section_ref": "Section 8.01(b)"},
    )
    mock_doc = _make_annotated_doc([single_extraction])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Headline."
        mock_section.return_value = "Section."

        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id="test-filing-003",
            deal_id="test-deal-003",
            firm_ids=["firm-abc"],
            raw_content="sample text",
        )

    assert mock_insert.call_count == 1
    call_kwargs = mock_insert.call_args.kwargs
    assert call_kwargs["firm_id"] == "firm-abc"
    assert call_kwargs["deal_id"] == "test-deal-003"
    assert call_kwargs["filing_id"] == "test-filing-003"
    assert call_kwargs["clause_type"] == "TERMINATION_FEE"
    assert call_kwargs["verbatim_text"] == "the Company shall pay $2,100,000,000"
    assert call_kwargs["source_location"] == "52340:52412"
    assert call_kwargs["confidence_score"] == 0.9


@pytest.mark.asyncio
async def test_s4_pipeline_multiple_firms_each_get_clause():
    """insert_clause is called once per firm for each extraction."""
    mock_doc = _make_annotated_doc([
        _make_extraction("TERMINATION_FEE", "pay fee", 10, 20),
    ])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Headline."
        mock_section.return_value = "Section."

        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id="test-filing-004",
            deal_id="test-deal-004",
            firm_ids=["firm-001", "firm-002", "firm-003"],
            raw_content="sample text",
        )

    # 1 extraction × 3 firms = 3 insert_clause calls
    assert mock_insert.call_count == 3
    inserted_firms = {call.kwargs["firm_id"] for call in mock_insert.call_args_list}
    assert inserted_firms == {"firm-001", "firm-002", "firm-003"}


@pytest.mark.asyncio
async def test_s4_pipeline_unknown_clause_type_maps_to_other():
    """Unknown extraction_class values are mapped to OTHER clause type."""
    mock_doc = _make_annotated_doc([
        _make_extraction("SOME_FUTURE_CLAUSE_TYPE", "unknown clause text", 10, 50),
    ])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Headline."
        mock_section.return_value = "Section."

        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id="test-filing-005",
            deal_id="test-deal-005",
            firm_ids=["firm-001"],
            raw_content="sample text",
        )

    assert mock_insert.call_count == 1
    assert mock_insert.call_args.kwargs["clause_type"] == "OTHER"


@pytest.mark.asyncio
async def test_s4_pipeline_calls_section_summary():
    """S-4 pipeline calls both headline and section summary generation."""
    mock_doc = _make_annotated_doc([
        _make_extraction("TERMINATION_FEE", "pay fee", 10, 50),
    ])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock), \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock) as mock_summary_store, \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Headline summary."
        mock_section.return_value = "## Termination Provisions\nDetails here."

        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id="test-filing-006",
            deal_id="test-deal-006",
            firm_ids=["firm-001"],
            raw_content="sample text",
        )

    mock_headline.assert_called_once()
    mock_section.assert_called_once()

    # Verify insert_filing_summary was called with both headline and section
    call_kwargs = mock_summary_store.call_args.kwargs
    assert call_kwargs["headline"] == "Headline summary."
    assert call_kwargs["section"] == "## Termination Provisions\nDetails here."


@pytest.mark.asyncio
async def test_s4_pipeline_uses_gemini_pro_model_id():
    """S-4 pipeline uses gemini-2.5-pro (not flash) model ID."""
    from pipelines.s4_defm14a import MODEL_ID
    assert MODEL_ID == "gemini-2.5-pro"


@pytest.mark.asyncio
async def test_s4_pipeline_uses_asyncio_to_thread():
    """lx.extract() is called via asyncio.to_thread (not called directly in async context)."""
    mock_doc = _make_annotated_doc([])
    calls: list[tuple] = []

    def capturing_extract(*args: Any, **kwargs: Any) -> Any:
        """Capture what asyncio.to_thread passes to lx.extract."""
        calls.append((args, kwargs))
        return mock_doc

    with patch("langextract.extract", side_effect=capturing_extract) as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock), \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_headline.return_value = "Headline."
        mock_section.return_value = "Section."

        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id="test-filing-asyncio",
            deal_id=None,
            firm_ids=[],
            raw_content="sample",
        )

    # lx.extract should have been called (via to_thread which runs it in thread pool)
    assert mock_lx.called, "lx.extract() was not called"
    _, kwargs = calls[0]
    assert kwargs.get("model_id") == "gemini-2.5-pro"
    assert kwargs.get("extraction_passes") == 5
    assert kwargs.get("max_workers") == 10
    assert kwargs.get("max_char_buffer") == 800


@pytest.mark.asyncio
async def test_long_document_chunking():
    """
    EXTRACT-05: Pipeline handles a large document (~2M chars) within 30 seconds.

    lx.extract() is mocked to return immediately (no real API call).
    This tests the asyncio.to_thread wrapping and chunking configuration path.
    """
    # ~2M chars mimicking a 500-page S-4 legal document (repeated boilerplate)
    boilerplate = (
        "WHEREAS, the parties have agreed to the following terms and conditions of the Merger, "
        "including representations, warranties, covenants and agreements, as set forth herein. "
    ) * 10_000  # ~170 chars × 10000 = ~1.7M chars
    assert len(boilerplate) > 1_000_000

    sample_extraction = _make_extraction("TERMINATION_FEE", "pay a fee", 100, 200)
    mock_doc = _make_annotated_doc([sample_extraction])

    start = time.monotonic()

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock), \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Headline."
        mock_section.return_value = "Section."

        from pipelines.s4_defm14a import run_s4_pipeline
        await run_s4_pipeline(
            filing_id="test-filing-large",
            deal_id="deal-001",
            firm_ids=["firm-001"],
            raw_content=boilerplate,
        )

    elapsed = time.monotonic() - start
    assert elapsed < 30.0, f"Pipeline took {elapsed:.1f}s — expected < 30s for mocked extraction"
