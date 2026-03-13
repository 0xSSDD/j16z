import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * createClient — Supabase server client for Server Components and Route Handlers.
 *
 * Reads and writes Supabase session cookies via Next.js `cookies()` API.
 * The setAll handler is wrapped in try-catch because Server Components are
 * read-only — cookie writes are expected to fail there (no-op is correct).
 *
 * Use this for:
 *   - Reading the current user session in Server Components
 *   - Route Handlers that need to validate the session server-side
 *   - The Next.js middleware (see /middleware.ts)
 *
 * Do NOT use this in Client Components — use client.ts instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll is a no-op in Server Component context (read-only cookies).
          // The middleware handles cookie refresh for persistent sessions.
        }
      },
    },
  });
}
