/**
 * @file dashboard/src/components/account/ExtensionStatusCard.jsx
 * @description Shows Chrome extension connection status, version, and daily usage
 *              from GET /api/analytics/overview (same source as the extension popup).
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getAnalyticsOverview } from "../../utils/api";

const ExtensionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);

const SyncIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const InfoItem = ({ label, value, extra }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
    <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-2">
      {extra}
      <span className="text-sm font-semibold text-primary">{value}</span>
    </div>
  </div>
);

const ExtensionStatusCard = () => {
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [lastSync, setLastSync] = useState("—");

  const fetchAnalytics = useCallback(async () => {
    try {
      const analytics = await getAnalyticsOverview();
      setDailyUsed(analytics.dailySimplificationCount ?? 0);
      setDailyLimit(analytics.dailyLimit ?? 50);
      setLastSync("Just now");
    } catch {
      // Keep last known values on transient errors
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchAnalytics();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchAnalytics]);

  const ext = {
    connected: true,
    version: "v1.0.0",
    dailyUsed,
    dailyLimit,
    lastSync,
  };

  const usagePct = dailyLimit > 0
    ? Math.round((ext.dailyUsed / ext.dailyLimit) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-surface border border-strong rounded-2xl p-6 sm:p-8 h-full flex flex-col"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center flex-shrink-0">
          <ExtensionIcon />
        </div>
        <h2 className="text-base font-semibold text-primary">Extension Status</h2>
      </div>

      <div className="space-y-5 flex-1">
        <InfoItem
          label="Status"
          value=""
          extra={
            <span
              className={[
                "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                ext.connected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-orange-50 text-orange-600 border-orange-200",
              ].join(" ")}
            >
              <span
                className={[
                  "w-1.5 h-1.5 rounded-full",
                  ext.connected ? "bg-emerald-500 animate-pulse" : "bg-orange-500",
                ].join(" ")}
                aria-hidden="true"
              />
              {ext.connected ? "Connected" : "Disconnected"}
            </span>
          }
        />

        <InfoItem label="Version" value={ext.version} />

        <InfoItem
          label="Last Sync"
          value={ext.lastSync}
          extra={<SyncIcon />}
        />

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Daily Usage</span>
            <span className="text-sm font-semibold text-primary tabular-nums">
              {ext.dailyUsed} / {ext.dailyLimit}
            </span>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden border border-strong/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usagePct}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background:
                  usagePct > 80
                    ? "var(--color-accent)"
                    : "var(--color-brand)",
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ExtensionStatusCard;
