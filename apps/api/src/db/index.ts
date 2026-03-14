import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// ---------------------------------------------------------------------------
// User-facing client — respects RLS.
// Uses pooled connection (port 6543) with prepare: false (required for Supabase
// connection pooler in Transaction mode).
// ---------------------------------------------------------------------------
const userSql = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(userSql, { schema });

// ---------------------------------------------------------------------------
// Admin client — bypasses RLS using service role credentials.
// Uses direct connection (port 5432) for full access.
// ONLY use in: webhooks, seed scripts, background jobs, and admin-only routes.
// NEVER use in user-facing request handlers.
// ---------------------------------------------------------------------------
const adminSql = postgres(process.env.SUPABASE_DB_URL_SERVICE_ROLE!, { prepare: false });

export const adminDb = drizzle(adminSql, { schema });
