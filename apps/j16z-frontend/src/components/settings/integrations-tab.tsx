"use client";

import { useState } from "react";
import { Plus, X, Check, AlertCircle } from "lucide-react";

interface Integration {
  id: string;
  type: "slack" | "email" | "webhook";
  name: string;
  status: "active" | "pending" | "error";
  config?: any;
}

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "1",
      type: "slack",
      name: "Slack Workspace",
      status: "active",
      config: { workspace: "j16z-team" },
    },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<"slack" | "email" | "webhook" | null>(null);

  const getStatusBadge = (status: Integration["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <Check className="h-3 w-3" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-500">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />
            Error
          </span>
        );
    }
  };

  const getIntegrationIcon = (type: Integration["type"]) => {
    switch (type) {
      case "slack":
        return <span className="text-2xl">💬</span>;
      case "email":
        return <span className="text-2xl">📧</span>;
      case "webhook":
        return <span className="text-2xl">🔗</span>;
    }
  };

  const handleDisconnect = (id: string) => {
    setIntegrations(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Integrations</h2>
          <p className="text-sm text-text-muted">Connect external services to receive alerts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Add Integration
        </button>
      </div>

      {/* Connected Integrations */}
      <div className="space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surfaceHighlight">
                {getIntegrationIcon(integration.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-main">{integration.name}</p>
                  {getStatusBadge(integration.status)}
                </div>
                <p className="text-xs text-text-muted capitalize">{integration.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight">
                Edit
              </button>
              <button
                onClick={() => handleDisconnect(integration.id)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
              >
                Disconnect
              </button>
            </div>
          </div>
        ))}

        {integrations.length === 0 && (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">No integrations connected</p>
          </div>
        )}
      </div>

      {/* Add Integration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-main">Add Integration</h3>

            {!selectedType ? (
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-text-main">Choose Integration Type</h4>
                  <p className="text-xs text-text-muted">Connect j16z to your preferred notification channel</p>
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={() => setSelectedType("slack")}
                    className="group relative flex items-start gap-4 rounded-lg border-2 border-border bg-background p-4 text-left transition-all hover:border-purple-500/50 hover:bg-purple-500/5"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 transition-colors group-hover:bg-purple-500/20">
                      <span className="text-3xl">💬</span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-semibold text-text-main">Slack</p>
                        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">Real-time alerts in your team channels</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded bg-surfaceHighlight px-1.5 py-0.5 text-[10px] text-text-dim">OAuth 2.0</span>
                        <span className="rounded bg-surfaceHighlight px-1.5 py-0.5 text-[10px] text-text-dim">Instant delivery</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedType("email")}
                    className="group relative flex items-start gap-4 rounded-lg border-2 border-border bg-background p-4 text-left transition-all hover:border-blue-500/50 hover:bg-blue-500/5"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
                      <span className="text-3xl">📧</span>
                    </div>
                    <div className="flex-1">
                      <p className="mb-1 font-semibold text-text-main">Email</p>
                      <p className="text-xs text-text-muted">Receive alerts in your inbox with digests</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded bg-surfaceHighlight px-1.5 py-0.5 text-[10px] text-text-dim">Verification required</span>
                        <span className="rounded bg-surfaceHighlight px-1.5 py-0.5 text-[10px] text-text-dim">Digest support</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedType("webhook")}
                    className="group relative flex items-start gap-4 rounded-lg border-2 border-border bg-background p-4 text-left transition-all hover:border-green-500/50 hover:bg-green-500/5"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-500/10 transition-colors group-hover:bg-green-500/20">
                      <span className="text-3xl">🔗</span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-semibold text-text-main">Webhook</p>
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                          ADVANCED
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">Custom endpoints for your own systems</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded bg-surfaceHighlight px-1.5 py-0.5 text-[10px] text-text-dim">Custom payload</span>
                        <span className="rounded bg-surfaceHighlight px-1.5 py-0.5 text-[10px] text-text-dim">Event filtering</span>
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
                >
                  Cancel
                </button>
              </div>
            ) : selectedType === "slack" ? (
              <SlackOAuthFlow onClose={() => { setShowAddModal(false); setSelectedType(null); }} />
            ) : selectedType === "email" ? (
              <EmailIntegrationFlow onClose={() => { setShowAddModal(false); setSelectedType(null); }} />
            ) : (
              <WebhookConfigFlow onClose={() => { setShowAddModal(false); setSelectedType(null); }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SlackOAuthFlow({ onClose }: { onClose: () => void }) {
  const handleSlackAuth = () => {
    // Slack OAuth v2 authorization URL
    // In production, these would come from environment variables
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || "YOUR_CLIENT_ID";
    const scopes = "incoming-webhook,chat:write,commands";
    const redirectUri = `${window.location.origin}/api/slack/oauth/callback`;
    const state = Math.random().toString(36).substring(7); // Random state for CSRF protection

    // Store state in sessionStorage for verification on callback
    sessionStorage.setItem("slack_oauth_state", state);

    // Construct OAuth URL
    const authUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${clientId}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    // Redirect to Slack OAuth page
    window.location.href = authUrl;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="mb-2 text-sm font-medium text-text-main">Connect to Slack</p>
        <p className="text-xs text-text-muted mb-3">
          Authorize j16z to send alerts to your Slack workspace
        </p>
        <div className="space-y-2 text-xs text-text-dim">
          <p>✓ Send notifications to channels</p>
          <p>✓ Post messages as j16z bot</p>
          <p>✓ Use slash commands</p>
        </div>
      </div>

      <button
        onClick={handleSlackAuth}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#4A154B] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#611f69]"
      >
        <svg className="h-5 w-5" viewBox="0 0 54 54" fill="none">
          <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="currentColor"/>
        </svg>
        Add to Slack
      </button>

      <div className="rounded-lg bg-blue-500/10 p-3">
        <p className="text-xs text-blue-400">
          💡 You'll be redirected to Slack to authorize the connection
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
      >
        Cancel
      </button>
    </div>
  );
}

function EmailIntegrationFlow({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSendVerification = () => {
    setVerificationSent(true);
  };

  return (
    <div className="space-y-4">
      {!verificationSent ? (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <button
            onClick={handleSendVerification}
            disabled={!email}
            className="w-full rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            Send Verification Email
          </button>
        </>
      ) : (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm text-green-500">
            ✓ Verification email sent to {email}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Check your inbox and click the verification link
          </p>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
      >
        {verificationSent ? "Done" : "Cancel"}
      </button>
    </div>
  );
}

function WebhookConfigFlow({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  const availableEvents = [
    { id: "AGENCY", name: "Agency Events" },
    { id: "COURT", name: "Court Events" },
    { id: "FILING", name: "Filing Events" },
    { id: "SPREAD_MOVE", name: "Spread Movements" },
  ];

  const toggleEvent = (id: string) => {
    setEventTypes(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleTestPayload = () => {
    alert("Test payload sent to webhook URL");
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-text-main">
          Webhook URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-domain.com/webhook"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-text-main">
          Event Types
        </label>
        <div className="space-y-2">
          {availableEvents.map((event) => (
            <label
              key={event.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background p-2 transition-colors hover:bg-surfaceHighlight"
            >
              <input
                type="checkbox"
                checked={eventTypes.includes(event.id)}
                onChange={() => toggleEvent(event.id)}
                className="h-4 w-4 rounded border-border text-primary-500"
              />
              <span className="text-sm text-text-main">{event.name}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleTestPayload}
        disabled={!url}
        className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight disabled:opacity-50"
      >
        Test Payload
      </button>

      <button
        disabled={!url || eventTypes.length === 0}
        className="w-full rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
      >
        Save Webhook
      </button>

      <button
        onClick={onClose}
        className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
      >
        Cancel
      </button>
    </div>
  );
}
