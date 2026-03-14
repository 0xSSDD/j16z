// @ts-nocheck -- OpenAPIHono 0.18.x strict return types are too narrow for Date→string DB serialization
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { adminDb } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import type { ApiKeyEnv } from '../../middleware/api-key-auth.js';

const ClauseSchema = z
  .object({
    id: z.string().uuid(),
    firmId: z.string().uuid(),
    dealId: z.string().uuid(),
    filingId: z.string().uuid(),
    type: z.string(),
    title: z.string(),
    summary: z.string(),
    verbatimText: z.string(),
    sourceLocation: z.string(),
    extractedAt: z.string(),
    confidenceScore: z.string().nullable(),
    analystVerified: z.boolean(),
    createdAt: z.string(),
  })
  .openapi('Clause');

const ErrorSchema = z.object({ error: z.string(), status: z.number().optional() }).openapi('Error');

export const clausesV1Routes = new OpenAPIHono<ApiKeyEnv>().openapi(
  createRoute({
    method: 'get',
    path: '/',
    summary: 'List clauses for a deal',
    description:
      'Returns all extracted deal clauses (termination fees, MAE, regulatory efforts, etc.) for the specified deal.',
    tags: ['Clauses'],
    security: [{ ApiKey: [] }],
    request: {
      params: z.object({ dealId: z.string().uuid().openapi({ description: 'Deal UUID' }) }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(ClauseSchema) } },
        description: 'List of clauses',
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

    // Verify deal belongs to firm
    const [deal] = await adminDb
      .select({ id: schema.deals.id })
      .from(schema.deals)
      .where(and(eq(schema.deals.id, dealId), eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
      .limit(1);

    if (!deal) return c.json({ error: 'Deal not found', status: 404 }, 404);

    const rows = await adminDb
      .select()
      .from(schema.clauses)
      .where(and(eq(schema.clauses.dealId, dealId), eq(schema.clauses.firmId, firmId)))
      .orderBy(schema.clauses.createdAt);

    return c.json(rows);
  },
);
