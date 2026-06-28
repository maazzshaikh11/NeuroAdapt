/**
 * @file dashboard/src/components/account/StatisticCard.jsx
 * @description Small animated stat card for the Account page statistics grid.
 *              Uses the same counter animation pattern as StatCard.jsx in the overview.
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// ─── Animated counter ─────────────────────────────────────────────────────────

const useAnimatedCounter = (target, duration = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof target !== "number") return;

    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (prefersReduced) { setCount(target); return; }

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return count;
};

// ─── Component ────────────────────────────────────────────────────────────────

const StatisticCard = ({ value, label, icon: Icon, accentColor = "var(--color-brand)" }) => {
  const numericValue  = typeof value === "number" ? value : null;
  const displayRaw    = typeof value === "string" ? value : null;
  const numericTarget = numericValue !== null ? numericValue : (displayRaw ? parseFloat(displayRaw) : 0);
  const animated      = useAnimatedCounter(numericTarget);

  // Build display string — if original had a % suffix keep it
  const displayValue = displayRaw
    ? displayRaw
    : numericValue !== null
    ? animated.toLocaleString()
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(27,107,90,0.10)" }}
      transition={{ duration: 0.35 }}
      className="bg-surface border border-strong rounded-2xl p-5 relative overflow-hidden group"
    >
      {/* Faint glow on hover */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }}
        aria-hidden="true"
      />

      {/* Icon */}
      {Icon && (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white mb-4 flex-shrink-0"
          style={{ background: accentColor }}
          aria-hidden="true"
        >
          <Icon />
        </div>
      )}

      {/* Numeric value */}
      <p className="text-2xl font-bold text-primary tabular-nums leading-none mb-1">
        {displayValue}
      </p>

      {/* Label */}
      <p className="text-xs font-medium text-muted leading-snug">{label}</p>
    </motion.div>
  );
};

export default StatisticCard;
