// @ts-nocheck -- OpenAPIHono 0.18.x strict return types are too narrow for Date→string DB serialization
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { adminDb } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import type { ApiKeyEnv } from '../../middleware/api-key-auth.js';

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------
const DealSchema = z
  .object({
    id: z.string().uuid(),
    firmId: z.string().uuid().nullable(),
    symbol: z.string(),
    acquirer: z.string(),
    target: z.string(),
    dealValue: z.string().nullable(),
    pricePerShare: z.string().nullable(),
    status: z.string(),
    considerationType: z.string(),
    announcedDate: z.string().nullable(),
    expectedCloseDate: z.string().nullable(),
    outsideDate: z.string().nullable(),
    pCloseBase: z.string().nullable(),
    pBreakRegulatory: z.string().nullable(),
    pBreakLitigation: z.string().nullable(),
    grossSpread: z.string().nullable(),
    litigationCount: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Deal');

const ErrorSchema = z
  .object({
    error: z.string(),
    status: z.number().optional(),
  })
  .openapi('Error');

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export const dealsV1Routes = new OpenAPIHono<ApiKeyEnv>()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      summary: 'List deals',
      description: 'Returns all non-deleted deals for the firm associated with your API key.',
      tags: ['Deals'],
      security: [{ ApiKey: [] }],
      request: {
        query: z.object({
          status: z
            .enum(['ANNOUNCED', 'REGULATORY_REVIEW', 'LITIGATION', 'APPROVED', 'TERMINATED', 'CLOSED'])
            .optional()
            .openapi({ description: 'Filter by deal status' }),
        }),
      },
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(DealSchema) } },
          description: 'List of deals',
        },
        401: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Unauthorized',
        },
      },
    }),
    async (c) => {
      const firmId = c.get('firmId');
      const { status } = c.req.valid('query');

      const conditions = [eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)];
      if (status) {
        conditions.push(eq(schema.deals.status, status));
      }

      const rows = await adminDb
        .select()
        .from(schema.deals)
        .where(and(...conditions))
        .orderBy(schema.deals.createdAt);

      return c.json(rows);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      summary: 'Get deal by ID',
      description: 'Returns a single deal. Returns 404 if not found or belongs to a different firm.',
      tags: ['Deals'],
      security: [{ ApiKey: [] }],
      request: {
        params: z.object({ id: z.string().uuid().openapi({ description: 'Deal UUID' }) }),
      },
      responses: {
        200: {
          content: { 'application/json': { schema: DealSchema } },
          description: 'Deal details',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Deal not found',
        },
      },
    }),
    async (c) => {
      const firmId = c.get('firmId');
      const { id } = c.req.valid('param');

      const [row] = await adminDb
        .select()
        .from(schema.deals)
        .where(and(eq(schema.deals.id, id), eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
        .limit(1);

      if (!row) return c.json({ error: 'Deal not found', status: 404 }, 404);
      return c.json(row);
    },
  );
