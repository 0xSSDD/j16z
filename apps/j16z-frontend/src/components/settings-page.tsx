"use client";

import * as React from "react";

export function SettingsPage() {
  const [apiKey, setApiKey] = React.useState("");
  const [showApiKey, setShowApiKey] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("j16z-api-key");
    if (stored) setApiKey(stored);
  }, []);

  const generateApiKey = () => {
    const key = `j16z_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(key);
    localStorage.setItem("j16z-api-key", key);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-mono font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 font-mono mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-6">
          <h2 className="text-lg font-mono font-medium text-zinc-100 mb-4">API Access</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-mono text-zinc-400 mb-2">API Key</label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  readOnly
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono text-sm p-2 rounded-md"
                  placeholder="No API key generated"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md font-mono text-sm transition-colors"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
                <button
                  onClick={generateApiKey}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-md font-mono text-sm transition-colors"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-zinc-600 font-mono mt-2">
                Use this key to access the j16z API programmatically
              </p>
            </div>
          </div>
        </div>

        <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-6">
          <h2 className="text-lg font-mono font-medium text-zinc-100 mb-4">Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-mono text-zinc-100">Email Notifications</div>
                <div className="text-xs text-zinc-500 font-mono">Receive alerts via email</div>
              </div>
              <input type="checkbox" className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-mono text-zinc-100">Dark Mode</div>
                <div className="text-xs text-zinc-500 font-mono">Use dark theme</div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
