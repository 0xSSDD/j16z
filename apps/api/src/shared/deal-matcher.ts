import { isNull } from 'drizzle-orm';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

const COMPANY_SUFFIXES = new Set([
  'inc',
  'corp',
  'llc',
  'ltd',
  'co',
  'company',
  'group',
  'holdings',
  'international',
  'incorporated',
  'corporation',
  'lp',
  'na',
  'nv',
  'plc',
  'se',
  'sa',
  'ag',
]);

const TOKEN_OVERLAP_BASE = 0.7;
const TOKEN_OVERLAP_RANGE = 0.15;

interface MatchInput {
  exact: string;
  normalized: string;
  tokens: Set<string>;
}

interface MatchCandidate {
  dealId: string;
  firmId: string | null;
  confidence: number;
  matchedField: DealMatchResult['matchedField'];
}

export interface DealMatchResult {
  dealId: string;
  firmIds: string[];
  confidence: number;
  matchedField: 'acquirer' | 'target' | 'symbol';
}

/**
 * Normalizes a company name for fuzzy matching.
 */
export function normalizeCompanyName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const tokens = cleaned.split(' ').filter(Boolean);

  while (tokens.length > 0 && COMPANY_SUFFIXES.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  return tokens.join(' ').trim();
}

/**
 * Tokenizes a company name into normalized word tokens.
 */
export function tokenizeCompanyName(name: string): Set<string> {
  const normalized = normalizeCompanyName(name);

  if (!normalized) {
    return new Set<string>();
  }

  const tokens = normalized.split(' ').filter((token) => token.length >= 2);
  return new Set(tokens);
}

/**
 * Computes Jaccard similarity between two token sets.
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function calculateFieldConfidence(input: MatchInput, candidateName: string, allowFuzzy: boolean): number {
  const exactCandidate = candidateName.trim().toLowerCase();

  if (!exactCandidate) {
    return 0;
  }

  if (input.exact === exactCandidate) {
    return 1;
  }

  if (!allowFuzzy) {
    return 0;
  }

  const normalizedCandidate = normalizeCompanyName(candidateName);
  let bestConfidence = 0;

  if (input.normalized && normalizedCandidate && input.normalized === normalizedCandidate) {
    bestConfidence = 0.9;
  }

  if (
    input.normalized &&
    normalizedCandidate &&
    (input.normalized.includes(normalizedCandidate) || normalizedCandidate.includes(input.normalized))
  ) {
    bestConfidence = Math.max(bestConfidence, 0.65);
  }

  const candidateTokens = tokenizeCompanyName(candidateName);
  if (input.tokens.size >= 2 && candidateTokens.size >= 2) {
    const similarity = jaccardSimilarity(input.tokens, candidateTokens);
    if (similarity >= 0.5) {
      const score = TOKEN_OVERLAP_BASE + TOKEN_OVERLAP_RANGE * similarity;
      bestConfidence = Math.max(bestConfidence, score);
    }
  }

  return bestConfidence;
}

/**
 * Matches an external company name to the best active deal.
 */
export async function matchCompanyToDeal(
  companyName: string,
  options?: { minConfidence?: number },
): Promise<DealMatchResult | null> {
  const minConfidence = options?.minConfidence ?? 0.6;
  const exact = companyName.trim().toLowerCase();

  if (!exact) {
    return null;
  }

  const input: MatchInput = {
    exact,
    normalized: normalizeCompanyName(companyName),
    tokens: tokenizeCompanyName(companyName),
  };

  const deals = await adminDb
    .select({
      id: schema.deals.id,
      firmId: schema.deals.firmId,
      acquirer: schema.deals.acquirer,
      target: schema.deals.target,
      symbol: schema.deals.symbol,
    })
    .from(schema.deals)
    .where(isNull(schema.deals.deletedAt));

  let bestConfidence = 0;
  let bestCandidates: MatchCandidate[] = [];

  for (const deal of deals) {
    const fields: Array<{
      field: DealMatchResult['matchedField'];
      value: string;
      allowFuzzy: boolean;
    }> = [
      { field: 'acquirer', value: deal.acquirer, allowFuzzy: true },
      { field: 'target', value: deal.target, allowFuzzy: true },
      { field: 'symbol', value: deal.symbol, allowFuzzy: false },
    ];

    for (const field of fields) {
      const confidence = calculateFieldConfidence(input, field.value, field.allowFuzzy);

      if (confidence <= 0) {
        continue;
      }

      const candidate: MatchCandidate = {
        dealId: deal.id,
        firmId: deal.firmId,
        confidence,
        matchedField: field.field,
      };

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestCandidates = [candidate];
        continue;
      }

      if (confidence === bestConfidence) {
        bestCandidates.push(candidate);
      }
    }
  }

  if (bestCandidates.length === 0 || bestConfidence < minConfidence) {
    return null;
  }

  const selected = bestCandidates[0];
  const firmIds = [
    ...new Set(
      bestCandidates.map((candidate) => candidate.firmId).filter((firmId): firmId is string => Boolean(firmId)),
    ),
  ];

  return {
    dealId: selected.dealId,
    firmIds,
    confidence: selected.confidence,
    matchedField: selected.matchedField,
  };
}
