/**
 * Digest preferences CRUD routes.
 *
 * GET  /api/digest-preferences — returns current user's preferences (or defaults)
 * PUT  /api/digest-preferences — upserts preferences for current user
 *
 * Uses adminDb with explicit firmId WHERE (defense-in-depth pattern).
 */
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

const updateDigestPrefsSchema = z.object({
  dailyEnabled: z.boolean(),
  weeklyEnabled: z.boolean(),
  suppressWeekend: z.boolean(),
});

export const digestPreferencesRoutes = new Hono<AuthEnv>()

  // GET / — return current user's digest preferences (or defaults if no row)
  .get('/', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');

    const [pref] = await adminDb
      .select({
        dailyEnabled: schema.digestPreferences.dailyEnabled,
        weeklyEnabled: schema.digestPreferences.weeklyEnabled,
        suppressWeekend: schema.digestPreferences.suppressWeekend,
      })
      .from(schema.digestPreferences)
      .where(and(eq(schema.digestPreferences.firmId, firmId), eq(schema.digestPreferences.userId, userId)));

    // Return defaults if no row exists
    return c.json(
      pref ?? {
        dailyEnabled: true,
        weeklyEnabled: true,
        suppressWeekend: false,
      },
    );
  })

  // PUT / — upsert digest preferences for current user
  .put('/', zValidator('json', updateDigestPrefsSchema), async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const body = c.req.valid('json');

    // Check if row exists
    const [existing] = await adminDb
      .select({ id: schema.digestPreferences.id })
      .from(schema.digestPreferences)
      .where(and(eq(schema.digestPreferences.firmId, firmId), eq(schema.digestPreferences.userId, userId)));

    if (existing) {
      await adminDb
        .update(schema.digestPreferences)
        .set({
          dailyEnabled: body.dailyEnabled,
          weeklyEnabled: body.weeklyEnabled,
          suppressWeekend: body.suppressWeekend,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.digestPreferences.firmId, firmId), eq(schema.digestPreferences.userId, userId)));
    } else {
      await adminDb.insert(schema.digestPreferences).values({
        firmId,
        userId,
        dailyEnabled: body.dailyEnabled,
        weeklyEnabled: body.weeklyEnabled,
        suppressWeekend: body.suppressWeekend,
      });
    }

    return c.json({
      dailyEnabled: body.dailyEnabled,
      weeklyEnabled: body.weeklyEnabled,
      suppressWeekend: body.suppressWeekend,
    });
  });
