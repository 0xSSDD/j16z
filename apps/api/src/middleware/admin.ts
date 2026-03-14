import { and, eq, isNull } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { adminDb } from '../db/index.js';
import { firmMembers } from '../db/schema.js';
import type { AuthEnv } from './auth.js';

export const adminMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub!;

  const firmRole = (payload.app_metadata as Record<string, unknown> | undefined)?.firm_role as string | undefined;

  if (firmRole === 'admin') {
    await next();
    return;
  }

  // Fallback: DB lookup when JWT hook isn't enabled
  const [membership] = await adminDb
    .select({ role: firmMembers.role })
    .from(firmMembers)
    .where(and(eq(firmMembers.userId, userId), isNull(firmMembers.deletedAt)))
    .limit(1);

  if (membership?.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
});
