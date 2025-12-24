/**
 * Materiality Scoring System
 *
 * Calculates materiality scores (0-100) for events based on:
 * - Event type base scores
 * - Urgency adjustments (<30 days to outside date)
 * - Risk adjustments (p_close < 40%)
 * - Litigation crowding adjustments (>3 cases)
 * - Analyst feedback learning
 */

export enum EventType {
  AGENCY = "AGENCY",
  COURT = "COURT",
  FILING = "FILING",
  SPREAD_MOVE = "SPREAD_MOVE",
  NEWS = "NEWS",
}

export enum MaterialityTier {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

interface EventContext {
  type: EventType;
  subtype?: string; // e.g., "FTC_COMPLAINT", "FTC_SECOND_REQUEST", "INJUNCTION_GRANTED"
  daysToOutsideDate?: number;
  pClose?: number;
  litigationCount?: number;
  spreadMovement?: number; // percentage
  analystFeedback?: "material" | "not_material";
}

// Base scores by event type and subtype
const BASE_SCORES: Record<string, number> = {
  // AGENCY events
  "AGENCY:FTC_COMPLAINT": 95,
  "AGENCY:FTC_SECOND_REQUEST": 85,
  "AGENCY:DOJ_PRESS_RELEASE": 80,
  "AGENCY:REGULATORY_APPROVAL": 60,
  "AGENCY:POLICY_STATEMENT": 40,
  "AGENCY:DEFAULT": 70,

  // COURT events
  "COURT:INJUNCTION_GRANTED": 90,
  "COURT:MOTION_DENIED_TRO": 75,
  "COURT:MOTION_GRANTED": 70,
  "COURT:DOCKET_ENTRY": 50,
  "COURT:DEFAULT": 60,

  // FILING events
  "FILING:S4_DEFM14A": 80,
  "FILING:8K_AMENDMENT": 60,
  "FILING:10K_10Q": 50,
  "FILING:ROUTINE_UPDATE": 40,
  "FILING:DEFAULT": 50,

  // SPREAD_MOVE events (based on percentage movement)
  "SPREAD_MOVE:>5%": 70,
  "SPREAD_MOVE:>2%": 40,
  "SPREAD_MOVE:>0.5%": 20,
  "SPREAD_MOVE:DEFAULT": 10,

  // NEWS events
  "NEWS:LAW_FIRM_ALERT": 40,
  "NEWS:GENERIC": 10,
  "NEWS:DEFAULT": 20,
};

/**
 * Get base score for an event
 */
function getBaseScore(context: EventContext): number {
  const { type, subtype, spreadMovement } = context;

  // Handle spread movement special case
  if (type === EventType.SPREAD_MOVE && spreadMovement !== undefined) {
    const absMovement = Math.abs(spreadMovement);
    if (absMovement > 5) return BASE_SCORES["SPREAD_MOVE:>5%"];
    if (absMovement > 2) return BASE_SCORES["SPREAD_MOVE:>2%"];
    if (absMovement > 0.5) return BASE_SCORES["SPREAD_MOVE:>0.5%"];
    return BASE_SCORES["SPREAD_MOVE:DEFAULT"];
  }

  // Try specific subtype first
  if (subtype) {
    const key = `${type}:${subtype}`;
    if (BASE_SCORES[key] !== undefined) {
      return BASE_SCORES[key];
    }
  }

  // Fall back to default for type
  return BASE_SCORES[`${type}:DEFAULT`] || 50;
}

/**
 * Calculate urgency adjustment
 * +20 points if <30 days to outside date
 */
function getUrgencyAdjustment(daysToOutsideDate?: number): number {
  if (daysToOutsideDate === undefined) return 0;
  return daysToOutsideDate < 30 ? 20 : 0;
}

/**
 * Calculate risk adjustment
 * +15 points if p_close < 40%
 */
function getRiskAdjustment(pClose?: number): number {
  if (pClose === undefined) return 0;
  return pClose < 40 ? 15 : 0;
}

/**
 * Calculate litigation crowding adjustment
 * +10 points if >3 litigation cases
 */
function getLitigationAdjustment(litigationCount?: number): number {
  if (litigationCount === undefined) return 0;
  return litigationCount > 3 ? 10 : 0;
}

/**
 * Calculate analyst feedback adjustment
 * -25 points if analyst marked as "not material"
 */
function getAnalystFeedbackAdjustment(feedback?: "material" | "not_material"): number {
  if (feedback === "not_material") return -25;
  return 0;
}

/**
 * Calculate materiality score (0-100)
 */
export function calculateMaterialityScore(context: EventContext): number {
  const baseScore = getBaseScore(context);
  const urgencyAdj = getUrgencyAdjustment(context.daysToOutsideDate);
  const riskAdj = getRiskAdjustment(context.pClose);
  const litigationAdj = getLitigationAdjustment(context.litigationCount);
  const feedbackAdj = getAnalystFeedbackAdjustment(context.analystFeedback);

  const totalScore = baseScore + urgencyAdj + riskAdj + litigationAdj + feedbackAdj;

  // Cap at 100, floor at 0
  return Math.max(0, Math.min(100, totalScore));
}

/**
 * Get materiality tier based on score
 */
export function getMaterialityTier(score: number): MaterialityTier {
  if (score > 70) return MaterialityTier.HIGH;
  if (score >= 50) return MaterialityTier.MEDIUM;
  return MaterialityTier.LOW;
}

/**
 * Get materiality badge color
 */
export function getMaterialityBadgeColor(tier: MaterialityTier): string {
  switch (tier) {
    case MaterialityTier.HIGH:
      return "🔴";
    case MaterialityTier.MEDIUM:
      return "🟠";
    case MaterialityTier.LOW:
      return "🟡";
  }
}

/**
 * Calculate materiality score with tier
 */
export function calculateMaterialityWithTier(context: EventContext): {
  score: number;
  tier: MaterialityTier;
  badge: string;
} {
  const score = calculateMaterialityScore(context);
  const tier = getMaterialityTier(score);
  const badge = getMaterialityBadgeColor(tier);

  return { score, tier, badge };
}
