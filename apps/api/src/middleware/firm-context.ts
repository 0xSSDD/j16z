import { createMiddleware } from 'hono/factory';
import type { AuthEnv } from './auth.js';

// ---------------------------------------------------------------------------
// firmContextMiddleware — extracts firm_id and user_id from verified JWT
// and injects them into the Hono context for use in route handlers.
//
// IMPORTANT: This middleware runs AFTER authMiddleware (which sets jwtPayload).
// It must NOT be applied to /api/auth/* routes — onboarding and profile
// endpoints are called by users who may not yet have a firm_id in their JWT.
//
// Defense-in-depth: Route handlers should ALSO add WHERE firm_id = ? clauses.
// This provides belt-and-suspenders isolation for financial data, with RLS
// acting as the hard safety net at the database level.
// ---------------------------------------------------------------------------
export const firmContextMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const payload = c.get('jwtPayload');

  // Extract firm_id from app_metadata (set by Custom Access Token Hook)
  const firmId = (payload.app_metadata as Record<string, unknown> | undefined)?.firm_id as string | undefined;
  const userId = payload.sub;

  if (!firmId) {
    return c.json(
      { error: 'No firm associated with this account. Complete onboarding first.' },
      403,
    );
  }

  c.set('firmId', firmId);
  c.set('userId', userId!);

  await next();
});
