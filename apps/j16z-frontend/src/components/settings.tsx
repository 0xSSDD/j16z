"use client";

import React, { useState } from "react";
import { Check, Clock, Database, Mail, Save, Shield } from "lucide-react";

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative h-5 w-10 rounded-full transition-colors ${
      enabled ? "bg-primary-500" : "bg-surface border border-border"
    }`}
  >
    <div
      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
        enabled ? "translate-x-5" : "translate-x-0.5"
      }`}
    />
  </button>
);

type SectionIconComponent = React.ComponentType<{
  className?: string;
}>;

const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: SectionIconComponent;
  children: React.ReactNode;
}) => (
  <div className="mb-8 border border-border bg-background">
    <div className="flex items-center gap-3 border-b border-border bg-surface p-4">
      <Icon className="h-4 w-4 text-primary-500" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-main">
        {title}
      </h3>
    </div>
    <div className="space-y-6 p-6">{children}</div>
  </div>
);

export const Settings: React.FC = () => {
  const [config, setConfig] = useState({
    alerts: {
      mergers: true,
      litigation: true,
      activist: true,
      filings: false,
    },
    digest: {
      enabled: true,
      time: "07:00",
    },
    sources: {
      edgar: true,
      courtlistener: true,
      polymarket: false,
    },
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-narrative text-2xl font-bold text-text-main">
            System Configuration
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-text-muted">
            Manage Alert Rules & Integration Parameters
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-text-main px-4 py-2 text-xs font-bold uppercase tracking-wide text-background transition-colors hover:bg-text-muted"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Changes Saved" : "Save Config"}
        </button>
      </div>

      <Section title="Monitoring Rules" icon={Shield}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex items-center justify-between border border-border bg-surface/50 p-4">
            <div>
              <div className="text-sm font-bold text-text-main">
                M&A Announcements
              </div>
              <div className="mt-1 text-xs text-text-muted">
                8-K Item 1.01, DEFM14A
              </div>
            </div>
            <Toggle
              enabled={config.alerts.mergers}
              onChange={() =>
                setConfig({
                  ...config,
                  alerts: {
                    ...config.alerts,
                    mergers: !config.alerts.mergers,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between border border-border bg-surface/50 p-4">
            <div>
              <div className="text-sm font-bold text-text-main">Litigation Risks</div>
              <div className="mt-1 text-xs text-text-muted">
                Antitrust & Class Action
              </div>
            </div>
            <Toggle
              enabled={config.alerts.litigation}
              onChange={() =>
                setConfig({
                  ...config,
                  alerts: {
                    ...config.alerts,
                    litigation: !config.alerts.litigation,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between border border-border bg-surface/50 p-4">
            <div>
              <div className="text-sm font-bold text-text-main">Activist Activity</div>
              <div className="mt-1 text-xs text-text-muted">SC 13D, 13G &gt; 5%</div>
            </div>
            <Toggle
              enabled={config.alerts.activist}
              onChange={() =>
                setConfig({
                  ...config,
                  alerts: {
                    ...config.alerts,
                    activist: !config.alerts.activist,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between border border-border bg-surface/50 p-4">
            <div>
              <div className="text-sm font-bold text-text-main">All Filings (Raw)</div>
              <div className="mt-1 text-xs text-text-muted">
                Unfiltered stream (High Noise)
              </div>
            </div>
            <Toggle
              enabled={config.alerts.filings}
              onChange={() =>
                setConfig({
                  ...config,
                  alerts: {
                    ...config.alerts,
                    filings: !config.alerts.filings,
                  },
                })
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Intelligence Delivery" icon={Mail}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-text-muted" />
              <div>
                <div className="text-sm font-bold text-text-main">
                  Daily Analyst Digest
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  Consolidated PDF report via email
                </div>
              </div>
            </div>
            <Toggle
              enabled={config.digest.enabled}
              onChange={() =>
                setConfig({
                  ...config,
                  digest: {
                    ...config.digest,
                    enabled: !config.digest.enabled,
                  },
                })
              }
            />
          </div>

          {config.digest.enabled && (
            <div className="ml-8 grid grid-cols-2 gap-4 border-l-2 border-border pl-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-muted">
                  Delivery Time (ET)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <select
                    value={config.digest.time}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        digest: {
                          ...config.digest,
                          time: e.target.value,
                        },
                      })
                    }
                    className="w-full appearance-none border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text-main outline-none focus:border-primary-500"
                  >
                    <option value="06:00">06:00 AM</option>
                    <option value="07:00">07:00 AM</option>
                    <option value="08:00">08:00 AM</option>
                    <option value="09:00">09:00 AM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-muted">
                  Recipient
                </label>
                <input
                  type="email"
                  value="analyst@firm.com"
                  disabled
                  className="w-full cursor-not-allowed border border-border bg-surface px-3 py-2 text-sm text-text-muted"
                />
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Data Connectors" icon={Database}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 transition-colors hover:bg-surface/50">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-text-main">SEC EDGAR API</span>
            </div>
            <span className="text-xs font-mono text-emerald-500">CONNECTED</span>
          </div>
          <div className="flex items-center justify-between p-3 transition-colors hover:bg-surface/50">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-text-main">CourtListener</span>
            </div>
            <span className="text-xs font-mono text-emerald-500">CONNECTED</span>
          </div>
          <div className="flex items-center justify-between p-3 transition-colors hover:bg-surface/50">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
              <span className="text-sm font-bold text-text-main">
                Polymarket WebSocket
              </span>
            </div>
            <span className="text-xs font-mono text-primary-500">SYNCING...</span>
          </div>
        </div>
      </Section>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-8 text-xs text-text-muted">
        <span>J16Z Core v2.1.0</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-primary-500">
            API Documentation
          </a>
          <a href="#" className="hover:text-primary-500">
            System Logs
          </a>
        </div>
      </div>
    </div>
  );
};
