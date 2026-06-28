/**
 * @file dashboard/src/pages/Overview.jsx
 * @description Premium dark-mode SaaS dashboard overview page.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import StatCard from "../components/StatCard";
import UsageChart from "../components/UsageChart";
import { getAnalyticsOverview } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useScrollReveal } from "../hooks/useScrollReveal";

// ─── Icons ────────────────────────────────────────────────────────────────────
const DocumentTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const BoltIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

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

function formatReadingTime(seconds) {
  if (!seconds || seconds <= 0) return "0 min";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Page Component ───────────────────────────────────────────────────────────
export default function Overview() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scope the scroll-reveal IntersectionObserver to this page's container.
  // Elements with class 'reveal' inside this ref will fade-and-settle in when
  // they cross the 20% threshold.  The hook respects prefers-reduced-motion.
  const pageRef = useScrollReveal({ threshold: 0.2 });

  const fetchAnalytics = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getAnalyticsOverview();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(true);
  }, [fetchAnalytics]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchAnalytics(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchAnalytics]);

  const userName = user?.email?.split("@")[0] || "there";

  return (
    <motion.div ref={pageRef} variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="reveal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            {getGreeting()}, <span className="capitalize">{userName}</span> 👋
          </h1>
          <p className="text-muted text-sm mt-1">Here's your accessibility overview for today.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface border border-strong rounded-xl px-4 py-2.5">
          <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span className="text-sm font-medium text-secondary">
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}
          </span>
        </div>
      </motion.div>

      {/* ── AI Insight Banner ── */}
      <motion.div variants={itemVariants} className="reveal">
        <div className="relative overflow-hidden rounded-2xl  /20 via-indigo-500/10 to-transparent border border-indigo-500/20 px-6 py-5">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l /5 to-transparent" />
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand border border-indigo-500/30 flex items-center justify-center text-lg flex-shrink-0">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-brand uppercase tracking-wider">AI Insight</span>
                <span className="w-1 h-1 rounded-full bg-brand" />
                <span className="text-xs text-muted">Today</span>
              </div>
              <p className="text-sm font-medium text-primary">
                {user?.preferences?.bionicModeEnabled
                  ? "Bionic reading is currently boosting your focus!"
                  : user?.preferences?.fontFamily === 'openDyslexic'
                  ? "OpenDyslexic font is actively improving readability."
                  : "Try enabling Focus Mode to boost reading completion by up to 24%."}
              </p>
              <p className="text-xs text-muted mt-1">
                {analytics?.totalSimplifications > 0
                  ? `Based on your ${analytics.totalSimplifications} simplifications.`
                  : "Start simplifying articles to get personalized insights."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      {/* Stats row arrives as one group (spec §2 — not each stat separately) */}
      <motion.div variants={itemVariants} className="reveal grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Texts Simplified"    value={analytics?.totalSimplifications} gradientFrom="#4F46E5" gradientTo="#6366F1" icon={DocumentTextIcon} loading={loading} />
        <StatCard title="Reading Time Saved"  value={formatReadingTime(analytics?.weeklyReadingTimeSaved)} gradientFrom="#0D9488" gradientTo="#14B8A6" icon={ClockIcon} loading={loading} />
        <StatCard title="Cache Hit Rate"      value={analytics ? `${analytics.cacheHitRate}%` : null} gradientFrom="#7C3AED" gradientTo="#8B5CF6" icon={BoltIcon} loading={loading} />
        <StatCard title="Sites Visited"       value={analytics?.sitesVisited}          gradientFrom="#DB2777" gradientTo="#EC4899" icon={GlobeIcon} loading={loading} />
      </motion.div>

      {/* ── Chart + Activity ── */}
      <motion.div variants={itemVariants} className="reveal grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2">
          <UsageChart data={analytics?.dailyUsage} loading={loading} />
        </div>

        {/* Activity Feed */}
        <div className="bg-surface border border-strong rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-primary">Recent Activity</h2>
            <span className="text-xs text-muted bg-surface border border-strong px-2.5 py-1 rounded-lg">Latest</span>
          </div>
          <ul className="space-y-4 flex-1">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-strong animate-pulse" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-surface border border-strong rounded w-3/4 animate-pulse" />
                    <div className="h-2 bg-surface border border-strong rounded w-1/4 animate-pulse" />
                  </div>
                </li>
              ))
            ) : analytics?.recentActivity?.length > 0 ? (
              analytics.recentActivity.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 + 0.3 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${item.color}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary leading-tight">{item.action}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{formatTimeAgo(item.time)}</p>
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

      {/* ── Top Domains Table ── */}
      <motion.div variants={itemVariants} className="reveal bg-surface border border-strong rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-strong flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Top Domains</h2>
          <span className="text-xs font-medium bg-surface text-secondary border border-strong px-3 py-1.5 rounded-lg">This month</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-strong">
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">#</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right w-24">Count</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/3">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-4 rounded" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-32 rounded" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-8 rounded ml-auto" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-2 w-full rounded" /></td>
                    </tr>
                  ))
                : analytics?.topDomains?.map((domain, i) => {
                    const max = Math.max(...analytics.topDomains.map((d) => d.count), 1);
                    const pct = Math.max((domain.count / max) * 100, 4);
                    return (
                      <tr key={domain.domain} className="group hover:bg-surface transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-slate-600">{i + 1}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand border border-indigo-500/20 text-brand font-bold flex items-center justify-center text-sm">
                              {domain.domain.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-secondary">{domain.domain}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-primary tabular-nums">{domain.count}</span>
                        </td>
                        <td className="px-6 py-4 pr-8">
                          <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full    transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && !analytics?.topDomains?.length && (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🌐</div>
              <p className="text-sm font-medium text-secondary">No activity yet</p>
              <p className="text-xs text-slate-600 mt-1">Start simplifying content to see your top domains here.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
