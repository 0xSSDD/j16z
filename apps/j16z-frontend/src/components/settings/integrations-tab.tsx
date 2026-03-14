'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  FileText,
  Plus,
  RefreshCw,
  Rss,
  Scale,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getIntegrationHealth, type IntegrationHealth, type PacerCredentialHealth } from '@/lib/api';

interface NotificationChannel {
  id: string;
  type: 'slack' | 'email' | 'webhook';
  name: string;
  status: 'active' | 'pending' | 'error';
}

const SOURCE_ICONS: Record<string, typeof FileText> = {
  'SEC EDGAR': FileText,
  'FTC.gov': Shield,
  'DOJ.gov': Shield,
  CourtListener: Scale,
  'RSS Feeds': Rss,
};

const SOURCE_COLORS: Record<string, string> = {
  'SEC EDGAR': 'text-primary-500 bg-primary-500/10 border-primary-500/20',
  'FTC.gov': 'text-primary-500 bg-primary-500/10 border-primary-500/20',
  'DOJ.gov': 'text-primary-500 bg-primary-500/10 border-primary-500/20',
  CourtListener: 'text-text-muted bg-surface border-border',
  'RSS Feeds': 'text-text-muted bg-surface border-border',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Check }> = {
  healthy: { label: 'Healthy', color: 'text-primary-500', icon: Check },
  degraded: { label: 'Degraded', color: 'text-yellow-400', icon: AlertTriangle },
  unhealthy: { label: 'Down', color: 'text-red-400', icon: AlertCircle },
};

export function IntegrationsTab() {
  const [healthData, setHealthData] = useState<IntegrationHealth[]>([]);
  const [pacerCredential, setPacerCredential] = useState<PacerCredentialHealth | undefined>();
  const [healthLoading, setHealthLoading] = useState(true);
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: '1',
      type: 'slack',
      name: 'Slack Workspace',
      status: 'active',
    },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'slack' | 'email' | 'webhook' | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchHealth() {
      setHealthLoading(true);
      try {
        const { sources, pacerCredential: pacer } = await getIntegrationHealth();
        if (!cancelled) {
          setHealthData(sources);
          setPacerCredential(pacer);
        }
      } catch (error) {
        if (!cancelled) console.error('Failed to load integration health:', error);
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    }
    fetchHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshHealth = async () => {
    setHealthLoading(true);
    try {
      const { sources, pacerCredential: pacer } = await getIntegrationHealth();
      setHealthData(sources);
      setPacerCredential(pacer);
    } catch (error) {
      console.error('Failed to load integration health:', error);
    } finally {
      setHealthLoading(false);
    }
  };

  const getChannelStatusBadge = (status: NotificationChannel['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 text-xs text-primary-500">
            <Check className="h-3 w-3" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-400">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="h-3 w-3" />
            Error
          </span>
        );
    }
  };

  const handleDisconnect = (id: string) => {
    setChannels((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-10">
      {/* Data Source Health */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-main">Data Source Health</h2>
            <p className="text-sm text-text-muted">Live status of ingestion pipelines</p>
          </div>
          <button
            type="button"
            onClick={refreshHealth}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {healthLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg border border-border bg-surface" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {healthData.map((integration) => {
              const SourceIcon = SOURCE_ICONS[integration.source] ?? Activity;
              const colorClass = SOURCE_COLORS[integration.source] ?? 'text-text-muted bg-surface border-border';
              const statusCfg = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG.unhealthy;
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={integration.id}
                  className="relative overflow-hidden rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surfaceHighlight"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${colorClass}`}>
                      <SourceIcon className="h-5 w-5" />
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium ${statusCfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                  </div>

                  <h3 className="font-medium text-sm text-text-main mb-1">{integration.source}</h3>

                  <div className="space-y-1 text-xs text-text-muted">
                    <div className="flex justify-between">
                      <span>Last sync</span>
                      <span className="text-text-main font-mono">
                        {integration.lastSyncAt
                          ? formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })
                          : 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Items ingested</span>
                      <span className="text-text-main font-mono">{integration.itemsIngested.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Poll interval</span>
                      <span className="text-text-main font-mono">{integration.pollIntervalMinutes}m</span>
                    </div>
                  </div>

                  {integration.lastError && (
                    <div className="mt-3 rounded border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
                      <p className="text-xs text-red-400 font-mono">{integration.lastError}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pacerCredential?.isExpiringSoon && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary-500/20 bg-primary-500/5 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-primary-500" />
            <div>
              <p className="text-sm font-medium text-primary-500">PACER Credentials Expiring Soon</p>
              <p className="text-xs text-text-muted mt-1">
                Your PACER password expires in {pacerCredential.daysUntilExpiry} days
                {pacerCredential.expiryDate ? ` (${new Date(pacerCredential.expiryDate).toLocaleDateString()})` : ''}.
                Update at{' '}
                <a
                  href="https://pacer.uscourts.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 underline hover:text-primary-600"
                >
                  pacer.uscourts.gov
                </a>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Notification Channels */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-main">Notification Channels</h2>
            <p className="text-sm text-text-muted">Connect external services to receive alerts</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Add Channel
          </button>
        </div>

        <div className="space-y-3">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surfaceHighlight text-lg">
                  {channel.type === 'slack' ? '💬' : channel.type === 'email' ? '📧' : '🔗'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-main">{channel.name}</p>
                    {getChannelStatusBadge(channel.status)}
                  </div>
                  <p className="text-xs text-text-muted capitalize">{channel.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDisconnect(channel.id)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}

          {channels.length === 0 && (
            <div className="rounded-lg border border-border bg-surface p-8 text-center">
              <p className="text-sm text-text-muted">No notification channels connected</p>
            </div>
          )}
        </div>
      </section>

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-main">Add Notification Channel</h3>

            {!selectedType ? (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedType('slack')}
                    className="group flex items-start gap-4 rounded-lg border-2 border-border bg-background p-4 text-left transition-all hover:border-primary-500/50 hover:bg-primary-500/5"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-2xl transition-colors group-hover:bg-primary-500/20">
                      💬
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-main">Slack</p>
                      <p className="text-xs text-text-muted">Real-time alerts in your team channels</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType('email')}
                    className="group flex items-start gap-4 rounded-lg border-2 border-border bg-background p-4 text-left transition-all hover:border-primary-500/50 hover:bg-primary-500/5"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-2xl transition-colors group-hover:bg-primary-500/20">
                      📧
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-main">Email</p>
                      <p className="text-xs text-text-muted">Receive alerts in your inbox with digests</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType('webhook')}
                    className="group flex items-start gap-4 rounded-lg border-2 border-border bg-background p-4 text-left transition-all hover:border-primary-500/50 hover:bg-primary-500/5"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-2xl transition-colors group-hover:bg-primary-500/20">
                      🔗
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-main">Webhook</p>
                      <p className="text-xs text-text-muted">Custom endpoints for your own systems</p>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="mb-2 text-sm font-medium text-text-main capitalize">Connect {selectedType}</p>
                  <p className="text-xs text-text-muted">
                    {selectedType === 'slack'
                      ? 'Authorize j16z to send alerts to your Slack workspace'
                      : selectedType === 'email'
                        ? 'Enter your email address to receive alert notifications'
                        : 'Configure a webhook URL to receive event payloads'}
                  </p>
                </div>

                {selectedType === 'email' && (
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                )}

                {selectedType === 'webhook' && (
                  <input
                    type="url"
                    placeholder="https://your-domain.com/webhook"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                )}

                <button
                  type="button"
                  className="w-full rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-600"
                >
                  {selectedType === 'slack' ? 'Connect to Slack' : 'Save'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedType(null);
                  }}
                  className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
