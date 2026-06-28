/**
 * @file dashboard/src/hooks/useScrollReveal.js
 * @description Scroll-reveal hook for the NeuroAdapt dashboard.
 *
 * Attaches an IntersectionObserver to all `.reveal` elements inside the
 * provided container ref (or document if no ref given).  When an element
 * intersects, `.is-visible` is added and the element is unobserved (animate
 * once, not on every scroll pass).
 *
 * If `prefersReducedMotion` is true the elements are set to their final
 * visible state immediately, with no observer.
 *
 * Usage:
 *   const containerRef = useScrollReveal();
 *   <section ref={containerRef}>
 *     <div className="reveal">…</div>
 *   </section>
 *
 * Or without a ref (scopes to `document`):
 *   useScrollReveal();
 */

import { useEffect, useRef } from "react";
import { getPrefersReducedMotion } from "./useMotion";

/**
 * @param {object}  [options]
 * @param {number}  [options.threshold=0.2]   — fraction of element visible before triggering
 * @param {string}  [options.selector='.reveal'] — CSS selector for animated elements
 * @returns {React.RefObject}  attach to the scroll container to scope the observer
 */
export function useScrollReveal({
  threshold = 0.2,
  selector = ".reveal",
} = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current ?? document;
    const elements = container.querySelectorAll(selector);

    if (!elements.length) return;

    const reduced = getPrefersReducedMotion();

    if (reduced) {
      // Skip straight to final visible state — no observer needed
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // fire once only
          }
        });
      },
      { threshold }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [threshold, selector]);

  return containerRef;
}
