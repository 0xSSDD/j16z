'use client';

import { Loader2, Mail } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getDigestPreferences, updateDigestPreferences } from '@/lib/api';
import type { DigestPreferences } from '@/lib/types';

type SaveStatus = 'idle' | 'saving' | 'saved';

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled = false }: ToggleRowProps) {
  return (
    <div className={`flex items-start justify-between py-4 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-[var(--text-main)]">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div className="peer h-5 w-9 rounded-full bg-[var(--border-color)] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--aurora-primary)] peer-checked:after:translate-x-full peer-disabled:cursor-not-allowed" />
      </label>
    </div>
  );
}

export function DigestPreferencesTab() {
  const [prefs, setPrefs] = useState<DigestPreferences>({
    dailyEnabled: true,
    weeklyEnabled: true,
    suppressWeekend: false,
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDigestPreferences();
      setPrefs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load digest preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleToggle = async (key: keyof DigestPreferences, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaveStatus('saving');

    try {
      await updateDigestPreferences(updated);
      setSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
      // Revert on error
      setPrefs(prefs);
      setSaveStatus('idle');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        <span className="ml-2 text-sm text-[var(--text-muted)]">Loading digest preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-400/70 underline hover:text-red-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-main)]">Email Digests</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Control when and how often you receive email summaries of deal activity
          </p>
        </div>

        {/* Save status indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && <span className="text-green-400">Saved</span>}
        </div>
      </div>

      {/* Preferences card */}
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div className="px-6">
          <div className="divide-y divide-[var(--border-color)]">
            <ToggleRow
              label="Daily Digest"
              description="Receive a summary of overnight events at 8:00 AM ET — critical and high-priority deals only"
              checked={prefs.dailyEnabled}
              onChange={(value) => handleToggle('dailyEnabled', value)}
            />

            <ToggleRow
              label="Weekly Digest"
              description="Receive a weekly deal summary every Friday at 5:00 PM ET — deal-level status and spread changes"
              checked={prefs.weeklyEnabled}
              onChange={(value) => handleToggle('weeklyEnabled', value)}
            />

            {prefs.dailyEnabled && (
              <ToggleRow
                label="Suppress Weekend Digests"
                description="Skip daily digest emails on Saturday and Sunday — resume on Monday morning"
                checked={prefs.suppressWeekend}
                onChange={(value) => handleToggle('suppressWeekend', value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--aurora-primary)]" />
          <div>
            <p className="text-xs font-medium text-[var(--text-main)]">Digest email delivery</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Digests are sent from <span className="font-mono text-[var(--text-main)]">digests@j16z.com</span>. Empty
              digests (no events overnight) are never sent. Changes take effect from the next scheduled run.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
