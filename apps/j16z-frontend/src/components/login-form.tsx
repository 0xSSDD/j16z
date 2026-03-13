'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type LoginMode = 'magic-link' | 'password-login' | 'password-signup';

export const LoginForm: React.FC = () => {
  const [mode, setMode] = useState<LoginMode>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const clearFeedback = () => {
    setMessage(null);
    setError(null);
  };

  // Magic link (primary): send OTP email, show confirmation
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setMessage('Check your email for a magic link to sign in.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password login (secondary): sign in, then redirect based on firm status
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }
      // Check firm membership
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;
      if (!jwt) {
        setError('Failed to retrieve session after login.');
        return;
      }
      let hasFirm = false;
      try {
        const res = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (res.ok) {
          const body = await res.json();
          hasFirm = body.firm !== null;
        }
      } catch {
        // If API is unavailable, default to inbox — onboarding will redirect if needed
        hasFirm = true;
      }
      const next = searchParams.get('next') ?? '/app/inbox';
      router.push(hasFirm ? next : '/app/onboarding');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password signup (secondary): create account, show verification prompt
  const handlePasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setMessage('Check your email to confirm your account before signing in.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === 'magic-link') return handleMagicLink(e);
    if (mode === 'password-login') return handlePasswordLogin(e);
    return handlePasswordSignup(e);
  };

  const isPasswordMode = mode === 'password-login' || mode === 'password-signup';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span className="font-sans text-3xl font-bold tracking-tight text-text-main">j16z</span>
          <p className="mt-2 text-sm text-text-muted">Deal intelligence, made faster</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-surface p-8 shadow-2xl">
          <h2 className="mb-6 text-center text-lg font-semibold text-text-main">
            {mode === 'magic-link' && 'Sign in'}
            {mode === 'password-login' && 'Sign in with password'}
            {mode === 'password-signup' && 'Create account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-main placeholder-text-dim outline-none transition-colors focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20"
              />
            </div>

            {/* Password (secondary modes only) */}
            {isPasswordMode && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-main placeholder-text-dim outline-none transition-colors focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20"
                />
              </div>
            )}

            {/* Feedback messages */}
            {message && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
                {error}
              </div>
            )}

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition-all hover:bg-amber-400 disabled:opacity-60"
            >
              {loading
                ? 'Please wait...'
                : mode === 'magic-link'
                  ? 'Sign in with email link'
                  : mode === 'password-login'
                    ? 'Sign in'
                    : 'Create account'}
            </button>
          </form>

          {/* Mode toggles */}
          <div className="mt-6 space-y-3">
            {mode === 'magic-link' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-text-dim">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setMode('password-login');
                  }}
                  className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-border/80 hover:text-text-main"
                >
                  Sign in with password
                </button>
              </>
            )}

            {mode !== 'magic-link' && (
              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  setMode('magic-link');
                }}
                className="w-full text-center text-sm text-text-muted transition-colors hover:text-text-main"
              >
                Use magic link instead
              </button>
            )}

            <div className="border-t border-border pt-3 text-center text-sm text-text-muted">
              {mode === 'password-signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setMode('password-login');
                    }}
                    className="font-medium text-amber-500 hover:text-amber-400"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setMode('password-signup');
                    }}
                    className="font-medium text-amber-500 hover:text-amber-400"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
