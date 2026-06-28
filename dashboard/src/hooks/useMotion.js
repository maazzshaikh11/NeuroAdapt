/**
 * @file dashboard/src/hooks/useMotion.js
 * @description Reduced-motion hook for the NeuroAdapt dashboard.
 *
 * Returns `{ prefersReducedMotion }` — a live boolean that updates when the
 * OS-level motion preference changes mid-session (as required by the motion spec).
 *
 * Usage:
 *   const { prefersReducedMotion } = useMotion();
 *   if (!prefersReducedMotion) initLenis();
 */

import { useState, useEffect } from "react";

const MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Returns the current value of the prefers-reduced-motion media query and
 * subscribes to runtime changes so the value stays fresh throughout the
 * session (spec requirement: "listen for changes, not just read on load").
 */
export function useMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MEDIA_QUERY).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(MEDIA_QUERY);
    const handler = (e) => setPrefersReducedMotion(e.matches);

    // Modern browsers
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else {
      // Safari < 14 fallback
      mq.addListener(handler);
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, []);

  return { prefersReducedMotion };
}

/**
 * One-shot read of the media query — safe to call outside React
 * (e.g. in a vanilla JS Lenis initializer that runs once on mount).
 */
export function getPrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MEDIA_QUERY).matches;
}
