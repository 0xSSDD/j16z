"""
Tests for the SC 13D/13G extraction pipeline.

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
    return AnnotatedDocument(extractions=extractions, text="sample 13D/13G text")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_thirteend_g_pipeline_uses_flash_model_id():
    """13D/13G pipeline uses gemini-2.5-flash (not pro) model ID."""
    from pipelines.thirteend_g import MODEL_ID
    assert MODEL_ID == "gemini-2.5-flash"


@pytest.mark.asyncio
async def test_thirteend_g_pipeline_extracts_ownership_stake():
    """13D/13G pipeline correctly processes OWNERSHIP_STAKE extractions."""
    ownership_extraction = _make_extraction(
        "OWNERSHIP_STAKE",
        "Apex Capital beneficially owned 12,450,000 shares representing approximately 9.8%",
        start_pos=270,
        end_pos=424,
        attributes={"percentage": "9.8%", "shares_held": "12,450,000",
                    "filing_type": "SC 13D", "as_of_date": "February 10, 2026"},
    )
    mock_doc = _make_annotated_doc([ownership_extraction])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Activist investor disclosed 9.8% stake."

        from pipelines.thirteend_g import run_13dg_pipeline
        await run_13dg_pipeline(
            filing_id="test-13d-001",
            deal_id=None,
            firm_ids=["firm-001"],
            raw_content="sample 13D text",
        )

    assert mock_insert.call_count == 1
    call_kwargs = mock_insert.call_args.kwargs
    assert call_kwargs["clause_type"] == "OTHER"
    assert call_kwargs["filing_id"] == "test-13d-001"
    assert "9.8%" in call_kwargs["verbatim_text"] or "Apex Capital" in call_kwargs["verbatim_text"]
    # Ownership stake title should reference the percentage
    assert "9.8%" in call_kwargs["title"]


@pytest.mark.asyncio
async def test_thirteend_g_pipeline_handles_all_13dg_classes():
    """13D/13G pipeline correctly handles OWNERSHIP_STAKE, PURPOSE_OF_TRANSACTION, SOURCE_OF_FUNDS."""
    extractions = [
        _make_extraction(
            "OWNERSHIP_STAKE",
            "beneficially owned 12,450,000 shares (9.8%)",
            10, 80,
            attributes={"percentage": "9.8%", "shares_held": "12,450,000"},
        ),
        _make_extraction(
            "PURPOSE_OF_TRANSACTION",
            "believes the board should explore a sale of the Issuer",
            90, 200,
            attributes={"purpose": "activist_pressure_strategic_sale", "intent": "active"},
        ),
        _make_extraction(
            "SOURCE_OF_FUNDS",
            "financed through working capital of Apex Capital Management, LLC",
            210, 300,
            attributes={"intent": "active"},
        ),
        _make_extraction(
            "OTHER",
            "other disclosure item",
            310, 360,
        ),
    ]
    mock_doc = _make_annotated_doc(extractions)

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Activist 9.8% stake with strategic intent."

        from pipelines.thirteend_g import run_13dg_pipeline
        await run_13dg_pipeline(
            filing_id="test-13d-002",
            deal_id=None,
            firm_ids=["firm-001"],
            raw_content="13D text",
        )

    assert mock_insert.call_count == 4
    for call in mock_insert.call_args_list:
        # All 13D/13G classes map to "OTHER" clause type
        assert call.kwargs["clause_type"] == "OTHER"


@pytest.mark.asyncio
async def test_thirteend_g_pipeline_no_section_summary():
    """13D/13G pipeline calls headline summary only — NOT section summary."""
    mock_doc = _make_annotated_doc([
        _make_extraction("OWNERSHIP_STAKE", "owns 9.8%", 10, 50,
                         attributes={"percentage": "9.8%"}),
    ])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock), \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock) as mock_summary_store, \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline, \
         patch("summaries.analyst_summary.generate_section_summary", new_callable=AsyncMock) as mock_section:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Activist investor summary."

        from pipelines.thirteend_g import run_13dg_pipeline
        await run_13dg_pipeline(
            filing_id="test-13d-003",
            deal_id=None,
            firm_ids=["firm-001"],
            raw_content="13D text",
        )

    mock_headline.assert_called_once()
    mock_section.assert_not_called()

    # insert_filing_summary called with section=None for 13D/13G
    call_kwargs = mock_summary_store.call_args.kwargs
    assert call_kwargs["section"] is None


@pytest.mark.asyncio
async def test_thirteend_g_pipeline_calls_insert_clause_per_firm():
    """insert_clause is called once per firm for each extraction."""
    mock_doc = _make_annotated_doc([
        _make_extraction("OWNERSHIP_STAKE", "owns 9.8%", 10, 50,
                         attributes={"percentage": "9.8%"}),
    ])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock) as mock_insert, \
         patch("db.mark_filing_extracted", new_callable=AsyncMock), \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "Headline."

        from pipelines.thirteend_g import run_13dg_pipeline
        await run_13dg_pipeline(
            filing_id="test-13d-004",
            deal_id=None,
            firm_ids=["firm-X", "firm-Y"],
            raw_content="13D text",
        )

    assert mock_insert.call_count == 2
    inserted_firms = {call.kwargs["firm_id"] for call in mock_insert.call_args_list}
    assert inserted_firms == {"firm-X", "firm-Y"}


@pytest.mark.asyncio
async def test_thirteend_g_pipeline_confidence_score_from_alignment():
    """Confidence scores are correctly computed from alignment status."""
    from pipelines.thirteend_g import get_confidence_score

    # MATCH_EXACT → 0.9
    ext_exact = _make_extraction("OWNERSHIP_STAKE", "text", alignment_status=AlignmentStatus.MATCH_EXACT)
    assert get_confidence_score(ext_exact) == 0.9

    # MATCH_FUZZY → 0.6
    ext_fuzzy = _make_extraction("OWNERSHIP_STAKE", "text", alignment_status=AlignmentStatus.MATCH_FUZZY)
    assert get_confidence_score(ext_fuzzy) == 0.6

    # No char_interval → 0.3
    ext_no_ci = Extraction(
        extraction_class="OWNERSHIP_STAKE",
        extraction_text="no grounding",
        char_interval=None,
        alignment_status=None,
    )
    assert get_confidence_score(ext_no_ci) == 0.3


@pytest.mark.asyncio
async def test_thirteend_g_pipeline_marks_filing_extracted():
    """mark_filing_extracted is called after successful extraction."""
    mock_doc = _make_annotated_doc([])

    with patch("langextract.extract") as mock_lx, \
         patch("db.insert_clause", new_callable=AsyncMock), \
         patch("db.mark_filing_extracted", new_callable=AsyncMock) as mock_mark, \
         patch("db.insert_filing_summary", new_callable=AsyncMock), \
         patch("summaries.analyst_summary.generate_headline_summary", new_callable=AsyncMock) as mock_headline:

        mock_lx.return_value = mock_doc
        mock_headline.return_value = "No extractions."

        from pipelines.thirteend_g import run_13dg_pipeline
        await run_13dg_pipeline(
            filing_id="test-13d-005",
            deal_id=None,
            firm_ids=[],
            raw_content="13G text",
        )

    mock_mark.assert_called_once_with("test-13d-005")
