'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * OnboardingForm — First-time user firm creation flow.
 *
 * Flow:
 *   1. User enters firm name (min 2 chars)
 *   2. POST /api/auth/onboard with JWT — API creates firm, assigns admin role, seeds deals
 *   3. Force session refresh so the updated JWT picks up the new firm_id
 *   4. Redirect to /app/inbox
 *
 * Design: Single screen, no wizard. Skeleton shimmer during submission (no spinners).
 */
export const OnboardingForm: React.FC = () => {
  const [firmName, setFirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = firmName.trim();
    if (trimmed.length < 2) {
      setError('Firm name must be at least 2 characters.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;

      if (!jwt) {
        setError('Your session has expired. Please sign in again.');
        router.push('/login');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/auth/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ firmName: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error ?? 'Failed to create firm. Please try again.';
        setError(msg);
        return;
      }

      // Force session refresh so the JWT picks up the new firm_id injected
      // by the custom access token hook on next token issue.
      await supabase.auth.refreshSession();

      router.push('/app/inbox');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4">
          {/* Skeleton shimmer — no spinner */}
          <div className="h-8 w-24 animate-pulse rounded-md bg-surface" />
          <div className="h-4 w-48 animate-pulse rounded bg-surface" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-surface" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-surface" />
          <p className="text-center text-xs text-text-dim">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span className="font-sans text-3xl font-bold tracking-tight text-text-main">j16z</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-text-main">Name your firm</h1>
            <p className="mt-1.5 text-sm text-text-muted">
              This creates your workspace and seeds it with active deals to track.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="firmName" className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Firm name
              </label>
              <input
                id="firmName"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="e.g. Apex Capital Management"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-main placeholder-text-dim outline-none transition-colors focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={firmName.trim().length < 2}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition-all hover:bg-amber-400 disabled:opacity-50"
            >
              Get Started
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-text-dim">
            Your workspace will be pre-loaded with active M&amp;A deals to track.
          </p>
        </div>
      </div>
    </div>
  );
};
