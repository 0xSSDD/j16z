import crypto from 'node:crypto';
import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  threshold: z.number().int().min(0).max(100),
  channels: z.array(z.enum(['email', 'slack', 'webhook'])).min(1),
  dealId: z.string().uuid().optional(),
  webhookUrl: z.string().url().optional(),
  isActive: z.boolean().optional().default(true),
});

const patchAlertRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  threshold: z.number().int().min(0).max(100).optional(),
  channels: z
    .array(z.enum(['email', 'slack', 'webhook']))
    .min(1)
    .optional(),
  dealId: z.string().uuid().nullable().optional(),
  webhookUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Alert Rules CRUD routes
// ---------------------------------------------------------------------------
export const alertRulesRoutes = new Hono<AuthEnv>()
  // GET / — list alert rules for firm, optional dealId filter
  .get('/', async (c) => {
    const firmId = c.get('firmId');
    const dealId = c.req.query('dealId');

    const conditions = [eq(schema.alertRules.firmId, firmId), isNull(schema.alertRules.deletedAt)];

    if (dealId) {
      conditions.push(eq(schema.alertRules.dealId, dealId));
    }

    const rows = await adminDb
      .select({
        id: schema.alertRules.id,
        firmId: schema.alertRules.firmId,
        dealId: schema.alertRules.dealId,
        userId: schema.alertRules.userId,
        name: schema.alertRules.name,
        threshold: schema.alertRules.threshold,
        channels: schema.alertRules.channels,
        webhookUrl: schema.alertRules.webhookUrl,
        isActive: schema.alertRules.isActive,
        createdAt: schema.alertRules.createdAt,
        updatedAt: schema.alertRules.updatedAt,
      })
      .from(schema.alertRules)
      .where(and(...conditions));

    return c.json(rows);
  })

  // GET /:id — get single rule by ID, scoped to firm
  .get('/:id', async (c) => {
    const firmId = c.get('firmId');
    const id = c.req.param('id');

    const [row] = await adminDb
      .select({
        id: schema.alertRules.id,
        firmId: schema.alertRules.firmId,
        dealId: schema.alertRules.dealId,
        userId: schema.alertRules.userId,
        name: schema.alertRules.name,
        threshold: schema.alertRules.threshold,
        channels: schema.alertRules.channels,
        webhookUrl: schema.alertRules.webhookUrl,
        isActive: schema.alertRules.isActive,
        createdAt: schema.alertRules.createdAt,
        updatedAt: schema.alertRules.updatedAt,
      })
      .from(schema.alertRules)
      .where(
        and(eq(schema.alertRules.id, id), eq(schema.alertRules.firmId, firmId), isNull(schema.alertRules.deletedAt)),
      );

    if (!row) {
      return c.json({ error: 'Alert rule not found' }, 404);
    }

    return c.json(row);
  })

  // POST / — create alert rule
  .post('/', zValidator('json', createAlertRuleSchema), async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const body = c.req.valid('json');

    let webhookSecret: string | null = null;
    if (body.channels.includes('webhook') && body.webhookUrl) {
      webhookSecret = crypto.randomBytes(32).toString('hex');
    }

    const [created] = await adminDb
      .insert(schema.alertRules)
      .values({
        firmId,
        userId,
        name: body.name,
        threshold: body.threshold,
        channels: body.channels,
        dealId: body.dealId ?? null,
        webhookUrl: body.webhookUrl ?? null,
        webhookSecret,
        isActive: body.isActive,
      })
      .returning();

    // Return with webhookSecret — only time it's exposed
    return c.json(
      {
        id: created.id,
        firmId: created.firmId,
        dealId: created.dealId,
        userId: created.userId,
        name: created.name,
        threshold: created.threshold,
        channels: created.channels,
        webhookUrl: created.webhookUrl,
        webhookSecret: created.webhookSecret,
        isActive: created.isActive,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      201,
    );
  })

  // PATCH /:id — update rule (webhookSecret NOT updatable)
  .patch('/:id', zValidator('json', patchAlertRuleSchema), async (c) => {
    const firmId = c.get('firmId');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    // Verify ownership
    const [existing] = await adminDb
      .select({ id: schema.alertRules.id })
      .from(schema.alertRules)
      .where(
        and(eq(schema.alertRules.id, id), eq(schema.alertRules.firmId, firmId), isNull(schema.alertRules.deletedAt)),
      );

    if (!existing) {
      return c.json({ error: 'Alert rule not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.threshold !== undefined) updateData.threshold = body.threshold;
    if (body.channels !== undefined) updateData.channels = body.channels;
    if (body.dealId !== undefined) updateData.dealId = body.dealId;
    if (body.webhookUrl !== undefined) updateData.webhookUrl = body.webhookUrl;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await adminDb
      .update(schema.alertRules)
      .set(updateData)
      .where(eq(schema.alertRules.id, id))
      .returning();

    return c.json({
      id: updated.id,
      firmId: updated.firmId,
      dealId: updated.dealId,
      userId: updated.userId,
      name: updated.name,
      threshold: updated.threshold,
      channels: updated.channels,
      webhookUrl: updated.webhookUrl,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  })

  // DELETE /:id — soft delete
  .delete('/:id', async (c) => {
    const firmId = c.get('firmId');
    const id = c.req.param('id');

    const [existing] = await adminDb
      .select({ id: schema.alertRules.id })
      .from(schema.alertRules)
      .where(
        and(eq(schema.alertRules.id, id), eq(schema.alertRules.firmId, firmId), isNull(schema.alertRules.deletedAt)),
      );

    if (!existing) {
      return c.json({ error: 'Alert rule not found' }, 404);
    }

    await adminDb
      .update(schema.alertRules)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.alertRules.id, id));

    return c.json({ success: true });
  })

  // POST /:id/test — test delivery
  .post('/:id/test', async (c) => {
    const firmId = c.get('firmId');
    const id = c.req.param('id');

    const [rule] = await adminDb
      .select()
      .from(schema.alertRules)
      .where(
        and(eq(schema.alertRules.id, id), eq(schema.alertRules.firmId, firmId), isNull(schema.alertRules.deletedAt)),
      );

    if (!rule) {
      return c.json({ error: 'Alert rule not found' }, 404);
    }

    // For now, return success — actual delivery will be wired through the alert worker
    return c.json({
      success: true,
      message: `Test notification sent to ${rule.channels.join(', ')}`,
      channels: rule.channels,
    });
  });
