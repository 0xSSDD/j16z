"""
Tests for the analyst summary generation module.

Uses mocked Google Gemini API — no real LLM calls.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Sample clause fixtures
# ---------------------------------------------------------------------------

SAMPLE_S4_CLAUSES = [
    {
        "type": "TERMINATION_FEE",
        "verbatim_text": "the Company shall pay to Parent a fee equal to $2,100,000,000",
        "attributes": {"amount": "$2,100,000,000", "direction": "company_to_parent",
                       "section_ref": "Section 8.01(b)"},
    },
    {
        "type": "REVERSE_TERMINATION_FEE",
        "verbatim_text": "Parent shall pay to the Company a fee equal to $4,200,000,000",
        "attributes": {"amount": "$4,200,000,000", "direction": "parent_to_company",
                       "section_ref": "Section 8.01(c)"},
    },
    {
        "type": "MAE",
        "verbatim_text": "Material Adverse Effect excludes pandemics, epidemics including COVID-19",
        "attributes": {"conditions": "Excludes pandemic, war, macro changes"},
    },
]

SAMPLE_8K_CLAUSES = [
    {
        "type": "MATERIAL_EVENT",
        "verbatim_text": "entered into Agreement and Plan of Merger with TechCorp",
        "attributes": {"event_type": "merger_agreement_signed", "item_number": "Item 1.01"},
    },
]

SAMPLE_13D_CLAUSES = [
    {
        "type": "OWNERSHIP_STAKE",
        "verbatim_text": "beneficially owned 12,450,000 shares representing approximately 9.8%",
        "attributes": {"percentage": "9.8%", "shares_held": "12,450,000", "intent": "active"},
    },
]

SAMPLE_CLAUSES_BY_CATEGORY = {
    "Termination Provisions": [
        {
            "type": "TERMINATION_FEE",
            "verbatim_text": "company shall pay $2.1B termination fee",
            "attributes": {"amount": "$2,100,000,000"},
        },
        {
            "type": "REVERSE_TERMINATION_FEE",
            "verbatim_text": "parent shall pay $4.2B reverse termination fee",
            "attributes": {"amount": "$4,200,000,000"},
        },
    ],
    "Conditions": [
        {
            "type": "MAE",
            "verbatim_text": "Material Adverse Effect definition excludes pandemic",
            "attributes": {"conditions": "Excludes COVID-19"},
        },
    ],
    "Protective Provisions": [
        {
            "type": "GO_SHOP",
            "verbatim_text": "35-day go-shop period to solicit competing offers",
            "attributes": {"conditions": "35-day window"},
        },
    ],
    "Other": [],
}


# ---------------------------------------------------------------------------
# Helpers to build a mock Gemini response
# ---------------------------------------------------------------------------

def _mock_gemini_response(text: str) -> MagicMock:
    """Return a mock that mimics genai.GenerativeModel.generate_content() response."""
    mock_response = MagicMock()
    mock_response.text = text
    return mock_response


# ---------------------------------------------------------------------------
# Tests: generate_headline_summary
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_headline_summary_returns_analyst_text():
    """generate_headline_summary returns Gemini response text."""
    expected_text = (
        "S-4 reveals $2.1B termination fee and $4.2B reverse termination fee. "
        "MAE clause excludes pandemic (COVID-19 named). Reverse fee is above median for deal size."
    )

    with patch("google.generativeai.GenerativeModel") as MockModel:
        mock_instance = MockModel.return_value
        mock_instance.generate_content.return_value = _mock_gemini_response(expected_text)

        # Re-import to pick up patched model
        import importlib
        import summaries.analyst_summary as summary_mod
        summary_mod.MODEL = mock_instance

        result = await summary_mod.generate_headline_summary(
            clauses=SAMPLE_S4_CLAUSES,
            filing_type="S-4/DEFM14A",
            filing_metadata={"filing_id": "test-001", "deal_id": "deal-001"},
        )

    assert result == expected_text


@pytest.mark.asyncio
async def test_generate_headline_summary_produces_nonempty_output():
    """generate_headline_summary returns non-empty string for non-empty clauses."""
    mock_response_text = "Key terms extracted from the S-4 filing. Watch for termination fee triggers."

    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        mock_model.generate_content.return_value = _mock_gemini_response(mock_response_text)
        summary_mod.MODEL = mock_model

        result = await summary_mod.generate_headline_summary(
            clauses=SAMPLE_S4_CLAUSES,
            filing_type="S-4/DEFM14A",
            filing_metadata={},
        )
    finally:
        summary_mod.MODEL = original_model

    assert isinstance(result, str)
    assert len(result) > 0
    assert result == mock_response_text


@pytest.mark.asyncio
async def test_generate_headline_summary_empty_clauses_returns_message():
    """generate_headline_summary with empty clauses returns a no-extraction message without calling Gemini."""
    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        summary_mod.MODEL = mock_model

        result = await summary_mod.generate_headline_summary(
            clauses=[],
            filing_type="8-K",
            filing_metadata={},
        )
    finally:
        summary_mod.MODEL = original_model

    # Should not call Gemini for empty clause list
    mock_model.generate_content.assert_not_called()
    assert "No clauses extracted" in result or len(result) > 0


@pytest.mark.asyncio
async def test_generate_headline_summary_error_returns_fallback():
    """generate_headline_summary returns fallback string when Gemini API fails."""
    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = RuntimeError("API quota exceeded")
        summary_mod.MODEL = mock_model

        result = await summary_mod.generate_headline_summary(
            clauses=SAMPLE_S4_CLAUSES,
            filing_type="S-4/DEFM14A",
            filing_metadata={},
        )
    finally:
        summary_mod.MODEL = original_model

    assert result == "Summary generation failed — review extracted clauses directly."


# ---------------------------------------------------------------------------
# Tests: generate_section_summary
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_section_summary_returns_multi_section_output():
    """generate_section_summary returns a multi-paragraph summary with section headers."""
    expected_text = (
        "## Termination Provisions\n"
        "$2.1B termination fee (above median). $4.2B reverse fee provides deal certainty.\n\n"
        "## Conditions\n"
        "MAE excludes pandemic — favorable for acquirer in current environment.\n\n"
        "## Protective Provisions\n"
        "35-day go-shop above median (typical is 30 days). Indicates board confidence."
    )

    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        mock_model.generate_content.return_value = _mock_gemini_response(expected_text)
        summary_mod.MODEL = mock_model

        result = await summary_mod.generate_section_summary(
            clauses_by_category=SAMPLE_CLAUSES_BY_CATEGORY,
            filing_type="S-4/DEFM14A",
        )
    finally:
        summary_mod.MODEL = original_model

    assert result == expected_text
    # Should contain section content
    assert "Termination" in result or "Conditions" in result or len(result) > 20


@pytest.mark.asyncio
async def test_generate_section_summary_error_returns_fallback():
    """generate_section_summary returns fallback string when Gemini API fails."""
    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("Network timeout")
        summary_mod.MODEL = mock_model

        result = await summary_mod.generate_section_summary(
            clauses_by_category=SAMPLE_CLAUSES_BY_CATEGORY,
            filing_type="S-4/DEFM14A",
        )
    finally:
        summary_mod.MODEL = original_model

    assert result == "Summary generation failed — review extracted clauses directly."


@pytest.mark.asyncio
async def test_generate_section_summary_empty_categories_returns_message():
    """generate_section_summary with all-empty categories returns a message."""
    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        summary_mod.MODEL = mock_model

        empty_categories = {k: [] for k in SAMPLE_CLAUSES_BY_CATEGORY}
        result = await summary_mod.generate_section_summary(
            clauses_by_category=empty_categories,
            filing_type="S-4/DEFM14A",
        )
    finally:
        summary_mod.MODEL = original_model

    mock_model.generate_content.assert_not_called()
    assert len(result) > 0


# ---------------------------------------------------------------------------
# Tests: generate_delta_summary
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_delta_summary_highlights_changes():
    """generate_delta_summary produces a delta-aware summary when prior clauses exist."""
    expected_delta_text = (
        "Revised S-4 increases termination fee from $1.8B to $2.1B (+17%). "
        "MAE clause now explicitly excludes tariff-related impacts — new addition."
    )
    prior_clauses = [
        {
            "type": "TERMINATION_FEE",
            "verbatim_text": "company shall pay $1,800,000,000 termination fee",
            "attributes": {"amount": "$1,800,000,000"},
        },
    ]

    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        mock_model.generate_content.return_value = _mock_gemini_response(expected_delta_text)
        summary_mod.MODEL = mock_model

        result = await summary_mod.generate_delta_summary(
            new_clauses=SAMPLE_S4_CLAUSES,
            previous_clauses=prior_clauses,
            filing_type="S-4/DEFM14A",
        )
    finally:
        summary_mod.MODEL = original_model

    assert result == expected_delta_text
    mock_model.generate_content.assert_called_once()


@pytest.mark.asyncio
async def test_generate_delta_summary_falls_back_to_headline_when_no_prior():
    """generate_delta_summary falls back to standard headline when no prior clauses exist."""
    expected_headline = "S-4 reveals $2.1B termination fee. No prior extraction to compare against."

    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        mock_model.generate_content.return_value = _mock_gemini_response(expected_headline)
        summary_mod.MODEL = mock_model

        result = await summary_mod.generate_delta_summary(
            new_clauses=SAMPLE_S4_CLAUSES,
            previous_clauses=[],  # No prior extraction
            filing_type="S-4/DEFM14A",
        )
    finally:
        summary_mod.MODEL = original_model

    # Should have called generate_headline_summary (which calls generate_content once)
    assert result == expected_headline
    mock_model.generate_content.assert_called_once()


@pytest.mark.asyncio
async def test_generate_delta_summary_error_returns_fallback():
    """generate_delta_summary returns fallback string when Gemini API fails."""
    prior_clauses = [{"type": "TERMINATION_FEE", "verbatim_text": "old text", "attributes": {}}]

    import summaries.analyst_summary as summary_mod
    original_model = summary_mod.MODEL

    try:
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("API error")
        summary_mod.MODEL = mock_model

        result = await summary_mod.generate_delta_summary(
            new_clauses=SAMPLE_S4_CLAUSES,
            previous_clauses=prior_clauses,
            filing_type="S-4/DEFM14A",
        )
    finally:
        summary_mod.MODEL = original_model

    assert result == "Summary generation failed — review extracted clauses directly."


# ---------------------------------------------------------------------------
# Tests: model configuration
# ---------------------------------------------------------------------------

def test_summary_module_uses_flash_model():
    """Analyst summary module uses gemini-2.5-flash (cost-efficient for summaries)."""
    import summaries.analyst_summary as summary_mod
    assert summary_mod._MODEL_NAME == "gemini-2.5-flash"


def test_summary_module_uses_google_generativeai():
    """Analyst summary module imports google.generativeai SDK."""
    import summaries.analyst_summary as summary_mod
    assert hasattr(summary_mod, "genai")
    assert hasattr(summary_mod, "MODEL")
