"use client";

import React, { useState } from "react";
import { AlertTriangle, Zap, Rss, Users, Key } from "lucide-react";
import { AlertRulesTab } from "@/components/settings/alert-rules-tab";
import { IntegrationsTab } from "@/components/settings/integrations-tab";
import { RSSFeedsTab } from "@/components/settings/rss-feeds-tab";
import { TeamTab } from "@/components/settings/team-tab";
import { APIKeysTab } from "@/components/settings/api-keys-tab";

type SettingsTab = "alerts" | "integrations" | "rss" | "team" | "api";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("alerts");

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
