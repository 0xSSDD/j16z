"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertTriangle, Zap, Rss, Users, Key } from "lucide-react";

type SettingsTab = "alerts" | "integrations" | "rss" | "team" | "api";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["alerts", "integrations", "rss", "team", "api"].includes(tabParam)) {
      return tabParam as SettingsTab;
    }
    // Load from localStorage if no URL param
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings_active_tab");
      if (stored && ["alerts", "integrations", "rss", "team", "api"].includes(stored)) {
        return stored as SettingsTab;
      }
    }
    return "alerts";
  });

  useEffect(() => {
    // Update URL when tab changes
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    router.replace(`/app/settings?${params.toString()}`, { scroll: false });

    // Persist to localStorage
    localStorage.setItem("settings_active_tab", activeTab);
  }, [activeTab, router, searchParams]);

  const tabs = [
    { id: "alerts" as SettingsTab, label: "Alert Rules", icon: AlertTriangle },
    { id: "integrations" as SettingsTab, label: "Integrations", icon: Zap },
    { id: "rss" as SettingsTab, label: "RSS Feeds", icon: Rss },
    { id: "team" as SettingsTab, label: "Team", icon: Users },
    { id: "api" as SettingsTab, label: "API Keys", icon: Key },
  ];

  return (
    <div className="flex h-full flex-col p-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-text-main">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Configure alerts, integrations, and team settings
        </p>
      </div>

      <div className="mt-6 flex gap-6">
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary-500/10 text-primary-500 border border-primary-500/30"
                      : "text-text-muted hover:bg-surfaceHighlight hover:text-text-main"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 rounded-lg border border-border bg-surface p-6 transition-opacity duration-200">
          <div className="animate-in fade-in duration-200">
            {activeTab === "alerts" && <AlertRulesTab />}
            {activeTab === "integrations" && <IntegrationsTab />}
            {activeTab === "rss" && <RSSFeedsTab />}
            {activeTab === "team" && <TeamTab />}
            {activeTab === "api" && <APIKeysTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertRulesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-main mb-4">Default Alert Rules</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div>
              <p className="text-sm font-medium text-text-main">Materiality Threshold</p>
              <p className="text-xs text-text-muted">Alert on HIGH (score &gt; 70)</p>
            </div>
            <button className="text-sm text-primary-500 hover:underline">Edit</button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div>
              <p className="text-sm font-medium text-text-main">Spread Movement Alert</p>
              <p className="text-xs text-text-muted">Alert on &gt; 2.5% movement</p>
            </div>
            <button className="text-sm text-primary-500 hover:underline">Edit</button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div>
              <p className="text-sm font-medium text-text-main">External Channels</p>
              <p className="text-xs text-text-muted">Slack + Email</p>
            </div>
            <button className="text-sm text-primary-500 hover:underline">Edit</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-text-main">Integrations</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-main">Slack</p>
              <p className="text-xs text-text-muted">Not connected</p>
            </div>
          </div>
          <button className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-main hover:bg-surfaceHighlight">
            Connect
          </button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <span className="text-xl">📧</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-main">Email</p>
              <p className="text-xs text-text-muted">Not configured</p>
            </div>
          </div>
          <button className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-main hover:bg-surfaceHighlight">
            Configure
          </button>
        </div>
      </div>
    </div>
  );
}

function RSSFeedsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-main">RSS Feeds</h2>
        <button className="rounded-lg border border-border bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
          Add Feed
        </button>
      </div>
      <p className="text-sm text-text-muted">No custom RSS feeds configured</p>
    </div>
  );
}

function TeamTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-main">Team Members</h2>
        <button className="rounded-lg border border-border bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
          Invite Member
        </button>
      </div>
      <p className="text-sm text-text-muted">Team management coming soon</p>
    </div>
  );
}

function APIKeysTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-main">API Keys</h2>
        <button className="rounded-lg border border-border bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
          Generate Key
        </button>
      </div>
      <p className="text-sm text-text-muted">No API keys generated</p>
    </div>
  );
}
