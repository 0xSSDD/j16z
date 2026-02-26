import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /auth/signout
 *
 * Server-side signout with proper cookie clearing.
 * Uses a direct cookie bridge on the redirect response so
 * Set-Cookie headers travel back to the browser.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const redirectResponse = NextResponse.redirect(`${origin}/login`, { status: 302 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            redirectResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.signOut({ scope: 'global' });

  // Expire all Supabase auth cookies
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      redirectResponse.cookies.set(cookie.name, '', { path: '/', expires: new Date(0), maxAge: 0 });
    }
  }

  return redirectResponse;
}
