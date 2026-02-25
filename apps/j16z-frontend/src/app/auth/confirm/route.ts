import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/confirm
 *
 * Magic link callback route. Supabase sends users here after clicking a magic
 * link email (when the template uses the token_hash format).
 *
 * CRITICAL: The Supabase email template MUST be configured to use token_hash:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *
 * Query params:
 *   - token_hash: the OTP token hash from the email link
 *   - type: 'email' (magic link) or 'signup' (email confirmation)
 *   - next: optional redirect URL after auth (defaults to /app/inbox)
 *
 * Flow:
 *   1. Exchange token_hash for a session via verifyOtp
 *   2. Check if user has a firm (via app_metadata in JWT)
 *   3. Redirect to /app/onboarding (new user) or 'next' (returning user)
 *   4. On error: redirect to /login?error=auth_failed
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'email' | 'signup' | null;
  const next = searchParams.get('next') ?? '/app/inbox';

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error('[auth/confirm] verifyOtp error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Check if the user already has a firm via their JWT app_metadata
  // The custom access token hook injects firm_id into app_metadata after firm creation.
  // On first login (before onboarding), firm_id will be absent.
  const firmId = data.user?.app_metadata?.firm_id as string | undefined;

  if (!firmId) {
    // First-time user — send to onboarding to create their firm
    return NextResponse.redirect(`${origin}/app/onboarding`);
  }

  // Returning user — send to their intended destination
  const redirectUrl = next.startsWith('/') ? `${origin}${next}` : next;
  return NextResponse.redirect(redirectUrl);
}
