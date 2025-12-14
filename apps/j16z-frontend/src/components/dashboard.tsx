"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Eye,
  FileText,
  Plus,
  Scale,
  Trash2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DATA_SOURCES } from "@/lib/constants";

type MetricIconComponent = React.ComponentType<{
  className?: string;
}>;

const MetricCard = ({
  label,
  value,
  trend,
  icon: Icon,
  alertLevel = "normal",
}: {
  label: string;
  value: string;
  trend: string;
  icon: MetricIconComponent;
  alertLevel?: "normal" | "warning" | "critical";
}) => {
  const getColor = () => {
    if (alertLevel === "critical") {
      return "text-rose-500 border-rose-900/50 bg-rose-500/5";
    }
    if (alertLevel === "warning") {
      return "text-primary-500 border-primary-500/50 bg-primary-500/5";
    }
    return "text-text-muted border-border bg-surface";
  };

  return (
    <div
      className={`group relative overflow-hidden border p-6 rounded-none transition-all hover:border-text-muted/50 ${getColor()}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest opacity-70">
            {label}
          </span>
          <h3 className="font-narrative text-3xl font-bold text-text-main">
            {value}
          </h3>
        </div>
        <Icon className="h-5 w-5 opacity-50" />
      </div>
      <div className="flex items-center gap-2 text-xs font-mono">
        <span
          className={`flex items-center ${
            alertLevel === "normal" ? "text-emerald-500" : "text-current"
          }`}
        >
          <ArrowUpRight className="mr-1 h-3 w-3" />
          {trend}
        </span>
      </div>
    </div>
  );
};

const CHART_DATA = [
  { time: "0900", docs: 45 },
  { time: "1000", docs: 120 },
  { time: "1100", docs: 85 },
  { time: "1200", docs: 60 },
  { time: "1300", docs: 150 },
  { time: "1400", docs: 210 },
  { time: "1500", docs: 180 },
];

const WatchlistItem = ({
  ticker,
  name,
  change,
  filings,
}: {
  ticker: string;
  name: string;
  change: number;
  filings: number;
}) => (
  <div className="group flex items-center justify-between border-b border-border p-3 transition-colors hover:bg-surfaceHighlight">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center border border-border bg-background text-xs font-bold text-text-main">
        {ticker}
      </div>
      <div>
        <div className="text-xs font-bold text-text-main">{name}</div>
        <div
          className={`text-[10px] ${
            change >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {change >= 0 ? "+" : ""}
          {change}%
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">
        New Filings
      </div>
      <div className="flex justify-end gap-1">
        {filings > 0 ? (
          <span className="border border-primary-500/30 bg-primary-500/20 px-1.5 py-0.5 text-[10px] font-bold text-primary-500">
            {filings}
          </span>
        ) : (
          <span className="text-[10px] text-text-muted">-</span>
        )}
      </div>
    </div>
    <button className="opacity-0 transition-all group-hover:opacity-100 p-1.5 text-text-muted hover:text-rose-500">
      <Trash2 className="h-3 w-3" />
    </button>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 font-mono">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-narrative text-xl font-bold uppercase tracking-tight text-text-main">
            System Status
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-text-muted">
            Real-time Operations Monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <span className="animate-pulse text-xs text-primary-500">● LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Ingestion Rate"
          value="14.2 MB/s"
          trend="+12%"
          icon={Activity}
        />
        <MetricCard
          label="Items Processed"
          value="2,491"
          trend="+540"
          icon={FileText}
          alertLevel="warning"
        />
        <MetricCard
          label="Pending Review"
          value="5"
          trend="+2"
          icon={Scale}
        />
        <MetricCard
          label="System Health"
          value="98.9%"
          trend="NOMINAL"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="border border-border bg-surface p-6">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted font-sans">
                  Ingestion Volume (Docs/Hr)
                </h3>
                <div className="text-[10px] text-text-muted font-mono">SOURCE: EDGAR + PACER</div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                    }}
                    cursor={{ stroke: "#f59e0b", strokeWidth: 1 }}
                  />
                  <Area
                    type="step"
                    dataKey="docs"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border bg-surface p-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-muted">
                <Eye className="h-3 w-3" />
                Priority Watchlist
              </h3>
              <button className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600">
                <Plus className="h-3 w-3" />
                ADD
              </button>
            </div>
            <div className="divide-y divide-border">
              <WatchlistItem
                ticker="MSFT"
                name="Microsoft Corp"
                change={0.45}
                filings={2}
              />
              <WatchlistItem
                ticker="ADBE"
                name="Adobe Inc"
                change={-1.2}
                filings={1}
              />
              <WatchlistItem
                ticker="KRO"
                name="Kroger Co"
                change={0.12}
                filings={0}
              />
              <WatchlistItem
                ticker="ATVI"
                name="Activision Blizzard"
                change={0.05}
                filings={4}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col border border-border bg-background p-0">
          <div className="border-b border-border bg-surface p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Data Feeds
            </h3>
          </div>
          <div className="divide-y divide-border">
            {DATA_SOURCES.slice(0, 5).map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-3 transition-colors hover:bg-surfaceHighlight"
              >
                <div>
                  <div className="text-xs font-bold uppercase text-text-main">
                    {source.name}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {`${source.type.toUpperCase()} // ${source.id}`}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-[10px] font-bold uppercase ${
                      source.status === "active"
                        ? "text-emerald-500"
                        : source.status === "pending"
                          ? "text-primary-500"
                          : "text-rose-500"
                    }`}
                  >
                    {source.status}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {source.itemsToday} items
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-border p-4">
            <button className="w-full border border-border bg-surface py-2 text-xs font-bold uppercase tracking-wider text-text-muted transition-all hover:border-primary-500/50 hover:text-primary-500">
              Configure Sources &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
