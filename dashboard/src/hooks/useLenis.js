/**
 * @file dashboard/src/hooks/useLenis.js
 * @description Lenis smooth-scroll initializer for the NeuroAdapt dashboard.
 *
 * Initialises Lenis on the given scroll container element (or the window if no
 * ref is provided) and wires up the rAF loop.  The instance is torn down on
 * unmount to prevent leaks.
 *
 * If `prefersReducedMotion` is true Lenis is never created — the browser's
 * default instant scroll is preserved (spec §Non-negotiable).
 *
 * The hook also listens for runtime changes to the media query so that if the
 * user toggles "Reduce Motion" while the dashboard is open, Lenis is
 * immediately destroyed / recreated accordingly.
 *
 * Usage (attach to the scrollable <main> element):
 *   const scrollRef = useLenis();
 *   <main ref={scrollRef} …>…</main>
 *
 * Usage (window-level scroll — no ref needed):
 *   useLenis();
 */

import { useEffect, useRef } from "react";

const MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * @param {object} [options]
 * @param {number} [options.duration=1.1]   — Lenis scroll duration multiplier
 * @returns {React.RefObject}  ref to attach to the scroll container element
 */
export function useLenis({ duration = 1.1 } = {}) {
  const containerRef = useRef(null);
  const lenisRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    // Dynamically import Lenis so it doesn't bloat non-dashboard bundles
    let destroyed = false;

    async function init(reduced) {
      if (reduced) return; // honour reduced-motion — don't start Lenis

      const { default: Lenis } = await import("lenis");

      if (destroyed) return; // component unmounted while importing

      const options = {
        duration,
        easing: (t) => 1 - Math.pow(1 - t, 3), // cubic ease-out
      };

      // If a container ref is provided, scope Lenis to that element;
      // otherwise Lenis defaults to window scroll.
      if (containerRef.current) {
        options.wrapper = containerRef.current;
        options.content = containerRef.current.firstElementChild || containerRef.current;
      }

      const lenis = new Lenis(options);
      lenisRef.current = lenis;

      function raf(time) {
        if (!lenisRef.current) return;
        lenisRef.current.raf(time);
        rafRef.current = requestAnimationFrame(raf);
      }
      rafRef.current = requestAnimationFrame(raf);
    }

    function destroy() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
    }

    // Initial check
    const mq = window.matchMedia(MEDIA_QUERY);
    init(mq.matches);

    // Listen for runtime changes
    const handler = (e) => {
      if (e.matches) {
        destroy();
      } else {
        init(false);
      }
    };

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else {
      mq.addListener(handler);
    }

    return () => {
      destroyed = true;
      destroy();
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, [duration]);

  return containerRef;
}
