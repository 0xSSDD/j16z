// @ts-nocheck -- OpenAPIHono 0.18.x strict return types are too narrow for Date→string DB serialization
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { adminDb } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import type { ApiKeyEnv } from '../../middleware/api-key-auth.js';

const EventSchema = z
  .object({
    id: z.string().uuid(),
    firmId: z.string().uuid(),
    dealId: z.string().uuid().nullable(),
    type: z.string(),
    subType: z.string(),
    title: z.string(),
    description: z.string(),
    source: z.string(),
    sourceUrl: z.string(),
    timestamp: z.string(),
    materialityScore: z.number(),
    severity: z.string(),
    createdAt: z.string(),
  })
  .openapi('Event');

const ErrorSchema = z.object({ error: z.string(), status: z.number().optional() }).openapi('Error');

export const eventsV1Routes = new OpenAPIHono<ApiKeyEnv>().openapi(
  createRoute({
    method: 'get',
    path: '/',
    summary: 'List events for a deal',
    description: 'Returns all events for the specified deal, scoped to your firm.',
    tags: ['Events'],
    security: [{ ApiKey: [] }],
    request: {
      params: z.object({ dealId: z.string().uuid().openapi({ description: 'Deal UUID' }) }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(EventSchema) } },
        description: 'List of events',
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
      .from(schema.events)
      .where(and(eq(schema.events.dealId, dealId), eq(schema.events.firmId, firmId)))
      .orderBy(schema.events.timestamp);

    return c.json(rows);
  },
);
