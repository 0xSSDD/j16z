"""
Golden file regression test harness.

Protects against LLM model behavior changes by comparing extraction outputs
to pre-approved golden files. This is the nightly CI gate.

Structure:
  tests/fixtures/  — Input filing text files (*.txt, one per filing)
  tests/golden/    — Expected output JSONL files (auto-generated with --gen-files)

Locked decision: 20 real EDGAR filings form the golden set.
  - 8 S-4/DEFM14A (complex proxy filings with M&A clauses)
  - 6 8-K filings (deal announcement and amendment filings)
  - 6 SC 13D/13G filings (activist ownership filings)

NOTE: The fixtures and golden files require a bootstrap sprint with real EDGAR
filings. This test is a no-op (parametrize produces empty list) until fixtures
are added. The harness structure is correct and CI-ready.

Usage:
  pytest tests/test_regression.py              # Run regression (nightly CI)
  pytest tests/test_regression.py --gen-files  # Regenerate golden files after
                                                # intentional model/prompt changes
"""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Optional

import pytest

logger = logging.getLogger(__name__)

GOLDEN_DIR = Path(__file__).parent / "golden"
FIXTURES_DIR = Path(__file__).parent / "fixtures"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_fixture_files() -> list[Path]:
    """Return all *.txt fixtures, or empty list if directory doesn't exist."""
    if not FIXTURES_DIR.exists():
        return []
    return sorted(FIXTURES_DIR.glob("*.txt"))


def _filing_type_from_stem(stem: str) -> str:
    """
    Derive filing type from the fixture filename stem.

    Convention: {FILING_TYPE}_{accession_or_description}.txt
    Examples:
      S4_msft_activision_2022.txt   → "S-4"
      8K_googl_alphabet_deal.txt    → "8-K"
      13D_nelson_peltz_disney.txt   → "SC 13D"

    Supported prefixes:
      S4    → S-4
      DEFM  → DEFM14A
      8K    → 8-K
      8KA   → 8-K/A
      13D   → SC 13D
      13G   → SC 13G
    """
    prefix = stem.split("_")[0].upper()
    mapping = {
        "S4": "S-4",
        "S4A": "S-4/A",
        "DEFM": "DEFM14A",
        "PREM": "PREM14A",
        "8K": "8-K",
        "8KA": "8-K/A",
        "13D": "SC 13D",
        "13DA": "SC 13D/A",
        "13G": "SC 13G",
        "13GA": "SC 13G/A",
    }
    return mapping.get(prefix, "UNKNOWN")


def _run_extraction_sync(filing_text: str, filing_type: str) -> Any:
    """
    Run extraction synchronously for testing purposes.

    Dispatches to the correct pipeline based on filing_type.
    Requires LANGEXTRACT_API_KEY (GOOGLE_API_KEY) env var — nightly CI only.

    Returns an AnnotatedDocument (single) or list[AnnotatedDocument].
    """
    import langextract as lx

    # Import correct pipeline based on filing type
    if filing_type in ("S-4", "S-4/A", "DEFM14A", "PREM14A"):
        from pipelines.s4_defm14a import EXTRACTION_PASSES, MAX_CHAR_BUFFER, MAX_WORKERS, MODEL_ID, PROMPT, load_examples
    elif filing_type in ("8-K", "8-K/A"):
        from pipelines.eightk import EXTRACTION_PASSES, MAX_CHAR_BUFFER, MAX_WORKERS, MODEL_ID, PROMPT, load_examples
    elif filing_type in ("SC 13D", "SC 13D/A", "SC 13G", "SC 13G/A"):
        from pipelines.thirteend_g import EXTRACTION_PASSES, MAX_CHAR_BUFFER, MAX_WORKERS, MODEL_ID, PROMPT, load_examples
    else:
        pytest.skip(f"No pipeline for filing type: {filing_type}")

    examples = load_examples()
    result = lx.extract(
        filing_text,
        prompt_description=PROMPT,
        examples=examples,
        model_id=MODEL_ID,
        extraction_passes=EXTRACTION_PASSES,
        max_workers=MAX_WORKERS,
        max_char_buffer=MAX_CHAR_BUFFER,
    )
    return result


def _extraction_to_dict(extraction: Any) -> dict:
    """Serialise a single Extraction to a dict for golden file comparison."""
    return {
        "extraction_class": extraction.extraction_class,
        "extraction_text": extraction.extraction_text,
        "start_pos": (
            extraction.char_interval.start_pos
            if extraction.char_interval and extraction.char_interval.start_pos is not None
            else None
        ),
        "end_pos": (
            extraction.char_interval.end_pos
            if extraction.char_interval and extraction.char_interval.end_pos is not None
            else None
        ),
        "attributes": extraction.attributes,
    }


# ---------------------------------------------------------------------------
# Regression tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("filing_fixture", _get_fixture_files())
def test_extraction_regression(filing_fixture: Path, datadir: Path) -> None:
    """
    Regression test: extraction output must match golden files.

    Run with --gen-files to regenerate golden files after intentional changes.
    Nightly CI gate — fails on any extraction delta.

    NOTE: Fixtures and golden files will be populated during bootstrap sprint.
    This test is a no-op until fixtures exist.
    """
    import langextract as lx

    filing_text = filing_fixture.read_text(encoding="utf-8")
    filing_type = _filing_type_from_stem(filing_fixture.stem)

    logger.info(f"[regression] Testing {filing_fixture.name} (type={filing_type})")

    # Run extraction — requires GOOGLE_API_KEY (nightly CI only)
    result = _run_extraction_sync(filing_text, filing_type)

    # Normalise result to list[AnnotatedDocument]
    if not isinstance(result, list):
        result = [result]

    # Collect all extractions
    all_extractions = []
    for doc in result:
        if hasattr(doc, "extractions"):
            all_extractions.extend(doc.extractions)

    extraction_output = [_extraction_to_dict(e) for e in all_extractions]

    # Write golden JSONL for visual inspection
    GOLDEN_DIR.mkdir(exist_ok=True)
    filing_stem = filing_fixture.stem
    jsonl_path = GOLDEN_DIR / f"{filing_stem}.jsonl"
    lx.io.save_annotated_documents(result, str(jsonl_path))

    # Generate visualization HTML for manual inspection
    viz_html_path = GOLDEN_DIR / f"{filing_stem}_viz.html"
    try:
        lx.visualize(str(jsonl_path), output_file=str(viz_html_path))
        logger.info(f"[regression] Visualization HTML: {viz_html_path}")
    except Exception:
        logger.warning(f"[regression] Could not generate viz HTML for {filing_stem}")

    # Golden file comparison via pytest-regressions
    # pytest-regressions compares against {test_name}/{filing_fixture.stem}.json
    # Use --gen-files flag to regenerate golden files after intentional changes
    golden_path = GOLDEN_DIR / f"{filing_stem}.json"
    if golden_path.exists():
        with golden_path.open() as f:
            expected = json.load(f)
        assert extraction_output == expected, (
            f"Extraction output for {filing_fixture.name} does not match golden file. "
            f"If this change is intentional, regenerate with --gen-files."
        )
    else:
        # First run — write the golden file
        with golden_path.open("w") as f:
            json.dump(extraction_output, f, indent=2)
        logger.info(f"[regression] Generated new golden file: {golden_path}")


# ---------------------------------------------------------------------------
# Harness smoke test — always passes even without fixtures
# ---------------------------------------------------------------------------

def test_regression_harness_structure() -> None:
    """
    Verify the regression harness directories exist and are discoverable.

    This test always passes — it just validates the harness scaffolding is
    in place for when fixtures are added during the bootstrap sprint.
    """
    assert FIXTURES_DIR.exists(), f"Fixtures directory missing: {FIXTURES_DIR}"
    assert GOLDEN_DIR.exists(), f"Golden directory missing: {GOLDEN_DIR}"


def test_fixture_count_logged() -> None:
    """Log how many fixtures are available (informational — always passes)."""
    fixtures = _get_fixture_files()
    logger.info(f"[regression] {len(fixtures)} fixture files available in {FIXTURES_DIR}")
    # No assertion — just informational logging
    # When 20 fixtures are added, this will log "20 fixture files available"


def test_filing_type_detection() -> None:
    """Verify the fixture filename → filing type mapping works correctly."""
    test_cases = [
        ("S4_msft_activision", "S-4"),
        ("S4A_amended_proxy", "S-4/A"),
        ("DEFM_merger_proxy", "DEFM14A"),
        ("8K_deal_announcement", "8-K"),
        ("8KA_amendment", "8-K/A"),
        ("13D_activist_stake", "SC 13D"),
        ("13G_passive_ownership", "SC 13G"),
        ("13GA_amended_position", "SC 13G/A"),
    ]
    for stem, expected_type in test_cases:
        detected = _filing_type_from_stem(stem)
        assert detected == expected_type, (
            f"stem='{stem}': expected '{expected_type}', got '{detected}'"
        )
