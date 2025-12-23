"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AlertConfig {
  eventTypes: string[];
  materiality: string;
  email: boolean;
  slack: boolean;
  webhookUrl: string;
}

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
}

export function AlertConfigModal({ isOpen, onClose, dealId }: AlertConfigModalProps) {
  const [config, setConfig] = React.useState<AlertConfig>(() => {
    if (typeof window === "undefined") return {
      eventTypes: [],
      materiality: "all",
      email: false,
      slack: false,
      webhookUrl: "",
    };
    const stored = localStorage.getItem(`alert-config-${dealId}`);
    return stored ? JSON.parse(stored) : {
      eventTypes: [],
      materiality: "all",
      email: false,
      slack: false,
      webhookUrl: "",
    };
  });

  const handleSave = () => {
    localStorage.setItem(`alert-config-${dealId}`, JSON.stringify(config));
    onClose();
  };

  const toggleEventType = (type: string) => {
    setConfig((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(type)
        ? prev.eventTypes.filter((t) => t !== type)
        : [...prev.eventTypes, type],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-foreground">Alert Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-mono font-medium text-muted-foreground mb-3">Event Types</h3>
            <div className="space-y-2">
              {["FILING", "COURT", "AGENCY", "SPREAD_MOVE", "NEWS"].map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.eventTypes.includes(type)}
                    onChange={() => toggleEventType(type)}
                    className="w-4 h-4 rounded border-border bg-secondary text-amber-500"
                  />
                  <span className="text-sm font-mono text-foreground">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-mono font-medium text-muted-foreground mb-3">Materiality Threshold</h3>
            <select
              value={config.materiality}
              onChange={(e) => setConfig({ ...config, materiality: e.target.value })}
              className="w-full bg-secondary border border-border text-foreground font-mono text-sm p-2 rounded-md"
            >
              <option value="all">All Events</option>
              <option value="high">High Only</option>
              <option value="high-medium">High + Medium</option>
            </select>
          </div>

          <div>
            <h3 className="text-sm font-mono font-medium text-muted-foreground mb-3">Notification Channels</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-secondary text-amber-500"
                />
                <span className="text-sm font-mono text-foreground">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.slack}
                  onChange={(e) => setConfig({ ...config, slack: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-secondary text-amber-500"
                />
                <span className="text-sm font-mono text-foreground">Slack</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-mono text-muted-foreground mb-2">Webhook URL (optional)</label>
            <input
              type="url"
              value={config.webhookUrl}
              onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
              placeholder="https://..."
              className="w-full bg-secondary border border-border text-foreground font-mono text-sm p-2 rounded-md"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md font-mono text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 dark:text-zinc-950 rounded-md font-mono text-sm transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
