import { and, eq, isNull } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { adminDb } from '../db/index.js';
import { firmMembers } from '../db/schema.js';
import type { AuthEnv } from './auth.js';

export const firmContextMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub;

  if (!userId) {
    return c.json({ error: 'Invalid token: missing subject' }, 401);
  }

  const [membership] = await adminDb
    .select({ firmId: firmMembers.firmId, role: firmMembers.role })
    .from(firmMembers)
    .where(and(eq(firmMembers.userId, userId), isNull(firmMembers.deletedAt)))
    .limit(1);

  if (!membership) {
    return c.json({ error: 'No firm associated with this account. Complete onboarding first.' }, 403);
  }

  c.set('firmId', membership.firmId);
  c.set('userId', userId);

  await next();
});
