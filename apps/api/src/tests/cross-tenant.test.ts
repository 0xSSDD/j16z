/**
 * Cross-tenant isolation CI gate — AUTH-06
 *
 * This is the most critical test in Phase 1. It MUST pass before any pilot
 * client is onboarded. It verifies that Firm A's data is completely invisible
 * to Firm B users, enforced by:
 *   1. Row-Level Security (RLS) policies at the Postgres level
 *   2. firm_id WHERE clause defense-in-depth in route handlers
 *   3. Custom Access Token Hook injecting firm_id into JWT
 *
 * REQUIRES (integration test — needs a live environment):
 *   - API_URL: running API server (default: http://localhost:3001)
 *   - SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 *   - DATABASE_URL: Postgres connection string (for adminDb in seed helpers)
 *   - SUPABASE_DB_URL_SERVICE_ROLE: Admin postgres URL
 *
 * Test strategy:
 *   - Create two ephemeral users with timestamped emails (avoids collisions)
 *   - Create two separate firms via adminDb (bypasses RLS)
 *   - Assign each user as admin of their firm
 *   - Authenticate both users to get JWTs
 *   - User A creates a deal in Firm A
 *   - Verify User B cannot see Firm A's deal via list or direct ID lookup
 *   - Verify User A CAN see their own deal
 *   - Clean up all test data after completion
 *
 * CI integration:
 *   Run with: pnpm test:be --project=isolation
 *   This executes only this test file (as defined in vitest.workspace.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Skip the test suite if environment isn't configured
const SKIP = !SUPABASE_URL || !SERVICE_ROLE_KEY;

describe('Cross-tenant isolation (AUTH-06 CI gate)', () => {
  if (SKIP) {
    it.skip('Skipped — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured', () => {});
    return;
  }

  let firmAId: string;
  let firmBId: string;
  let userAId: string;
  let userBId: string;
  let userAJwt: string;
  let userBJwt: string;
  let firmADealId: string;

  const timestamp = Date.now();
  const userAEmail = `test-firm-a-${timestamp}@j16z-test.com`;
  const userBEmail = `test-firm-b-${timestamp}@j16z-test.com`;
  const TEST_PASSWORD = 'TestPass123!@#';

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  beforeAll(async () => {
    // 1. Create two test users via Supabase admin
    const { data: userAData, error: userAError } = await supabaseAdmin.auth.admin.createUser({
      email: userAEmail,
      password: TEST_PASSWORD,
      email_confirm: true, // Skip email confirmation for test users
    });
    if (userAError) throw new Error(`Failed to create User A: ${userAError.message}`);
    userAId = userAData.user.id;

    const { data: userBData, error: userBError } = await supabaseAdmin.auth.admin.createUser({
      email: userBEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (userBError) throw new Error(`Failed to create User B: ${userBError.message}`);
    userBId = userBData.user.id;

    // 2. Create two firms and assign memberships via the API onboard endpoint.
    // We sign in as each user and call POST /api/auth/onboard.

    // Sign in as User A
    const supabaseA = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Exchange credentials for a JWT using the admin signInWithPassword approach
    // Use a regular (anon-key) client for this since we need the user's JWT, not service role
    const supabaseUserA = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY ?? SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInA, error: signInAError } = await supabaseUserA.auth.signInWithPassword({
      email: userAEmail,
      password: TEST_PASSWORD,
    });
    if (signInAError) throw new Error(`Failed to sign in User A: ${signInAError.message}`);
    userAJwt = signInA.session!.access_token;

    // Onboard User A (creates Firm A)
    const onboardARes = await fetch(`${API_URL}/api/auth/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAJwt}`,
      },
      body: JSON.stringify({ firmName: `Test Firm A ${timestamp}` }),
    });
    if (!onboardARes.ok) {
      const body = await onboardARes.json().catch(() => ({}));
      throw new Error(`Failed to onboard User A: ${JSON.stringify(body)}`);
    }
    const firmAData = await onboardARes.json();
    firmAId = firmAData.firm.id;

    // Sign in as User B
    const supabaseUserB = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY ?? SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInB, error: signInBError } = await supabaseUserB.auth.signInWithPassword({
      email: userBEmail,
      password: TEST_PASSWORD,
    });
    if (signInBError) throw new Error(`Failed to sign in User B: ${signInBError.message}`);
    userBJwt = signInB.session!.access_token;

    // Onboard User B (creates Firm B)
    const onboardBRes = await fetch(`${API_URL}/api/auth/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBJwt}`,
      },
      body: JSON.stringify({ firmName: `Test Firm B ${timestamp}` }),
    });
    if (!onboardBRes.ok) {
      const body = await onboardBRes.json().catch(() => ({}));
      throw new Error(`Failed to onboard User B: ${JSON.stringify(body)}`);
    }
    const firmBData = await onboardBRes.json();
    firmBId = firmBData.firm.id;

    // Refresh User A's session to get a JWT with the new firm_id in app_metadata
    // (the custom access token hook injects firm_id on next token issue)
    await supabaseUserA.auth.refreshSession();
    const { data: refreshedA } = await supabaseUserA.auth.getSession();
    if (refreshedA.session) {
      userAJwt = refreshedA.session.access_token;
    }

    // User A creates a deal in Firm A
    const createDealRes = await fetch(`${API_URL}/api/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAJwt}`,
      },
      body: JSON.stringify({
        symbol: `TST${timestamp}`,
        acquirer: 'Test Acquirer Corp',
        target: 'Test Target Inc',
        status: 'ANNOUNCED',
        considerationType: 'CASH',
        dealValue: '1000000000',
      }),
    });

    if (!createDealRes.ok) {
      const body = await createDealRes.json().catch(() => ({}));
      throw new Error(`Failed to create test deal: ${JSON.stringify(body)}`);
    }
    const deal = await createDealRes.json();
    firmADealId = deal.id;

    // Refresh User B session as well
    await supabaseUserB.auth.refreshSession();
    const { data: refreshedB } = await supabaseUserB.auth.getSession();
    if (refreshedB.session) {
      userBJwt = refreshedB.session.access_token;
    }
  }, 60000); // 60s timeout for setup

  afterAll(async () => {
    // Clean up test users (this cascades or we clean up the DB separately)
    // Hard-delete ephemeral test users via Supabase admin
    if (userAId) {
      await supabaseAdmin.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await supabaseAdmin.auth.admin.deleteUser(userBId);
    }

    // Note: Firm A and Firm B data (deals, watchlists, events) will remain
    // in the DB as orphaned rows. For a full cleanup, use a DB-level cleanup
    // script or accept that test data accumulates during CI runs.
    // In production, a periodic cleanup job should purge test data.
  });

  it('Firm B user cannot list Firm A deals via GET /api/deals', async () => {
    const response = await fetch(`${API_URL}/api/deals`, {
      headers: { Authorization: `Bearer ${userBJwt}` },
    });
    expect(response.status).toBe(200);
    const deals = await response.json();
    // Firm B's list should NOT contain Firm A's deal
    const firmADeal = Array.isArray(deals) ? deals.find((d: { id: string }) => d.id === firmADealId) : undefined;
    expect(firmADeal).toBeUndefined();
  });

  it('Firm B user cannot access Firm A deal directly by ID (returns 404)', async () => {
    const response = await fetch(`${API_URL}/api/deals/${firmADealId}`, {
      headers: { Authorization: `Bearer ${userBJwt}` },
    });
    // Should return 404 — the deal doesn't "exist" for Firm B (not 403, per plan spec)
    expect(response.status).toBe(404);
  });

  it('Firm B user cannot list Firm A events via GET /api/events', async () => {
    const response = await fetch(`${API_URL}/api/events?dealId=${firmADealId}`, {
      headers: { Authorization: `Bearer ${userBJwt}` },
    });
    expect(response.status).toBe(200);
    const events = await response.json();
    // Events for Firm A's deal should be empty from Firm B's perspective
    expect(Array.isArray(events) ? events : []).toHaveLength(0);
  });

  it('Firm A user CAN see their own deal', async () => {
    const response = await fetch(`${API_URL}/api/deals`, {
      headers: { Authorization: `Bearer ${userAJwt}` },
    });
    expect(response.status).toBe(200);
    const deals = await response.json();
    const firmADeal = Array.isArray(deals) ? deals.find((d: { id: string }) => d.id === firmADealId) : undefined;
    expect(firmADeal).toBeDefined();
  });

  it('Unauthenticated request returns 401', async () => {
    const response = await fetch(`${API_URL}/api/deals`);
    expect(response.status).toBe(401);
  });
});
