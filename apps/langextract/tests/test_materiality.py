"""
Tests for the Python materiality scoring module.

These tests verify that the Python port of materiality-scoring.ts produces
IDENTICAL results to the TypeScript version for all base scores and adjustments.

Cross-language parity is mandatory — base scores, thresholds, and adjustment
logic must match exactly.
"""
import pytest

from scoring.materiality import (
    BASE_SCORES,
    calculate_materiality_score,
    get_materiality_tier,
    get_severity,
)


# ---------------------------------------------------------------------------
# Base score tests — verify every BASE_SCORES entry matches TypeScript
# ---------------------------------------------------------------------------

class TestBaseScores:
    """Verify all base scores match the TypeScript materiality-scoring.ts values."""

    # AGENCY events
    def test_agency_ftc_complaint(self):
        assert calculate_materiality_score("AGENCY", "FTC_COMPLAINT") == 95

    def test_agency_ftc_second_request(self):
        assert calculate_materiality_score("AGENCY", "FTC_SECOND_REQUEST") == 85

    def test_agency_doj_press_release(self):
        assert calculate_materiality_score("AGENCY", "DOJ_PRESS_RELEASE") == 80

    def test_agency_regulatory_approval(self):
        assert calculate_materiality_score("AGENCY", "REGULATORY_APPROVAL") == 60

    def test_agency_policy_statement(self):
        assert calculate_materiality_score("AGENCY", "POLICY_STATEMENT") == 40

    def test_agency_default_subtype(self):
        """Unknown AGENCY subtype falls back to AGENCY:DEFAULT = 70."""
        assert calculate_materiality_score("AGENCY", "UNKNOWN_SUBTYPE") == 70

    # COURT events
    def test_court_injunction_granted(self):
        assert calculate_materiality_score("COURT", "INJUNCTION_GRANTED") == 90

    def test_court_motion_denied_tro(self):
        assert calculate_materiality_score("COURT", "MOTION_DENIED_TRO") == 75

    def test_court_motion_granted(self):
        assert calculate_materiality_score("COURT", "MOTION_GRANTED") == 70

    def test_court_docket_entry(self):
        assert calculate_materiality_score("COURT", "DOCKET_ENTRY") == 50

    def test_court_default_subtype(self):
        """Unknown COURT subtype falls back to COURT:DEFAULT = 60."""
        assert calculate_materiality_score("COURT", "UNKNOWN_SUBTYPE") == 60

    # FILING events
    def test_filing_s4_defm14a(self):
        assert calculate_materiality_score("FILING", "S4_DEFM14A") == 80

    def test_filing_8k_amendment(self):
        assert calculate_materiality_score("FILING", "8K_AMENDMENT") == 60

    def test_filing_10k_10q(self):
        assert calculate_materiality_score("FILING", "10K_10Q") == 50

    def test_filing_routine_update(self):
        assert calculate_materiality_score("FILING", "ROUTINE_UPDATE") == 40

    def test_filing_default_subtype(self):
        """Unknown FILING subtype falls back to FILING:DEFAULT = 50."""
        assert calculate_materiality_score("FILING", "UNKNOWN_SUBTYPE") == 50

    # SPREAD_MOVE events
    def test_spread_move_large(self):
        """Spread movement >5% → score 70."""
        assert calculate_materiality_score("SPREAD_MOVE", ">5%") == 70

    def test_spread_move_medium(self):
        """Spread movement >2% → score 40."""
        assert calculate_materiality_score("SPREAD_MOVE", ">2%") == 40

    def test_spread_move_small(self):
        """Spread movement >0.5% → score 20."""
        assert calculate_materiality_score("SPREAD_MOVE", ">0.5%") == 20

    def test_spread_move_default(self):
        """Default spread movement → score 10."""
        assert calculate_materiality_score("SPREAD_MOVE", "DEFAULT") == 10

    # NEWS events
    def test_news_law_firm_alert(self):
        assert calculate_materiality_score("NEWS", "LAW_FIRM_ALERT") == 40

    def test_news_generic(self):
        assert calculate_materiality_score("NEWS", "GENERIC") == 10

    def test_news_default_subtype(self):
        """Unknown NEWS subtype falls back to NEWS:DEFAULT = 20."""
        assert calculate_materiality_score("NEWS", "UNKNOWN_SUBTYPE") == 20


# ---------------------------------------------------------------------------
# Adjustment tests
# ---------------------------------------------------------------------------

class TestAdjustments:
    """Verify all four adjustment rules match TypeScript behavior."""

    def test_urgency_adjustment_applied_under_30_days(self):
        """+20 when days_to_outside_date < 30."""
        base = calculate_materiality_score("FILING", "ROUTINE_UPDATE")  # 40
        with_urgency = calculate_materiality_score(
            "FILING", "ROUTINE_UPDATE", days_to_outside_date=15
        )
        assert with_urgency == base + 20

    def test_urgency_adjustment_not_applied_at_30_days(self):
        """No urgency boost when exactly 30 days (must be strictly < 30)."""
        base = calculate_materiality_score("FILING", "ROUTINE_UPDATE")  # 40
        at_30 = calculate_materiality_score(
            "FILING", "ROUTINE_UPDATE", days_to_outside_date=30
        )
        assert at_30 == base

    def test_urgency_adjustment_not_applied_over_30_days(self):
        """No urgency boost when > 30 days."""
        base = calculate_materiality_score("FILING", "ROUTINE_UPDATE")  # 40
        over_30 = calculate_materiality_score(
            "FILING", "ROUTINE_UPDATE", days_to_outside_date=45
        )
        assert over_30 == base

    def test_urgency_not_applied_when_none(self):
        """No urgency boost when days_to_outside_date not provided."""
        base = calculate_materiality_score("FILING", "ROUTINE_UPDATE")  # 40
        no_context = calculate_materiality_score("FILING", "ROUTINE_UPDATE", days_to_outside_date=None)
        assert no_context == base

    def test_risk_adjustment_applied_under_40_pct(self):
        """'+15 when p_close < 40."""
        base = calculate_materiality_score("NEWS", "GENERIC")  # 10
        with_risk = calculate_materiality_score("NEWS", "GENERIC", p_close=25)
        assert with_risk == base + 15

    def test_risk_adjustment_not_applied_at_40_pct(self):
        """No risk boost when exactly 40% p_close."""
        base = calculate_materiality_score("NEWS", "GENERIC")  # 10
        at_40 = calculate_materiality_score("NEWS", "GENERIC", p_close=40)
        assert at_40 == base

    def test_risk_adjustment_not_applied_over_40_pct(self):
        """No risk boost when p_close > 40."""
        base = calculate_materiality_score("NEWS", "GENERIC")  # 10
        over_40 = calculate_materiality_score("NEWS", "GENERIC", p_close=75)
        assert over_40 == base

    def test_risk_not_applied_when_none(self):
        """No risk boost when p_close not provided."""
        base = calculate_materiality_score("NEWS", "GENERIC")  # 10
        no_context = calculate_materiality_score("NEWS", "GENERIC", p_close=None)
        assert no_context == base

    def test_litigation_adjustment_applied_over_3(self):
        """+10 when litigation_count > 3."""
        base = calculate_materiality_score("COURT", "DOCKET_ENTRY")  # 50
        with_litigation = calculate_materiality_score(
            "COURT", "DOCKET_ENTRY", litigation_count=4
        )
        assert with_litigation == base + 10

    def test_litigation_adjustment_not_applied_at_3(self):
        """No litigation boost when exactly 3 (must be strictly > 3)."""
        base = calculate_materiality_score("COURT", "DOCKET_ENTRY")  # 50
        at_3 = calculate_materiality_score("COURT", "DOCKET_ENTRY", litigation_count=3)
        assert at_3 == base

    def test_litigation_adjustment_not_applied_below_3(self):
        """No litigation boost when < 3."""
        base = calculate_materiality_score("COURT", "DOCKET_ENTRY")  # 50
        below_3 = calculate_materiality_score("COURT", "DOCKET_ENTRY", litigation_count=1)
        assert below_3 == base

    def test_litigation_not_applied_when_none(self):
        """No litigation boost when litigation_count not provided."""
        base = calculate_materiality_score("COURT", "DOCKET_ENTRY")  # 50
        no_context = calculate_materiality_score("COURT", "DOCKET_ENTRY", litigation_count=None)
        assert no_context == base

    def test_analyst_feedback_not_material(self):
        """-25 when analyst_feedback == "not_material"."""
        base = calculate_materiality_score("AGENCY", "REGULATORY_APPROVAL")  # 60
        with_feedback = calculate_materiality_score(
            "AGENCY", "REGULATORY_APPROVAL", analyst_feedback="not_material"
        )
        assert with_feedback == base - 25

    def test_analyst_feedback_material_no_adjustment(self):
        """No adjustment when analyst_feedback == "material"."""
        base = calculate_materiality_score("AGENCY", "REGULATORY_APPROVAL")  # 60
        with_material = calculate_materiality_score(
            "AGENCY", "REGULATORY_APPROVAL", analyst_feedback="material"
        )
        assert with_material == base

    def test_analyst_feedback_not_applied_when_none(self):
        """No adjustment when analyst_feedback not provided."""
        base = calculate_materiality_score("AGENCY", "REGULATORY_APPROVAL")  # 60
        no_feedback = calculate_materiality_score(
            "AGENCY", "REGULATORY_APPROVAL", analyst_feedback=None
        )
        assert no_feedback == base


# ---------------------------------------------------------------------------
# Clamping tests
# ---------------------------------------------------------------------------

class TestClamping:
    """Verify score is clamped to 0-100 range."""

    def test_score_clamped_at_100(self):
        """FTC_COMPLAINT (95) + urgency (20) + risk (15) = 130, clamped to 100."""
        score = calculate_materiality_score(
            "AGENCY", "FTC_COMPLAINT",
            days_to_outside_date=10,
            p_close=15,
        )
        assert score == 100

    def test_score_clamped_at_0(self):
        """NEWS:GENERIC (10) - analyst feedback (25) = -15, clamped to 0."""
        score = calculate_materiality_score(
            "NEWS", "GENERIC",
            analyst_feedback="not_material",
        )
        assert score == 0

    def test_score_never_exceeds_100(self):
        """All positive adjustments stacked — never exceeds 100."""
        score = calculate_materiality_score(
            "AGENCY", "FTC_COMPLAINT",
            days_to_outside_date=5,
            p_close=10,
            litigation_count=10,
        )
        assert score <= 100

    def test_score_never_below_0(self):
        """Low base with full negative adjustment — never below 0."""
        score = calculate_materiality_score(
            "NEWS", "GENERIC",
            analyst_feedback="not_material",
        )
        assert score >= 0


# ---------------------------------------------------------------------------
# Combined adjustment tests
# ---------------------------------------------------------------------------

class TestCombinedAdjustments:
    """Verify multiple adjustments stack correctly."""

    def test_urgency_and_risk_combined(self):
        """ROUTINE_UPDATE (40) + urgency (20) + risk (15) = 75."""
        score = calculate_materiality_score(
            "FILING", "ROUTINE_UPDATE",
            days_to_outside_date=10,
            p_close=20,
        )
        assert score == 75

    def test_all_positive_adjustments(self):
        """DOCKET_ENTRY (50) + urgency (20) + risk (15) + litigation (10) = 95."""
        score = calculate_materiality_score(
            "COURT", "DOCKET_ENTRY",
            days_to_outside_date=10,
            p_close=20,
            litigation_count=5,
        )
        assert score == 95

    def test_positive_and_negative_combined(self):
        """REGULATORY_APPROVAL (60) + urgency (20) - analyst_feedback (25) = 55."""
        score = calculate_materiality_score(
            "AGENCY", "REGULATORY_APPROVAL",
            days_to_outside_date=10,
            analyst_feedback="not_material",
        )
        assert score == 55


# ---------------------------------------------------------------------------
# Severity tier tests
# ---------------------------------------------------------------------------

class TestSeverityTier:
    """Verify get_severity() returns correct CRITICAL/WARNING/INFO strings."""

    def test_critical_at_70_boundary(self):
        """Score >= 70 is CRITICAL (using >= threshold per TypeScript logic)."""
        assert get_severity(70) == "CRITICAL"

    def test_critical_above_70(self):
        assert get_severity(95) == "CRITICAL"
        assert get_severity(100) == "CRITICAL"

    def test_warning_at_50_boundary(self):
        """Score >= 50 but < 70 is WARNING."""
        assert get_severity(50) == "WARNING"
        assert get_severity(69) == "WARNING"

    def test_info_below_50(self):
        """Score < 50 is INFO."""
        assert get_severity(49) == "INFO"
        assert get_severity(0) == "INFO"

    def test_severity_matches_plan_examples(self):
        """Verify examples from CLAUDE.md materiality scoring system."""
        assert get_severity(95) == "CRITICAL"  # FTC complaints
        assert get_severity(90) == "CRITICAL"  # injunctions
        assert get_severity(85) == "CRITICAL"  # second requests
        assert get_severity(80) == "CRITICAL"  # S-4 filings
        assert get_severity(60) == "WARNING"   # regulatory approvals
        assert get_severity(50) == "WARNING"   # docket entries
        assert get_severity(40) == "INFO"      # routine filings


# ---------------------------------------------------------------------------
# Materiality tier tests
# ---------------------------------------------------------------------------

class TestMaterialityTier:
    """Verify get_materiality_tier() returns HIGH/MEDIUM/LOW."""

    def test_high_above_70(self):
        """Score > 70 is HIGH (strictly greater than 70)."""
        assert get_materiality_tier(71) == "HIGH"
        assert get_materiality_tier(100) == "HIGH"

    def test_medium_at_50_to_70(self):
        """Score >= 50 and <= 70 is MEDIUM."""
        assert get_materiality_tier(50) == "MEDIUM"
        assert get_materiality_tier(70) == "MEDIUM"

    def test_low_below_50(self):
        """Score < 50 is LOW."""
        assert get_materiality_tier(49) == "LOW"
        assert get_materiality_tier(0) == "LOW"


# ---------------------------------------------------------------------------
# BASE_SCORES dict completeness — verify all TS keys are present
# ---------------------------------------------------------------------------

class TestBaseScoresDict:
    """Verify BASE_SCORES contains all keys from TypeScript version."""

    EXPECTED_KEYS = [
        # AGENCY
        "AGENCY:FTC_COMPLAINT", "AGENCY:FTC_SECOND_REQUEST", "AGENCY:DOJ_PRESS_RELEASE",
        "AGENCY:REGULATORY_APPROVAL", "AGENCY:POLICY_STATEMENT", "AGENCY:DEFAULT",
        # COURT
        "COURT:INJUNCTION_GRANTED", "COURT:MOTION_DENIED_TRO", "COURT:MOTION_GRANTED",
        "COURT:DOCKET_ENTRY", "COURT:DEFAULT",
        # FILING
        "FILING:S4_DEFM14A", "FILING:8K_AMENDMENT", "FILING:10K_10Q",
        "FILING:ROUTINE_UPDATE", "FILING:DEFAULT",
        # SPREAD_MOVE
        "SPREAD_MOVE:>5%", "SPREAD_MOVE:>2%", "SPREAD_MOVE:>0.5%", "SPREAD_MOVE:DEFAULT",
        # NEWS
        "NEWS:LAW_FIRM_ALERT", "NEWS:GENERIC", "NEWS:DEFAULT",
    ]

    def test_all_expected_keys_present(self):
        for key in self.EXPECTED_KEYS:
            assert key in BASE_SCORES, f"Missing BASE_SCORES key: {key}"

    def test_base_score_values_match_typescript(self):
        """Verify exact values match TypeScript BASE_SCORES constant."""
        expected_values = {
            "AGENCY:FTC_COMPLAINT": 95,
            "AGENCY:FTC_SECOND_REQUEST": 85,
            "AGENCY:DOJ_PRESS_RELEASE": 80,
            "AGENCY:REGULATORY_APPROVAL": 60,
            "AGENCY:POLICY_STATEMENT": 40,
            "AGENCY:DEFAULT": 70,
            "COURT:INJUNCTION_GRANTED": 90,
            "COURT:MOTION_DENIED_TRO": 75,
            "COURT:MOTION_GRANTED": 70,
            "COURT:DOCKET_ENTRY": 50,
            "COURT:DEFAULT": 60,
            "FILING:S4_DEFM14A": 80,
            "FILING:8K_AMENDMENT": 60,
            "FILING:10K_10Q": 50,
            "FILING:ROUTINE_UPDATE": 40,
            "FILING:DEFAULT": 50,
            "SPREAD_MOVE:>5%": 70,
            "SPREAD_MOVE:>2%": 40,
            "SPREAD_MOVE:>0.5%": 20,
            "SPREAD_MOVE:DEFAULT": 10,
            "NEWS:LAW_FIRM_ALERT": 40,
            "NEWS:GENERIC": 10,
            "NEWS:DEFAULT": 20,
        }
        for key, expected in expected_values.items():
            assert BASE_SCORES[key] == expected, (
                f"BASE_SCORES['{key}'] = {BASE_SCORES.get(key)}, expected {expected}"
            )
