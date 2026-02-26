import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/confirm
 *
 * Auth callback route. Handles both PKCE flow (code param) and
 * token_hash flow (older Supabase email templates).
 *
 * Query params:
 *   - code: PKCE authorization code (modern Supabase default)
 *   - token_hash + type: OTP token hash flow (legacy email templates)
 *   - next: optional redirect URL after auth (defaults to /app/inbox)
 *   - error: Supabase-provided error (e.g. otp_expired)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'magiclink' | 'email' | 'signup' | null;
  const next = searchParams.get('next') ?? '/app/inbox';
  const errorParam = searchParams.get('error');

  // Supabase redirected with an error (e.g. otp_expired)
  if (errorParam) {
    const desc = searchParams.get('error_description') ?? errorParam;
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(desc)}`);
  }

  const supabase = await createClient();

  // PKCE flow: exchange authorization code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/confirm] code exchange error:', error.message, error.status, JSON.stringify(error));
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }
  // Token hash flow: verify OTP
  else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      console.error('[auth/confirm] verifyOtp error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }
  // Neither code nor token_hash provided
  else {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  // Session is now established — check firm membership
  const { data: { user } } = await supabase.auth.getUser();
  const firmId = user?.app_metadata?.firm_id as string | undefined;

  if (!firmId) {
    return NextResponse.redirect(`${origin}/app/onboarding`);
  }

  const redirectUrl = next.startsWith('/') ? `${origin}${next}` : next;
  return NextResponse.redirect(redirectUrl);
}
