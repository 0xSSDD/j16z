import { z } from 'zod';

// Tracked M&A filing types (comprehensive coverage per CONTEXT.md)
//
// MAPPING NOTE — SC TO form codes (CONTEXT.md → EDGAR):
// CONTEXT.md locked decision specifies "SC TO / SC TO/A" as user-facing shorthand.
// On EDGAR, "SC TO" is NOT a valid form code — tender offer schedules use:
//   - SC TO-T / SC TO-T/A — Third-party (bidder) tender offer schedules
//   - SC TO-I / SC TO-I/A — Issuer tender offer schedules (company buying back own stock)
// We track BOTH variants for complete M&A coverage. SC TO-T is the primary
// M&A-relevant form (bidder making offer for target). SC TO-I is included for
// completeness but is lower signal (issuer self-tenders).
export const TRACKED_FORM_TYPES = new Set([
  '8-K',
  '8-K/A',
  'S-4',
  'S-4/A',
  'DEFM14A',
  'SC 13D',
  'SC 13D/A',
  'SC 13G',
  'SC 13G/A',
  'SC TO-T',
  'SC TO-T/A', // Third-party tender offers (maps to CONTEXT.md "SC TO")
  'SC TO-I',
  'SC TO-I/A', // Issuer tender offers (included for completeness)
  'PREM14A',
  'SC 14D9',
  'SC 14D9/A',
]);

// High-signal types that auto-create deals (per CONTEXT.md locked decision)
export const HIGH_SIGNAL_TYPES = new Set(['S-4', 'S-4/A', 'DEFM14A', 'PREM14A']);

// Filing metadata extracted from EDGAR APIs (before download)
export interface FilingMetadata {
  accessionNumber: string;
  filingType: string;
  filedDate: string;
  primaryDocument: string;
  filerCik: string;
  filerName?: string;
  origin?: 'cik_scan' | 'efts_broad';
}

// Submissions API response shape (columnar arrays)
export const submissionsRecentSchema = z
  .object({
    accessionNumber: z.array(z.string()),
    filingDate: z.array(z.string()),
    form: z.array(z.string()),
    primaryDocument: z.array(z.string()),
    // Additional fields present but not always needed
  })
  .passthrough();

export const submissionsResponseSchema = z
  .object({
    cik: z.union([z.number(), z.string()]),
    entityType: z.string().optional(),
    name: z.string().optional(),
    filings: z.object({
      recent: submissionsRecentSchema,
    }),
  })
  .passthrough();

export const eftsHitSchema = z
  .object({
    _id: z.string(),
    _source: z
      .object({
        ciks: z.array(z.string()).optional(),
        display_names: z.array(z.string()).optional(),
        root_forms: z.array(z.string()).optional(),
        file_date: z.string(),
        file_num: z.union([z.string(), z.array(z.string())]).optional(),
        period_ending: z.string().nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const eftsResponseSchema = z
  .object({
    hits: z.object({
      hits: z.array(eftsHitSchema),
      total: z.object({ value: z.number(), relation: z.string().optional() }).optional(),
    }),
  })
  .passthrough();

export type EftsHit = z.infer<typeof eftsHitSchema>;
export type EftsResponse = z.infer<typeof eftsResponseSchema>;
