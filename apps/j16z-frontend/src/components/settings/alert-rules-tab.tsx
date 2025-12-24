"use client";

import { useState } from "react";
import { Bell, Plus, X } from "lucide-react";
import { SimpleDropdown } from "@/components/ui/simple-dropdown";

interface AlertThresholds {
  severity: string[];
  minSpread: number;
  daysBeforeOutside: number;
  channels: string[];
}

interface DealOverride {
  id: string;
  dealId: string;
  dealName: string;
  eventTypes: string[];
}

interface EmailDigest {
  enabled: boolean;
  frequency: "daily" | "weekly";
  time: string;
  tiers: string[];
}

interface AlertRulesState {
  thresholds: AlertThresholds;
  dealOverrides: DealOverride[];
  emailDigest: EmailDigest;
}

export function AlertRulesTab() {
  const [rules, setRules] = useState<AlertRulesState>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("alert_rules");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return {
      thresholds: {
        severity: ["CRITICAL"],
        minSpread: 2.0,
        daysBeforeOutside: 30,
        channels: ["email"],
      },
      dealOverrides: [],
      emailDigest: {
        enabled: true,
        frequency: "daily",
        time: "09:00",
        tiers: ["CRITICAL", "WARNING"],
      },
    };
  });

  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const handleSave = () => {
    localStorage.setItem("alert_rules", JSON.stringify(rules));
  };

  const severityOptions = [
    { id: "CRITICAL", name: "🔴 Critical" },
    { id: "WARNING", name: "🟡 Warning" },
    { id: "INFO", name: "🟢 Info" },
  ];

  const channelOptions = [
    { id: "email", name: "Email" },
    { id: "slack", name: "Slack" },
    { id: "webhook", name: "Webhook" },
  ];

  const toggleSeverity = (level: string) => {
    setRules(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        severity: prev.thresholds.severity.includes(level)
          ? prev.thresholds.severity.filter(l => l !== level)
          : [...prev.thresholds.severity, level],
      },
    }));
  };

  const toggleChannel = (channel: string) => {
    setRules(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        channels: prev.thresholds.channels.includes(channel)
          ? prev.thresholds.channels.filter(c => c !== channel)
          : [...prev.thresholds.channels, channel],
      },
    }));
  };

  const toggleDigestTier = (tier: string) => {
    setRules(prev => ({
      ...prev,
      emailDigest: {
        ...prev.emailDigest,
        tiers: prev.emailDigest.tiers.includes(tier)
          ? prev.emailDigest.tiers.filter(t => t !== tier)
          : [...prev.emailDigest.tiers, tier],
      },
    }));
  };

  const removeOverride = (id: string) => {
    setRules(prev => ({
      ...prev,
      dealOverrides: prev.dealOverrides.filter(o => o.id !== id),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Default Thresholds */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-main">Default Alert Thresholds</h2>
          <p className="text-sm text-text-muted">Configure when you receive alerts for all deals</p>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-surface p-6">
          {/* Severity */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Severity Levels
            </label>
            <p className="mb-3 text-xs text-text-muted">
              Receive alerts for events with these severity levels
            </p>
            <SimpleDropdown
              label="Severity"
              items={severityOptions}
              selectedIds={rules.thresholds.severity}
              onToggle={toggleSeverity}
            />
          </div>

          {/* Min Spread */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Minimum Spread
            </label>
            <p className="mb-3 text-xs text-text-muted">
              Only alert when spread is above this threshold
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                value={rules.thresholds.minSpread}
                onChange={(e) => setRules(prev => ({
                  ...prev,
                  thresholds: { ...prev.thresholds, minSpread: parseFloat(e.target.value) || 0 },
                }))}
                className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-sm text-text-muted">%</span>
            </div>
          </div>

          {/* Days Before Outside Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Days Before Outside Date
            </label>
            <p className="mb-3 text-xs text-text-muted">
              Alert when a deal is within this many days of its outside date
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={rules.thresholds.daysBeforeOutside}
                onChange={(e) => setRules(prev => ({
                  ...prev,
                  thresholds: { ...prev.thresholds, daysBeforeOutside: parseInt(e.target.value) || 0 },
                }))}
                className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-sm text-text-muted">days</span>
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Alert Channels
            </label>
            <p className="mb-3 text-xs text-text-muted">
              Where to send alert notifications
            </p>
            <SimpleDropdown
              label="Channels"
              items={channelOptions}
              selectedIds={rules.thresholds.channels}
              onToggle={toggleChannel}
            />
          </div>
        </div>
      </section>

      {/* Per-Deal Overrides */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-main">Per-Deal Overrides</h2>
            <p className="text-sm text-text-muted">Customize alert rules for specific deals</p>
          </div>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Add Override
          </button>
        </div>

        {rules.dealOverrides.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">No deal-specific overrides configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.dealOverrides.map((override) => (
              <div
                key={override.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium text-text-main">{override.dealName}</p>
                  <p className="text-xs text-text-muted">
                    {override.eventTypes.length} event types selected
                  </p>
                </div>
                <button
                  onClick={() => removeOverride(override.id)}
                  className="rounded p-1 text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-main"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Email Digest */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-main">Email Digest</h2>
          <p className="text-sm text-text-muted">Receive a summary of alerts via email</p>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-surface p-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-main">Enable Email Digest</p>
              <p className="text-xs text-text-muted">Receive periodic email summaries</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={rules.emailDigest.enabled}
                onChange={(e) => setRules(prev => ({
                  ...prev,
                  emailDigest: { ...prev.emailDigest, enabled: e.target.checked },
                }))}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-500 peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {rules.emailDigest.enabled && (
            <>
              {/* Frequency */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-main">
                  Frequency
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRules(prev => ({
                      ...prev,
                      emailDigest: { ...prev.emailDigest, frequency: "daily" },
                    }))}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      rules.emailDigest.frequency === "daily"
                        ? "border-primary-500 bg-primary-500/10 text-primary-400"
                        : "border-border bg-surface text-text-main hover:bg-surfaceHighlight"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setRules(prev => ({
                      ...prev,
                      emailDigest: { ...prev.emailDigest, frequency: "weekly" },
                    }))}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      rules.emailDigest.frequency === "weekly"
                        ? "border-primary-500 bg-primary-500/10 text-primary-400"
                        : "border-border bg-surface text-text-main hover:bg-surfaceHighlight"
                    }`}
                  >
                    Weekly
                  </button>
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-main">
                  Delivery Time
                </label>
                <input
                  type="time"
                  value={rules.emailDigest.time}
                  onChange={(e) => setRules(prev => ({
                    ...prev,
                    emailDigest: { ...prev.emailDigest, time: e.target.value },
                  }))}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Tiers */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-main">
                  Include Severity Levels
                </label>
                <p className="mb-3 text-xs text-text-muted">
                  Which severity levels to include in the digest
                </p>
                <SimpleDropdown
                  label="Severity"
                  items={severityOptions}
                  selectedIds={rules.emailDigest.tiers}
                  onToggle={toggleDigestTier}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Override Modal - Placeholder */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-main">Add Deal Override</h3>
            <p className="mb-4 text-sm text-text-muted">
              Override modal implementation coming soon
            </p>
            <button
              onClick={() => setShowOverrideModal(false)}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end border-t border-border pt-6">
        <button
          onClick={handleSave}
          className="rounded-md bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
