/**
 * @file dashboard/src/components/UsageChart.jsx
 * @description Dark-mode area chart using Recharts for daily simplification usage.
 *
 * Props:
 *   data     {Array<{ day: string, count: number }>}  — 7-day usage data
 *   loading  {boolean}                                — show skeleton state
 */

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-strong rounded-xl px-4 py-3 shadow-xl">
        <p className="text-xs text-secondary mb-1">{label}</p>
        <p className="text-lg font-bold text-primary">
          {payload[0].value}
          <span className="text-xs font-normal text-secondary ml-1">simplifications</span>
        </p>
      </div>
    );
  }
  return null;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ChartSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-end gap-2 h-40">
      {[40, 70, 55, 85, 65, 45, 75].map((h, i) => (
        <div key={i} className="flex-1 skeleton rounded-t-lg" style={{ height: `${h}%` }} />
      ))}
    </div>
    <div className="flex gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex-1 skeleton h-3 rounded" />
      ))}
    </div>
  </div>
);

// ─── UsageChart ───────────────────────────────────────────────────────────────

const UsageChart = ({ data = [], loading = false }) => {
  if (loading) {
    return (
      <div className="bg-surface border border-strong rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="skeleton h-5 w-28 rounded" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  const chartData = (data || []).map((entry) => ({
    day: entry.day,
    count: entry.count ?? entry.simplifications ?? 0,
  }));

  return (
    <div className="bg-surface border border-strong rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-primary">Daily Usage</h2>
          <p className="text-xs text-muted mt-0.5">Texts simplified per day</p>
        </div>
        <span className="text-xs font-medium bg-surface text-secondary border border-strong px-3 py-1.5 rounded-lg">
          Last 7 days
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "#475569", fontSize: 12, fontFamily: "Inter, sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 12, fontFamily: "Inter, sans-serif" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#6366F1"
            strokeWidth={2.5}
            fill="url(#colorUsage)"
            dot={false}
            activeDot={{ r: 5, fill: "#6366F1", stroke: "#1e293b", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UsageChart;
