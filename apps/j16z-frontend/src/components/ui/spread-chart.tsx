"use client";

import * as React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { MarketSnapshot } from "@/lib/types";

interface SpreadChartProps {
  data: MarketSnapshot[];
  events?: Array<{ timestamp: string; title: string; type: string }>;
}

export function SpreadChart({ data, events = [] }: SpreadChartProps) {
  const [timeRange, setTimeRange] = React.useState<string>("3M");

  const filteredData = React.useMemo(() => {
    const now = new Date();
    const ranges: { [key: string]: number } = {
      "1M": 30,
      "3M": 90,
      "6M": 180,
      "1Y": 365,
      "ALL": 999999,
    };
    const daysToShow = ranges[timeRange] || 90;
    const cutoffDate = new Date(now.getTime() - daysToShow * 24 * 60 * 60 * 1000);

    return data
      .filter((snapshot) => new Date(snapshot.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [data, timeRange]);

  const chartData = filteredData.map((snapshot) => ({
    date: new Date(snapshot.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    spread: snapshot.spread,
    timestamp: snapshot.timestamp,
  }));

  const stats = React.useMemo(() => {
    if (chartData.length === 0) return { current: 0, change24h: 0, min: 0, max: 0, avg: 0 };
    const spreads = chartData.map((d) => d.spread);
    const current = spreads[spreads.length - 1];
    const prev = spreads[spreads.length - 2] || current;
    return {
      current,
      change24h: current - prev,
      min: Math.min(...spreads),
      max: Math.max(...spreads),
      avg: spreads.reduce((a, b) => a + b, 0) / spreads.length,
    };
  }, [chartData]);

  const eventMarkers = React.useMemo(() => {
    return events
      .filter((e) => {
        const eventDate = new Date(e.timestamp);
        const firstDate = filteredData[0] ? new Date(filteredData[0].timestamp) : new Date();
        const lastDate = filteredData[filteredData.length - 1] ? new Date(filteredData[filteredData.length - 1].timestamp) : new Date();
        return eventDate >= firstDate && eventDate <= lastDate;
      })
      .slice(0, 5);
  }, [events, filteredData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["1M", "3M", "6M", "1Y", "ALL"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md font-mono text-xs transition-colors ${
                timeRange === range
                  ? "bg-amber-500 text-zinc-950"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 p-3 bg-zinc-900 rounded-md">
        <div>
          <div className="text-xs text-zinc-500 font-mono">Current</div>
          <div className="text-lg font-mono font-bold text-amber-500">{stats.current.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 font-mono">24h Change</div>
          <div className={`text-lg font-mono font-bold ${stats.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
            {stats.change24h >= 0 ? "+" : ""}{stats.change24h.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 font-mono">Min</div>
          <div className="text-lg font-mono font-bold text-zinc-100">{stats.min.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 font-mono">Max</div>
          <div className="text-lg font-mono font-bold text-zinc-100">{stats.max.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 font-mono">Avg</div>
          <div className="text-lg font-mono font-bold text-zinc-100">{stats.avg.toFixed(1)}%</div>
        </div>
      </div>

      {eventMarkers.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-zinc-500 font-mono">Event Markers:</span>
          {eventMarkers.map((event, idx) => (
            <span key={idx} className="text-xs font-mono text-amber-500">
              {event.type === "COURT" ? "⚖️" : event.type === "AGENCY" ? "🏛️" : "📄"} {new Date(event.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <div className="w-full h-[300px] bg-zinc-950 rounded-lg p-4 border border-zinc-800">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="spreadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                style={{ fontSize: "11px", fontFamily: "monospace" }}
              />
              <YAxis
                stroke="#71717a"
                style={{ fontSize: "11px", fontFamily: "monospace" }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "6px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#f59e0b" }}
                itemStyle={{ color: "#fafafa" }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, "Spread"]}
              />
              {eventMarkers.map((event, idx) => {
                const eventDate = new Date(event.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <ReferenceLine
                    key={idx}
                    x={eventDate}
                    stroke={event.type === "COURT" ? "#ef4444" : event.type === "AGENCY" ? "#f59e0b" : "#3b82f6"}
                    strokeDasharray="3 3"
                    label={{ value: event.type === "COURT" ? "⚖️" : event.type === "AGENCY" ? "🏛️" : "📄", position: "top", fill: "#f59e0b", fontSize: 12 }}
                  />
                );
              })}
              <Area
                type="monotone"
                dataKey="spread"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#spreadGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
