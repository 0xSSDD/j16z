"""
Integration tests — live Gemini API via lx.extract().
Skipped when LANGEXTRACT_API_KEY is not set.

Loads real SEC filing text from fixture files. Free-tier safe: extraction_passes=1, max_workers=1, ~4 API calls total.
Run: LANGEXTRACT_API_KEY=... python3 -m pytest tests/test_integration.py -v -s
"""
from __future__ import annotations

import os
import time
from pathlib import Path

import pytest

import langextract as lx
from langextract.data import Extraction

from pipelines.s4_defm14a import (
    PROMPT as S4_PROMPT,
    VALID_CLAUSE_TYPES,
    get_confidence_score as s4_confidence,
    load_examples as load_s4_examples,
)
from pipelines.eightk import (
    PROMPT as EIGHTK_PROMPT,
    get_confidence_score as eightk_confidence,
    load_examples as load_eightk_examples,
)

skip_no_api_key = pytest.mark.skipif(
    not os.environ.get('LANGEXTRACT_API_KEY'),
    reason='LANGEXTRACT_API_KEY not set — skipping live Gemini tests',
)


def _load_fixture(filename: str) -> str:
    fixture_path = Path(__file__).parent / 'fixtures' / filename
    return fixture_path.read_text(encoding='utf-8')

def _extract_all(result) -> list[Extraction]:
    if not isinstance(result, list):
        result = [result]
    extractions: list[Extraction] = []
    for doc in result:
        if hasattr(doc, 'extractions') and doc.extractions:
            extractions.extend(doc.extractions)
    return extractions


@skip_no_api_key
def test_eightk_pipeline_extraction():
    examples = load_eightk_examples()
    assert len(examples) >= 1

    eightk_filing_text = _load_fixture('discover_capital_one_8k.txt')
    result = lx.extract(
        eightk_filing_text,
        prompt_description=EIGHTK_PROMPT,
        examples=examples,
        model_id='gemini-2.5-flash',
        extraction_passes=1,
        max_workers=1,
        max_char_buffer=25000,
    )

    extractions = _extract_all(result)
    assert len(extractions) >= 1, 'Expected at least 1 extraction from 8-K filing'

    for ext in extractions:
        assert ext.extraction_class, 'extraction_class must not be empty'
        assert ext.extraction_text, 'extraction_text must not be empty'
        assert len(ext.extraction_text) > 10, f'extraction_text suspiciously short: {ext.extraction_text!r}'

    grounded = [
        e for e in extractions
        if e.char_interval
        and e.char_interval.start_pos is not None
        and e.char_interval.end_pos is not None
    ]
    assert len(grounded) >= 1, 'Expected at least 1 grounded extraction with char_interval'

    for ext in grounded:
        ci = ext.char_interval
        assert ci is not None
        assert ci.start_pos is not None and ci.start_pos >= 0
        assert ci.end_pos is not None and ci.end_pos > ci.start_pos

    for ext in extractions:
        score = eightk_confidence(ext)
        assert 0.3 <= score <= 0.9, f'Confidence {score} outside expected [0.3, 0.9]'

    attrs_with_event_type = [
        e for e in extractions
        if e.attributes and e.attributes.get('event_type')
    ]
    assert len(attrs_with_event_type) >= 1, 'Expected at least 1 extraction with event_type attribute'


@skip_no_api_key
def test_s4_pipeline_extraction():
    # gemini-2.5-flash for free-tier (prod uses pro which has 5 RPM / 100 RPD)
    time.sleep(60)

    examples = load_s4_examples()
    assert len(examples) >= 1

    s4_filing_text = _load_fixture('masterbrand_amwd_s4_excerpt.txt')
    result = lx.extract(
        s4_filing_text,
        prompt_description=S4_PROMPT,
        examples=examples,
        model_id='gemini-2.5-flash',
        extraction_passes=1,
        max_workers=1,
        max_char_buffer=20000,
    )

    extractions = _extract_all(result)
    assert len(extractions) >= 1, 'Expected at least 1 extraction from S-4 filing'

    for ext in extractions:
        clause_type = ext.extraction_class.upper()
        assert clause_type in VALID_CLAUSE_TYPES or clause_type == 'OTHER', f'Unexpected clause type: {clause_type}'

    for ext in extractions:
        score = s4_confidence(ext)
        assert 0.3 <= score <= 0.9, f'Confidence {score} outside expected [0.3, 0.9]'

    grounded = [
        e for e in extractions
        if e.char_interval
        and e.char_interval.start_pos is not None
        and e.char_interval.end_pos is not None
    ]
    assert len(grounded) >= 1, 'Expected at least 1 grounded extraction with char_interval'

    types_found = {e.extraction_class.upper() for e in extractions}
    termination_types = types_found & {'TERMINATION_FEE', 'REVERSE_TERMINATION_FEE'}
    assert len(termination_types) >= 1, f'Expected TERMINATION_FEE or REVERSE_TERMINATION_FEE in {types_found}'

    attrs_with_amount = [
        e for e in extractions
        if e.attributes and e.attributes.get('amount')
    ]
    assert len(attrs_with_amount) >= 1, 'Expected at least 1 extraction with amount attribute'
