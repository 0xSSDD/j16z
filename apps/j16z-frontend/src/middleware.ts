import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Next.js middleware — runs on every request matching the config.matcher pattern.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session on every request (keeps tokens fresh)
 *   2. Redirect unauthenticated users trying to access /app/* to /login
 *   3. Redirect authenticated users visiting /login to /app/inbox
 *
 * The request/response cookie bridge pattern is required by @supabase/ssr
 * to propagate cookie updates back to the browser through the response.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth processing for /auth/* routes — they handle their own auth.
  // CRITICAL: Without this, the middleware refreshes the session on /auth/signout,
  // re-setting cookies that the signout route is trying to delete.
  if (pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // Create a mutable response we can attach refreshed cookies to
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies to both the request (for this middleware's context)
          // and the response (to be sent back to the browser)
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: getUser() (not getSession()) is required in middleware.
  // getSession() is not guaranteed to re-validate the token with the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated access to /app/* → redirect to /login with ?next= for redirect-back
  if (!user && pathname.startsWith('/app')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated users visiting /login → redirect to /app/inbox
  if (user && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/app/inbox';
    redirectUrl.searchParams.delete('next');
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

/**
 * Matcher config — runs middleware on all routes EXCEPT:
 *   - _next/static: Next.js static assets
 *   - _next/image: Next.js image optimization
 *   - favicon.ico and common image file extensions
 *
 * This avoids unnecessary auth checks on every static file request.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
