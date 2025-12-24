"use client";

import { useState } from "react";
import { Plus, Copy, RotateCw, Trash2, ExternalLink, Check, Eye, EyeOff } from "lucide-react";

interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  created: string;
  lastUsed: string;
  status: "active" | "rotating" | "revoked";
}

interface GenerateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string) => void;
}

function GenerateKeyModal({ isOpen, onClose, onGenerate }: GenerateKeyModalProps) {
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      onGenerate(name);
      setName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-4 text-lg font-semibold text-text-main">Generate New API Key</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Key Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production Server, CI/CD Pipeline, etc."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder-text-dim focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
            <p className="mt-1 text-xs text-text-muted">
              Choose a descriptive name to identify where this key is used
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Generate Key
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
            <p className="text-sm font-medium text-yellow-500">⚠️ Important</p>
            <p className="mt-1 text-xs text-text-muted">
              This is the only time you'll see this key. Copy it now and store it securely.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Your API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={visible ? "text" : "password"}
                  value={keyValue}
                  readOnly
                  className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 font-mono text-sm text-text-main"
                />
                <button
                  onClick={() => setVisible(!visible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-main"
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
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
            onClick={onClose}
            className="w-full rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            I've Saved My Key
          </button>
        </div>
      </div>
    </div>
  );
}

export function APIKeysTab() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [keys, setKeys] = useState<APIKey[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("api_keys");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return [
      {
        id: "1",
        name: "Production Server",
        keyPrefix: "j16z_prod_abc123",
        created: "2023-10-15",
        lastUsed: "2 hours ago",
        status: "active",
      },
      {
        id: "2",
        name: "Development Environment",
        keyPrefix: "j16z_dev_xyz789",
        created: "2023-11-20",
        lastUsed: "5 minutes ago",
        status: "active",
      },
    ];
  });

  const handleGenerate = (name: string) => {
    const newKey = {
      id: Date.now().toString(),
      name,
      keyPrefix: `j16z_${Date.now().toString(36)}`,
      created: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      status: "active" as const,
    };

    const fullKey = `${newKey.keyPrefix}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    const updated = [...keys, newKey];
    setKeys(updated);
    localStorage.setItem("api_keys", JSON.stringify(updated));

    setGeneratedKey(fullKey);
    setShowGenerateModal(false);
    setShowKeyModal(true);
  };

  const handleCopyId = (keyPrefix: string) => {
    navigator.clipboard.writeText(keyPrefix);
  };

  const handleRotate = (keyId: string) => {
    if (confirm("Rotate this API key? The old key will remain valid for 24 hours.")) {
      const updated = keys.map(k =>
        k.id === keyId ? { ...k, status: "rotating" as const } : k
      );
      setKeys(updated);
      localStorage.setItem("api_keys", JSON.stringify(updated));
    }
  };

  const handleRevoke = (keyId: string) => {
    if (confirm("Revoke this API key? This action is immediate and cannot be undone.")) {
      const updated = keys.map(k =>
        k.id === keyId ? { ...k, status: "revoked" as const } : k
      );
      setKeys(updated);
      localStorage.setItem("api_keys", JSON.stringify(updated));
    }
  };

  const getStatusBadge = (status: APIKey["status"]) => {
    const styles = {
      active: "bg-green-500/10 text-green-500 border-green-500/30",
      rotating: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      revoked: "bg-red-500/10 text-red-500 border-red-500/30",
    };
    const labels = {
      active: "Active",
      rotating: "Rotating (24h grace)",
      revoked: "Revoked",
    };
    return (
      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <GenerateKeyModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
      />

      <ShowKeyModal
        isOpen={showKeyModal}
        keyValue={generatedKey}
        onClose={() => setShowKeyModal(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-main">API Keys</h2>
          <p className="text-sm text-text-muted">
            Manage API keys for programmatic access
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="https://docs.j16z.com/api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
          >
            <ExternalLink className="h-4 w-4" />
            API Documentation
          </a>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Generate New Key
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <section>
        {keys.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <p className="text-sm text-text-muted">No API keys generated yet</p>
            <button
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
                    {getStatusBadge(key.status)}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-text-muted">
                    <span className="font-mono">{key.keyPrefix}...</span>
                    <span>•</span>
                    <span>Created {key.created}</span>
                    <span>•</span>
                    <span>Last used {key.lastUsed}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyId(key.keyPrefix)}
                    className="rounded-md p-2 text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-main"
                    title="Copy key ID"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {key.status === "active" && (
                    <>
                      <button
                        onClick={() => handleRotate(key.id)}
                        className="rounded-md p-2 text-text-muted transition-colors hover:bg-yellow-500/10 hover:text-yellow-500"
                        title="Rotate key (24h grace period)"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="rounded-md p-2 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Revoke key immediately"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Security Info */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-main">
          Security Best Practices
        </h3>
        <ul className="space-y-2 text-xs text-text-muted">
          <li>• Never share your API keys or commit them to version control</li>
          <li>• Rotate keys regularly and immediately if compromised</li>
          <li>• Use different keys for different environments (dev, staging, prod)</li>
          <li>• Monitor key usage in your application logs</li>
          <li>• Revoke unused keys to minimize security risk</li>
        </ul>
      </section>
    </div>
  );
}
