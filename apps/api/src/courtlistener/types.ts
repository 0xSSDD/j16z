import { z } from 'zod';

// ---------------------------------------------------------------------------
// CourtListener API base URL and webhook IP allowlist
// ---------------------------------------------------------------------------
export const COURTLISTENER_API_BASE = 'https://www.courtlistener.com';

/**
 * IP addresses CourtListener uses to send webhook push notifications.
 * Used to validate incoming webhook requests before processing.
 * Source: CourtListener documentation (confirmed 2026-03-13)
 */
export const COURTLISTENER_IPS = new Set(['34.210.230.218', '54.189.59.91']);

// ---------------------------------------------------------------------------
// Zod schemas for CourtListener v4 API responses
// ---------------------------------------------------------------------------

/**
 * A single docket from the CourtListener v4 search API.
 * type=d returns docket-type results.
 */
export const docketSearchResultSchema = z
  .object({
    id: z.number(),
    case_name: z.string(),
    docket_number: z.string().nullable(),
    court: z.string(),
    date_filed: z.string().nullable(),
  })
  .passthrough();

export type DocketSearchResult = z.infer<typeof docketSearchResultSchema>;

/**
 * Paginated response from /api/rest/v4/search/?type=d
 */
export const docketSearchResponseSchema = z
  .object({
    count: z.number(),
    results: z.array(docketSearchResultSchema),
  })
  .passthrough();

export type DocketSearchResponse = z.infer<typeof docketSearchResponseSchema>;

/**
 * A single docket entry (individual filing on the docket).
 */
export const docketEntrySchema = z
  .object({
    id: z.number(),
    description: z.string().nullable(),
    entry_number: z.number().nullable(),
    date_filed: z.string().nullable(),
    recap_documents: z
      .array(
        z
          .object({
            id: z.number(),
            description: z.string().nullable(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export type DocketEntry = z.infer<typeof docketEntrySchema>;

/**
 * CourtListener webhook push payload (v4 docket-alert webhook).
 * CourtListener sends this when a new docket entry matches a subscription.
 */
export const courtListenerWebhookSchema = z
  .object({
    webhook: z
      .object({
        event_type: z.number(),
        version: z.number(),
      })
      .passthrough(),
    payload: z
      .object({
        results: z.array(
          z
            .object({
              docket: z.number(),
              case_name: z.string().optional(),
              docket_entries: z.array(docketEntrySchema).optional(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  })
  .passthrough();

export type CourtListenerWebhook = z.infer<typeof courtListenerWebhookSchema>;

/**
 * Response from POST /api/rest/v4/docket-alerts/ subscription creation.
 */
export const docketAlertSubscriptionSchema = z
  .object({
    id: z.number(),
    docket: z.number(),
    alert_type: z.number(),
  })
  .passthrough();

export type DocketAlertSubscription = z.infer<typeof docketAlertSubscriptionSchema>;
