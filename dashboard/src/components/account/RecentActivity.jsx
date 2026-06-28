/**
 * @file dashboard/src/components/account/RecentActivity.jsx
 * @description Timeline of recent user actions grouped by day.
 *
 * TODO: Replace MOCK_ACTIVITY with real data from a backend activity-log
 *       endpoint (e.g. GET /api/activity) when it becomes available.
 */

import React from "react";
import { motion } from "framer-motion";

import { getAnalyticsOverview } from "../../utils/api";

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  return `${diffInDays}d ago`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

const RecentActivity = () => {
  const [activity, setActivity] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const loadActivity = () => {
      getAnalyticsOverview()
        .then((data) => {
          if (mounted) setActivity(data.recentActivity || []);
        })
        .catch((err) => console.error("Failed to load activity:", err))
        .finally(() => {
          if (mounted) setLoading(false);
        });
    };

    loadActivity();

    const onVisibility = () => {
      if (document.visibilityState === "visible") loadActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.2 }}
    className="bg-surface border border-strong rounded-2xl p-6 sm:p-8 h-full flex flex-col"
  >
    {/* Header */}
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center flex-shrink-0">
          <ActivityIcon />
        </div>
        <h2 className="text-base font-semibold text-primary">Recent Activity</h2>
      </div>
      <span className="text-xs text-muted bg-bg border border-strong px-2.5 py-1 rounded-lg">
        {/* TODO: show real count from backend */}
        Last 7 days
      </span>
    </div>

    {/* Timeline */}
    <div className="flex-1">
      <ul className="space-y-5" role="list">
        {loading ? (
           Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface border border-strong animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-surface border border-strong rounded w-3/4 animate-pulse" />
                <div className="h-2 bg-surface border border-strong rounded w-1/4 animate-pulse" />
              </div>
            </li>
          ))
        ) : activity.length > 0 ? (
          activity.map((item, idx) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 + 0.2 }}
              className="flex items-start gap-4"
            >
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-base flex-shrink-0 border-transparent ${item.color}`} aria-hidden="true">
                  {item.icon}
                </div>
              </div>
              <div className="pt-0.5 min-w-0">
                <p className="text-sm font-semibold text-primary leading-snug">
                  {item.action}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{formatTimeAgo(item.time)}</p>
              </div>
            </motion.li>
          ))
        ) : (
          <div className="text-center py-6">
            <span className="text-2xl mb-2 block">🌱</span>
            <p className="text-sm text-secondary font-medium">No activity yet</p>
            <p className="text-xs text-muted">Your latest actions will appear here.</p>
          </div>
        )}
      </ul>
    </div>
  </motion.div>
  );
};

export default RecentActivity;
