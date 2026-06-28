/**
 * @file dashboard/src/components/StatCard.jsx
 * @description Premium dark-mode stat card with animated counter and hover effects.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getPrefersReducedMotion } from "../hooks/useMotion";

// ─── Animated counter ─────────────────────────────────────────────────────────

const useAnimatedCounter = (target, loading, duration = 1200) => {
  // Initialise directly to target if reduced motion is preferred so there's
  // never a flash of "0" before the state update fires.
  const [count, setCount] = useState(() =>
    getPrefersReducedMotion() && typeof target === "number" ? target : 0
  );

  useEffect(() => {
    if (loading || typeof target !== "number") return;

    // If OS setting says reduce motion (includes runtime changes), skip animation
    if (getPrefersReducedMotion()) {
      setCount(target);
      return;
    }

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, loading, duration]);

  return count;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const StatCardSkeleton = () => (
  <div className="bg-surface rounded-2xl border border-strong p-6 space-y-4">
    <div className="flex items-start justify-between">
      <div className="skeleton h-10 w-10 rounded-xl" />
      <div className="skeleton h-5 w-14 rounded-full" />
    </div>
    <div>
      <div className="skeleton h-8 w-20 rounded mb-2" />
      <div className="skeleton h-4 w-28 rounded" />
    </div>
  </div>
);

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard = ({
  title,
  value,
  icon: Icon,
  gradientFrom = "#4F46E5",
  gradientTo = "#6366F1",
  change,
  changeLabel,
  loading = false,
}) => {
  const numericValue = typeof value === "number" ? value : null;
  const animatedValue = useAnimatedCounter(numericValue, loading);

  if (loading) return <StatCardSkeleton />;

  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="relative bg-surface border border-strong rounded-2xl p-6 overflow-hidden cursor-default group"
    >
      {/* Subtle gradient glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${gradientFrom}, transparent)` }}
        aria-hidden="true"
      />

      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-primary flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
          aria-hidden="true"
        >
          {Icon && <Icon />}
        </div>

        {change !== undefined && change !== null && (
          <span
            className={[
              "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
              isPositive && "bg-emerald-500/15 text-emerald-400",
              isNegative && "bg-red-500/15 text-red-400",
              !isPositive && !isNegative && "bg-surface text-secondary",
            ].filter(Boolean).join(" ")}
          >
            {isPositive && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isNegative && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isPositive ? `+${change}%` : `${change}%`}
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-primary leading-none tabular-nums mb-1.5">
        {numericValue !== null ? animatedValue : (value ?? "—")}
      </p>

      {/* Title */}
      <p className="text-sm font-medium text-muted">{title}</p>

      {/* Change label */}
      {changeLabel && (
        <p className="text-xs text-slate-600 mt-1">{changeLabel}</p>
      )}
    </motion.div>
  );
};

export default StatCard;
