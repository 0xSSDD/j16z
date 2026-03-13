'use client';

import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import * as React from 'react';
import { formatDate } from '@/lib/date-utils';
import type { Clause, ClauseType, Deal } from '@/lib/types';

// Clause category groupings — mirrors s4_defm14a.py _group_clauses_by_category()
const CLAUSE_CATEGORIES: Record<string, ClauseType[]> = {
  'Termination Provisions': ['TERMINATION_FEE', 'REVERSE_TERMINATION_FEE', 'TICKING_FEE'],
  Conditions: ['REGULATORY_EFFORTS', 'LITIGATION_CONDITION', 'FINANCING_CONDITION', 'HELL_OR_HIGH_WATER'],
  'Protective Provisions': ['MAE', 'GO_SHOP', 'NO_SHOP', 'MATCHING_RIGHTS', 'SPECIFIC_PERFORMANCE'],
  Other: ['OTHER'],
};

// Group clauses by analyst-facing category
function groupClausesByCategory(clauses: Clause[]): Record<string, Clause[]> {
  const result: Record<string, Clause[]> = {};
  for (const [category, types] of Object.entries(CLAUSE_CATEGORIES)) {
    const matches = clauses.filter((c) => types.includes(c.type));
    if (matches.length > 0) {
      result[category] = matches;
    }
  }
  return result;
}

// Single clause card with collapsible verbatim quote
function ClauseCard({ clause }: { clause: Clause }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Display text: prefer summary, fall back to value (mock compat), then verbatimText first 120 chars
  const displayText = clause.summary ?? clause.value ?? clause.verbatimText?.slice(0, 120);

  // Source attribution: prefer extractedAt + filingId, fall back to legacy fields
  const sourceAttr = clause.extractedAt
    ? `Extracted ${formatDate(clause.extractedAt)}`
    : clause.sourceFilingType
      ? `${clause.sourceFilingType} ${clause.sourceSection ?? ''}`.trim()
      : null;

  // Provenance URL for EDGAR source link
  const sourceHref = clause.sourceUrl ?? '#';

  const isLowConfidence = typeof clause.confidenceScore === 'number' && clause.confidenceScore < 0.5;

  return (
    <div className="p-3 bg-surface rounded-md border border-border">
      {/* Clause header */}
      <div className="flex items-start gap-2 mb-1">
        <span className="text-xs font-mono font-medium text-primary-500 uppercase flex-1">
          {clause.title ?? clause.type.replace(/_/g, ' ')}
        </span>
        {/* Low-confidence warning */}
        {isLowConfidence && (
          <AlertTriangle
            className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5"
            aria-label="Low confidence extraction"
          />
        )}
        {/* Analyst-verified badge */}
        {clause.analystVerified && (
          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" aria-label="Analyst verified" />
        )}
      </div>

      {/* Summary / value */}
      {displayText && <div className="text-sm text-text-main font-mono mb-1">{displayText}</div>}

      {/* Source attribution row */}
      {(sourceAttr || sourceHref !== '#') && (
        <div className="flex items-center gap-2 mt-1">
          {sourceAttr && <span className="text-xs text-text-muted font-mono">{sourceAttr}</span>}
          {sourceHref !== '#' && (
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-mono"
            >
              <ExternalLink className="h-3 w-3" />
              View on EDGAR
            </a>
          )}
        </div>
      )}

      {/* Collapsible verbatim quote (per locked decision: collapsed by default) */}
      {clause.verbatimText && clause.verbatimText !== displayText && (
        <div className="mt-2">
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-main font-mono transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {isExpanded ? 'Hide' : 'Show'} verbatim quote
          </button>
          {isExpanded && (
            <div className="mt-2 p-2 bg-background border border-border rounded text-xs text-text-muted font-mono leading-relaxed whitespace-pre-wrap">
              {clause.verbatimText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TermsTabProps {
  clauses: Clause[];
  deal: Deal;
}

export function TermsTab({ clauses }: TermsTabProps) {
  if (clauses.length === 0) {
    return <p className="text-sm text-text-muted font-mono p-4">No deal terms available.</p>;
  }

  const grouped = groupClausesByCategory(clauses);
  const categoryNames = Object.keys(grouped);

  if (categoryNames.length === 0) {
    // Ungrouped fallback (mock data with legacy shape)
    return (
      <div className="space-y-3 p-4">
        {clauses.map((clause) => (
          <ClauseCard key={clause.id} clause={clause} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {categoryNames.map((category) => (
        <div key={category}>
          <h4 className="text-xs font-mono font-semibold text-text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">
            {category}
          </h4>
          <div className="space-y-3">
            {grouped[category].map((clause) => (
              <ClauseCard key={clause.id} clause={clause} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
