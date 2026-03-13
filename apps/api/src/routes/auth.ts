import { zValidator } from '@hono/zod-validator';
import { createClient } from '@supabase/supabase-js';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminDb } from '../db/index.js';
import { auditLog, firmMembers, firms, invites } from '../db/schema.js';
import { seedFirm } from '../db/seed.js';
import type { AuthEnv } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Auth routes — protected by authMiddleware, NOT firmContextMiddleware.
// These endpoints are called by users who may not yet have a firm_id in their
// JWT (e.g. first-time users in the onboarding flow).
// ---------------------------------------------------------------------------
export const authRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Returns the current user's identity and firm membership.
// Returns { firm: null } if the user has not completed onboarding yet.
// ---------------------------------------------------------------------------
authRoutes.get('/me', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub!;
  const userEmail = (payload as { email?: string }).email ?? null;

  // Look up firm membership using userId
  const [membership] = await adminDb
    .select({
      firmId: firmMembers.firmId,
      role: firmMembers.role,
    })
    .from(firmMembers)
    .where(and(eq(firmMembers.userId, userId), isNull(firmMembers.deletedAt)))
    .limit(1);

  if (!membership) {
    return c.json({
      user: { id: userId, email: userEmail },
      firm: null,
    });
  }

  // Fetch firm details
  const [firm] = await adminDb
    .select({ id: firms.id, name: firms.name })
    .from(firms)
    .where(eq(firms.id, membership.firmId))
    .limit(1);

  return c.json({
    user: { id: userId, email: userEmail },
    firm: firm
      ? {
          id: firm.id,
          name: firm.name,
          role: membership.role,
        }
      : null,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/onboard
// Creates a new firm, assigns admin role, seeds starter deals.
// Called once per user on first login.
// ---------------------------------------------------------------------------
const onboardSchema = z.object({
  firmName: z
    .string()
    .min(2, 'Firm name must be at least 2 characters')
    .max(100, 'Firm name must be at most 100 characters')
    .trim(),
});

authRoutes.post('/onboard', zValidator('json', onboardSchema), async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub!;
  const { firmName } = c.req.valid('json');

  // Guard: check if user already has a firm (idempotency)
  const [existingMember] = await adminDb
    .select({ firmId: firmMembers.firmId })
    .from(firmMembers)
    .where(and(eq(firmMembers.userId, userId), isNull(firmMembers.deletedAt)))
    .limit(1);

  if (existingMember) {
    return c.json({ error: 'User already belongs to a firm. Onboarding can only be completed once.' }, 409);
  }

  // 1. Create the firm
  const [firm] = await adminDb.insert(firms).values({ name: firmName }).returning();

  if (!firm) {
    return c.json({ error: 'Failed to create firm' }, 500);
  }

  // 2. Assign admin role to the onboarding user
  await adminDb.insert(firmMembers).values({
    firmId: firm.id,
    userId,
    role: 'admin',
  });

  // 3. Seed starter deals + watchlist for this firm
  await seedFirm(firm.id, userId);

  // 4. Audit log: record firm creation
  await adminDb.insert(auditLog).values({
    firmId: firm.id,
    userId,
    entityType: 'firm',
    entityId: firm.id,
    action: 'create',
    changes: { name: firmName },
  });

  return c.json(
    {
      firm: { id: firm.id, name: firm.name },
      message: 'Firm created successfully',
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// POST /api/auth/invite
// Invites a new team member to the caller's firm (admin only).
// ---------------------------------------------------------------------------
const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
});

authRoutes.post('/invite', zValidator('json', inviteSchema), async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub!;
  const { email, role } = c.req.valid('json');

  // Verify caller has admin role in their firm
  const [membership] = await adminDb
    .select({ firmId: firmMembers.firmId, role: firmMembers.role })
    .from(firmMembers)
    .where(and(eq(firmMembers.userId, userId), isNull(firmMembers.deletedAt)))
    .limit(1);

  if (!membership) {
    return c.json({ error: 'No firm associated with your account' }, 403);
  }

  if (membership.role !== 'admin') {
    return c.json({ error: 'Only firm admins can invite team members' }, 403);
  }

  const firmId = membership.firmId;

  // Use Supabase admin client to send invitation email
  const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { firmId, role },
    redirectTo: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/confirm?type=invite`,
  });

  if (inviteError) {
    return c.json({ error: inviteError.message }, 500);
  }

  // Record invite in our invites table
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token = inviteData.user?.id ?? crypto.randomUUID();

  const [invite] = await adminDb
    .insert(invites)
    .values({
      firmId,
      email,
      role,
      token,
      expiresAt,
      createdBy: userId,
    })
    .returning();

  // Audit log
  await adminDb.insert(auditLog).values({
    firmId,
    userId,
    entityType: 'invite',
    entityId: invite?.id ?? crypto.randomUUID(),
    action: 'create',
    changes: { email, role },
  });

  return c.json({ message: `Invitation sent to ${email}`, invite: { email, role, expiresAt } }, 201);
});
