'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Copy, Loader2, Plus, Send, Trash2, X } from 'lucide-react';
import { SimpleDropdown } from '@/components/ui/simple-dropdown';
import {
  createAlertRule,
  deleteAlertRule,
  getAlertRules,
  testAlertRule,
  updateAlertRule,
} from '@/lib/api';
import type { AlertChannel, AlertRule, CreateAlertRuleInput } from '@/lib/types';

export function AlertRulesTab() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

  // Fetch rules on mount
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAlertRules();
      setRules(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreate = async (input: CreateAlertRuleInput) => {
    try {
      const created = await createAlertRule(input);
      setRules((prev) => [created, ...prev]);
      setShowCreateModal(false);
      // Show webhook secret if present
      if (created.webhookSecret) {
        setNewlyCreatedSecret(created.webhookSecret);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    }
  };

  const handleToggleActive = async (rule: AlertRule) => {
    try {
      const updated = await updateAlertRule(rule.id, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const handleUpdateThreshold = async (rule: AlertRule, threshold: number) => {
    try {
      const updated = await updateAlertRule(rule.id, { threshold });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update threshold');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAlertRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTestingRuleId(id);
      await testAlertRule(id);
      setTestingRuleId(null);
    } catch (err) {
      setTestingRuleId(null);
      setError(err instanceof Error ? err.message : 'Test delivery failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        <span className="ml-2 text-sm text-[var(--text-muted)]">Loading alert rules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-400/70 underline hover:text-red-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Webhook Secret Banner */}
      {newlyCreatedSecret && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-2 text-sm font-medium text-amber-400">
            Webhook Secret (copy now -- it will not be shown again)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-[var(--bg-primary)] px-3 py-1.5 font-mono text-xs text-[var(--text-main)] select-all">
              {newlyCreatedSecret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newlyCreatedSecret);
              }}
              className="rounded p-1.5 text-amber-400 transition-colors hover:bg-amber-500/10"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setNewlyCreatedSecret(null)}
            className="mt-2 text-xs text-amber-400/70 underline hover:text-amber-400"
          >
            I have copied the secret
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-main)]">Alert Rules</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Configure when and how you receive notifications
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-md bg-[var(--aurora-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">No alert rules configured yet</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Create a rule to start receiving notifications
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-lg border bg-[var(--bg-surface)] p-4 transition-colors ${
                rule.isActive ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[var(--text-main)]">{rule.name}</h3>
                    {rule.dealId && (
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                        Per-deal
                      </span>
                    )}
                    {!rule.isActive && (
                      <span className="rounded-full bg-[var(--bg-primary)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>
                      Threshold: <strong className="text-[var(--text-main)]">{rule.threshold}</strong>
                    </span>
                    <span>|</span>
                    <span>
                      Channels:{' '}
                      {rule.channels.map((ch) => (
                        <span
                          key={ch}
                          className="ml-1 inline-flex rounded bg-[var(--bg-primary)] px-1.5 py-0.5 text-[10px]"
                        >
                          {ch}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Threshold slider */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={rule.threshold}
                    onChange={(e) => handleUpdateThreshold(rule, Number(e.target.value))}
                    className="h-1 w-20 cursor-pointer accent-[var(--aurora-primary)]"
                    title={`Threshold: ${rule.threshold}`}
                  />

                  {/* Test button */}
                  <button
                    onClick={() => handleTest(rule.id)}
                    disabled={testingRuleId === rule.id}
                    className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-main)] disabled:opacity-50"
                    title="Send test notification"
                  >
                    {testingRuleId === rule.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>

                  {/* Toggle active */}
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={() => handleToggleActive(rule)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-[var(--border-color)] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--aurora-primary)] peer-checked:after:translate-x-full" />
                  </label>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Rule Modal
// ---------------------------------------------------------------------------

function CreateRuleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: CreateAlertRuleInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(50);
  const [channels, setChannels] = useState<AlertChannel[]>(['email']);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const channelOptions = [
    { id: 'email', name: 'Email' },
    { id: 'slack', name: 'Slack' },
    { id: 'webhook', name: 'Webhook' },
  ];

  const toggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.includes(id as AlertChannel)
        ? prev.filter((c) => c !== id)
        : [...prev, id as AlertChannel],
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || channels.length === 0) return;
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        threshold,
        channels,
        webhookUrl: channels.includes('webhook') && webhookUrl ? webhookUrl : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Create Alert Rule</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-main)]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Critical EDGAR alerts"
              className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--aurora-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--aurora-primary)]"
            />
          </div>

          {/* Threshold */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-main)]">
              Materiality Threshold: {threshold}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-[var(--aurora-primary)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>0 (all events)</span>
              <span>50 (WARNING+)</span>
              <span>70 (CRITICAL)</span>
              <span>100</span>
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-main)]">
              Channels
            </label>
            <SimpleDropdown
              label="Channels"
              items={channelOptions}
              selectedIds={channels}
              onToggle={toggleChannel}
            />
          </div>

          {/* Webhook URL (conditional) */}
          {channels.includes('webhook') && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-main)]">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-app.com/webhook"
                className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--aurora-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--aurora-primary)]"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-main)] transition-colors hover:bg-[var(--bg-primary)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || channels.length === 0 || saving}
            className="flex items-center gap-2 rounded-md bg-[var(--aurora-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Rule
          </button>
        </div>
      </div>
    </div>
  );
}
