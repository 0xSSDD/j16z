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
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Radio className="h-6 w-6 text-primary-500" />
            Feed Manager
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage 17 active data streams across News, Litigation, and Regulatory
            sources.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
          <RefreshCw className="h-4 w-4" />
          Refresh Status
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 p-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              API Direct (4)
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              RSS Feeds (12)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter sources..."
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-300 outline-none focus:border-slate-500"
            />
          </div>
        </div>

        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-200">
            <tr>
              <th className="px-6 py-4">Source Identity</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Update</th>
              <th className="px-6 py-4 text-right">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {DATA_SOURCES.map((source) => (
              <tr
                key={source.id}
                className="group transition-colors hover:bg-slate-800/50"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded border border-slate-700 bg-slate-800 p-2 text-slate-300">
                      <Settings2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{source.name}</div>
                      <div className="text-xs text-slate-500">
                        ID: {source.id}-XF
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-mono">
                    {source.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {source.status === "active" ? (
                    <div className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Active</span>
                    </div>
                  ) : source.status === "pending" ? (
                    <div className="flex items-center gap-2 text-amber-500">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="font-medium">Syncing</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-500">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">Error</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-slate-500">
                  {source.lastUpdate}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                      <Settings2 className="h-4 w-4" />
                    </button>
                    {source.status === "active" ? (
                      <button className="rounded p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500">
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : (
                      <button className="rounded p-2 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-500">
                        <Play className="h-4 w-4" />
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
