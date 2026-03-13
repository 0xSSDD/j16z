// @ts-nocheck -- OpenAPIHono 0.18.x strict return types are too narrow for Date→string DB serialization
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { adminDb } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import type { ApiKeyEnv } from '../../middleware/api-key-auth.js';

const SpreadSchema = z
  .object({
    id: z.string().uuid(),
    firmId: z.string().uuid(),
    dealId: z.string().uuid(),
    timestamp: z.string(),
    currentPrice: z.string(),
    targetPrice: z.string(),
    acquirerPrice: z.string(),
    grossSpread: z.string(),
    annualizedReturn: z.string(),
    volume: z.number(),
    createdAt: z.string(),
  })
  .openapi('Spread');

const ErrorSchema = z.object({ error: z.string(), status: z.number().optional() }).openapi('Error');

export const spreadsV1Routes = new OpenAPIHono<ApiKeyEnv>().openapi(
  createRoute({
    method: 'get',
    path: '/',
    summary: 'List spread history for a deal',
    description:
      'Returns point-in-time market snapshots (spread/price history) for the specified deal. Ordered newest first.',
    tags: ['Spreads'],
    security: [{ ApiKey: [] }],
    request: {
      params: z.object({ dealId: z.string().uuid().openapi({ description: 'Deal UUID' }) }),
      query: z.object({
        limit: z
          .string()
          .regex(/^\d+$/)
          .transform(Number)
          .pipe(z.number().min(1).max(1000))
          .optional()
          .openapi({ description: 'Maximum number of snapshots to return (default: 100, max: 1000)' }),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(SpreadSchema) } },
        description: 'List of market snapshots',
      },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Deal not found',
      },
    },
  }),
  async (c) => {
    const firmId = c.get('firmId');
    const { dealId } = c.req.valid('param');
    const { limit = 100 } = c.req.valid('query');

    // Verify deal belongs to firm
    const [deal] = await adminDb
      .select({ id: schema.deals.id })
      .from(schema.deals)
      .where(and(eq(schema.deals.id, dealId), eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
      .limit(1);

    if (!deal) return c.json({ error: 'Deal not found', status: 404 }, 404);

    const rows = await adminDb
      .select()
      .from(schema.marketSnapshots)
      .where(and(eq(schema.marketSnapshots.dealId, dealId), eq(schema.marketSnapshots.firmId, firmId)))
      .orderBy(desc(schema.marketSnapshots.timestamp))
      .limit(limit);

    return c.json(rows);
  },
);
