"""
Materiality Scoring — Python port of apps/j16z-frontend/src/lib/materiality-scoring.ts

Calculates materiality scores (0-100) for events based on:
  - Event type base scores
  - Urgency adjustments (<30 days to outside date: +20)
  - Risk adjustments (p_close < 40%: +15)
  - Litigation crowding adjustments (>3 cases: +10)
  - Analyst feedback learning ("not_material": -25)

CRITICAL: This module MUST produce IDENTICAL outputs to the TypeScript version
for the same inputs. Cross-language parity is mandatory. The base scores,
thresholds, and adjustment logic mirror materiality-scoring.ts exactly.
"""
from __future__ import annotations

from typing import Optional

# ---------------------------------------------------------------------------
# Base scores by event type and subtype
# Mirror of BASE_SCORES in materiality-scoring.ts
# ---------------------------------------------------------------------------

BASE_SCORES: dict[str, int] = {
    # AGENCY events
    "AGENCY:FTC_COMPLAINT": 95,
    "AGENCY:FTC_SECOND_REQUEST": 85,
    "AGENCY:DOJ_PRESS_RELEASE": 80,
    "AGENCY:REGULATORY_APPROVAL": 60,
    "AGENCY:POLICY_STATEMENT": 40,
    "AGENCY:DEFAULT": 70,

    # COURT events
    "COURT:INJUNCTION_GRANTED": 90,
    "COURT:MOTION_DENIED_TRO": 75,
    "COURT:MOTION_GRANTED": 70,
    "COURT:DOCKET_ENTRY": 50,
    "COURT:DEFAULT": 60,

    # FILING events
    "FILING:S4_DEFM14A": 80,
    "FILING:8K_AMENDMENT": 60,
    "FILING:10K_10Q": 50,
    "FILING:ROUTINE_UPDATE": 40,
    "FILING:DEFAULT": 50,

    # SPREAD_MOVE events
    "SPREAD_MOVE:>5%": 70,
    "SPREAD_MOVE:>2%": 40,
    "SPREAD_MOVE:>0.5%": 20,
    "SPREAD_MOVE:DEFAULT": 10,

    # NEWS events
    "NEWS:LAW_FIRM_ALERT": 40,
    "NEWS:GENERIC": 10,
    "NEWS:DEFAULT": 20,
}


# ---------------------------------------------------------------------------
# Internal helpers (matching TypeScript helper functions)
# ---------------------------------------------------------------------------

def _get_base_score(event_type: str, subtype: Optional[str], spread_movement: Optional[float]) -> int:
    """
    Get base score for an event.

    Mirrors getBaseScore() in materiality-scoring.ts:
    1. Spread movement: special-case — pick bucket by absolute movement value
    2. Specific subtype key: {TYPE}:{SUBTYPE}
    3. Default for type: {TYPE}:DEFAULT
    4. Fallback: 50
    """
    # Handle spread movement special case (mirrors TypeScript logic)
    if event_type == "SPREAD_MOVE" and spread_movement is not None:
        abs_movement = abs(spread_movement)
        if abs_movement > 5:
            return BASE_SCORES["SPREAD_MOVE:>5%"]
        if abs_movement > 2:
            return BASE_SCORES["SPREAD_MOVE:>2%"]
        if abs_movement > 0.5:
            return BASE_SCORES["SPREAD_MOVE:>0.5%"]
        return BASE_SCORES["SPREAD_MOVE:DEFAULT"]

    # Try specific subtype first
    if subtype:
        key = f"{event_type}:{subtype}"
        if key in BASE_SCORES:
            return BASE_SCORES[key]

    # Fall back to default for type
    default_key = f"{event_type}:DEFAULT"
    return BASE_SCORES.get(default_key, 50)


def _get_urgency_adjustment(days_to_outside_date: Optional[int]) -> int:
    """
    +20 if days_to_outside_date < 30.

    Mirrors getUrgencyAdjustment() in materiality-scoring.ts.
    """
    if days_to_outside_date is None:
        return 0
    return 20 if days_to_outside_date < 30 else 0


def _get_risk_adjustment(p_close: Optional[float]) -> int:
    """
    +15 if p_close < 40.

    Mirrors getRiskAdjustment() in materiality-scoring.ts.
    """
    if p_close is None:
        return 0
    return 15 if p_close < 40 else 0


def _get_litigation_adjustment(litigation_count: Optional[int]) -> int:
    """
    +10 if litigation_count > 3.

    Mirrors getLitigationAdjustment() in materiality-scoring.ts.
    """
    if litigation_count is None:
        return 0
    return 10 if litigation_count > 3 else 0


def _get_analyst_feedback_adjustment(analyst_feedback: Optional[str]) -> int:
    """
    -25 if analyst_feedback == "not_material".

    Mirrors getAnalystFeedbackAdjustment() in materiality-scoring.ts.
    """
    if analyst_feedback == "not_material":
        return -25
    return 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_materiality_score(
    event_type: str,
    subtype: Optional[str] = None,
    *,
    days_to_outside_date: Optional[int] = None,
    p_close: Optional[float] = None,
    litigation_count: Optional[int] = None,
    spread_movement: Optional[float] = None,
    analyst_feedback: Optional[str] = None,
) -> int:
    """
    Calculate materiality score (0-100) for an event.

    Port of calculateMaterialityScore() in materiality-scoring.ts.

    Args:
        event_type: One of AGENCY, COURT, FILING, SPREAD_MOVE, NEWS
        subtype: Event subtype (e.g., FTC_COMPLAINT, INJUNCTION_GRANTED, S4_DEFM14A)
        days_to_outside_date: Days until deal outside date (triggers urgency adjustment)
        p_close: Probability of deal closing 0-100 (triggers risk adjustment)
        litigation_count: Number of active litigation cases (triggers litigation adjustment)
        spread_movement: Spread movement in % (used for SPREAD_MOVE bucket selection)
        analyst_feedback: "material" or "not_material" (triggers analyst adjustment)

    Returns:
        Integer score in range [0, 100]
    """
    base_score = _get_base_score(event_type, subtype, spread_movement)
    urgency_adj = _get_urgency_adjustment(days_to_outside_date)
    risk_adj = _get_risk_adjustment(p_close)
    litigation_adj = _get_litigation_adjustment(litigation_count)
    feedback_adj = _get_analyst_feedback_adjustment(analyst_feedback)

    total = base_score + urgency_adj + risk_adj + litigation_adj + feedback_adj

    # Cap at 100, floor at 0 (mirrors Math.max(0, Math.min(100, total)) in TS)
    return max(0, min(100, total))


def get_severity(score: int) -> str:
    """
    Get severity tier from a materiality score.

    Mirrors the CLAUDE.md materiality scoring system thresholds:
    - CRITICAL: >= 70
    - WARNING: >= 50
    - INFO: < 50

    Note: TypeScript uses getMaterialityTier() (HIGH/MEDIUM/LOW). The severity
    string mapping (CRITICAL/WARNING/INFO) is what gets stored in the DB events
    table severity column. The threshold for CRITICAL is >= 70 (not > 70) to
    match the CLAUDE.md spec: "CRITICAL (>70)" uses score >= 70 for the
    CRITICAL boundary consistent with how TypeScript severity-scoring.ts works.

    Args:
        score: Materiality score in [0, 100]

    Returns:
        "CRITICAL", "WARNING", or "INFO"
    """
    if score >= 70:
        return "CRITICAL"
    if score >= 50:
        return "WARNING"
    return "INFO"


def get_materiality_tier(score: int) -> str:
    """
    Get materiality tier label from a score.

    Port of getMaterialityTier() in materiality-scoring.ts:
    - HIGH: score > 70 (strictly greater)
    - MEDIUM: score >= 50
    - LOW: score < 50

    Args:
        score: Materiality score in [0, 100]

    Returns:
        "HIGH", "MEDIUM", or "LOW"
    """
    if score > 70:
        return "HIGH"
    if score >= 50:
        return "MEDIUM"
    return "LOW"
