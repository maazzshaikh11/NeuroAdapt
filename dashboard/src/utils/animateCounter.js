/**
 * @file dashboard/src/utils/animateCounter.js
 * @description Plain-JS animated counter utility for the NeuroAdapt dashboard.
 *
 * Animates an element's text from 0 → target using a cubic ease-out curve over
 * `--duration-counter` (1200 ms).  If `prefersReducedMotion` is true it sets
 * the final value immediately without any rAF loop.
 *
 * This is intentionally framework-agnostic (plain JS) so it can be called from
 * a React useEffect or from a vanilla IntersectionObserver callback.
 *
 * Usage:
 *   import { animateCounter } from '../utils/animateCounter';
 *   animateCounter(document.querySelector('[data-counter]'), 50000, '+');
 */

import { getPrefersReducedMotion } from "../hooks/useMotion";

/**
 * @param {HTMLElement} el      — the DOM element whose textContent will be updated
 * @param {number}      target  — the final numeric value to count up to
 * @param {string}      [suffix=''] — text appended after the number (e.g. '+', '%')
 * @param {number}      [duration=1200] — animation duration in ms
 */
export function animateCounter(el, target, suffix = "", duration = 1200) {
  if (!el) return;

  if (getPrefersReducedMotion()) {
    // Skip animation — show final value immediately
    el.textContent = target.toLocaleString() + suffix;
    return;
  }

  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    // Cubic ease-out: fast start, gentle decelerate (matches --ease-reveal feel)
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString() + suffix;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}
