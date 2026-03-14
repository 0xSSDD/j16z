'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * createClient — Supabase browser client for use in Client Components.
 *
 * Use this for auth operations in the browser: signIn, signUp, signOut,
 * getSession, onAuthStateChange.
 *
 * Do NOT use this in Server Components or Route Handlers — use server.ts instead.
 */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
