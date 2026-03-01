# Materiality scoring module — Python port of apps/j16z-frontend/src/lib/materiality-scoring.ts
# Implemented in Plan 03-03 (EXTRACT-07).

from scoring.materiality import (
    BASE_SCORES,
    calculate_materiality_score,
    get_materiality_tier,
    get_severity,
)

__all__ = [
    "BASE_SCORES",
    "calculate_materiality_score",
    "get_materiality_tier",
    "get_severity",
]
