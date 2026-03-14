import { z } from 'zod';

export const FTC_API_BASE = 'https://api.ftc.gov/v0/hsr-early-termination-notices';

export const ftcEarlyTerminationNoticeSchema = z
  .object({
    id: z.string(),
    attributes: z
      .object({
        acquiring_party: z.string(),
        acquired_party: z.string(),
        date_terminated: z.string().nullable().optional(),
        transaction_value: z.union([z.string(), z.number()]).nullable().optional(),
        early_termination_date: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export const ftcEarlyTerminationResponseSchema = z
  .object({
    data: z.array(ftcEarlyTerminationNoticeSchema),
  })
  .passthrough();

export type FtcEarlyTermination = z.infer<typeof ftcEarlyTerminationNoticeSchema>;
