"use client";

import React from "react";
import {
  CheckCircle2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Settings2,
  XCircle,
} from "lucide-react";
import { DATA_SOURCES } from "@/lib/constants";

export const FeedManager: React.FC = () => {
  return (
    <div className="space-y-6 font-mono">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="flex items-center gap-3 font-narrative text-xl font-bold uppercase tracking-tight text-text-main">
            <Radio className="h-5 w-5 text-primary-500" />
            Live Monitor
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-text-muted">
            Data Feed Management
          </p>
        </div>
        <button className="flex items-center gap-2 border border-border bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted transition-all hover:border-primary-500/50 hover:text-primary-500">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-surface p-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs text-text-main">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-bold uppercase">API (4)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-main">
              <span className="h-2 w-2 rounded-full bg-primary-500" />
              <span className="font-bold uppercase">RSS (12)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter sources..."
              className="border border-border bg-surfaceHighlight px-3 py-1.5 text-xs text-text-main outline-none focus:border-primary-500/50"
            />
          </div>
        </div>

        <table className="w-full text-left text-xs text-text-muted">
          <thead className="bg-surfaceHighlight text-[10px] font-bold uppercase tracking-widest text-text-dim">
            <tr>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Update</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {DATA_SOURCES.map((source) => (
              <tr
                key={source.id}
                className="group transition-colors hover:bg-surfaceHighlight"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="border border-border bg-background p-1.5 text-text-muted">
                      <Settings2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text-main">{source.name}</div>
                      <div className="text-[10px] text-text-dim">
                        {source.id}-XF
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="border border-border bg-surface px-1.5 py-0.5 text-[10px] font-mono uppercase">
                    {source.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {source.status === "active" ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Active</span>
                    </div>
                  ) : source.status === "pending" ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-primary-500">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sync</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-rose-500">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Error</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-text-dim">
                  {source.lastUpdate}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="p-1.5 text-text-dim hover:bg-surfaceHighlight hover:text-text-main">
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    {source.status === "active" ? (
                      <button className="p-1.5 text-text-dim hover:bg-rose-500/10 hover:text-rose-500">
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button className="p-1.5 text-text-dim hover:bg-emerald-500/10 hover:text-emerald-500">
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
