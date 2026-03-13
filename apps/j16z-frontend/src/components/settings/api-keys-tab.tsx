'use client';

import { Check, Copy, ExternalLink, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ApiKeyRecord } from '@/lib/api';
import { createApiKey, deleteApiKey, listApiKeys } from '@/lib/api';

interface GenerateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string) => void;
  isLoading: boolean;
}

function GenerateKeyModal({ isOpen, onClose, onGenerate, isLoading }: GenerateKeyModalProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onGenerate(name.trim());
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-4 text-lg font-semibold text-text-main">Generate New API Key</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="api-key-name" className="mb-2 block text-sm font-medium text-text-main">
              Key Name
            </label>
            <input
              id="api-key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production Server, CI/CD Pipeline, etc."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder-text-dim focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
            <p className="mt-1 text-xs text-text-muted">Choose a descriptive name to identify where this key is used</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {isLoading ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ShowKeyModalProps {
  isOpen: boolean;
  keyValue: string;
  onClose: () => void;
}

function ShowKeyModal({ isOpen, keyValue, onClose }: ShowKeyModalProps) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(keyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-4 text-lg font-semibold text-text-main">API Key Generated</h3>

        <div className="space-y-4">
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-medium text-yellow-500">Important</p>
            <p className="mt-1 text-xs text-text-muted">
              This is the only time you&apos;ll see this key. Copy it now and store it securely.
            </p>
          </div>

          <div>
            <label htmlFor="api-key-value" className="mb-2 block text-sm font-medium text-text-main">
              Your API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="api-key-value"
                  type={visible ? 'text' : 'password'}
                  value={keyValue}
                  readOnly
                  className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 font-mono text-sm text-text-main"
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-main"
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            I&apos;ve Saved My Key
          </button>
        </div>
      </div>
    </div>
  );
}

export function APIKeysTab() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKeys() {
      setIsFetching(true);
      try {
        const data = await listApiKeys();
        setKeys(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API keys');
      } finally {
        setIsFetching(false);
      }
    }
    fetchKeys();
  }, []);

  const handleGenerate = async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createApiKey(name);
      // Add key to list (without the raw key value)
      setKeys((prev) => [
        ...prev,
        { id: result.id, name: result.name, createdAt: result.createdAt, lastUsedAt: result.lastUsedAt },
      ]);
      setGeneratedKey(result.key);
      setShowGenerateModal(false);
      setShowKeyModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Delete this API key? This action is immediate and cannot be undone.')) return;
    setError(null);
    try {
      await deleteApiKey(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatLastUsed = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <GenerateKeyModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        isLoading={isLoading}
      />

      <ShowKeyModal isOpen={showKeyModal} keyValue={generatedKey} onClose={() => setShowKeyModal(false)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-main">API Keys</h2>
          <p className="text-sm text-text-muted">Manage API keys for programmatic access to /v1/* endpoints</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
          >
            <ExternalLink className="h-4 w-4" />
            API Documentation
          </a>
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Generate New Key
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* API Keys List */}
      <section>
        {isFetching ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <p className="text-sm text-text-muted">Loading API keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <p className="text-sm text-text-muted">No API keys generated yet</p>
            <button
              type="button"
              onClick={() => setShowGenerateModal(true)}
              className="mt-4 text-sm font-medium text-primary-500 hover:text-primary-600"
            >
              Generate your first API key
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-text-main">{key.name}</p>
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                      Active
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-text-muted">
                    <span className="font-mono">sk_live_...</span>
                    <span>•</span>
                    <span>Created {formatDate(key.createdAt)}</span>
                    <span>•</span>
                    <span>Last used {formatLastUsed(key.lastUsedAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(key.id)}
                    className="rounded-md p-2 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                    title="Delete key immediately"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Security Info */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-main">Security Best Practices</h3>
        <ul className="space-y-2 text-xs text-text-muted">
          <li>• Never share your API keys or commit them to version control</li>
          <li>• Rotate keys regularly and immediately if compromised</li>
          <li>• Use different keys for different environments (dev, staging, prod)</li>
          <li>• Monitor key usage in your application logs</li>
          <li>• Delete unused keys to minimize security risk</li>
        </ul>
      </section>
    </div>
  );
}
