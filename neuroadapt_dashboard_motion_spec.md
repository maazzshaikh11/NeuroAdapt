# NeuroAdapt dashboard — motion and scroll animation spec

Goal: give the dashboard the smooth, alive-on-scroll feeling of sites like metamask.io, without touching the color/typography system already defined in the design spec — this is a motion layer only, added on top of the existing Warm Clarity tokens. Every pattern below is plain JS + CSS, so it works whether the dashboard is React, Vue, or vanilla; if it's React, the same effects can be reimplemented with Framer Motion later, but the approach below doesn't require any new dependency except one optional smooth-scroll library.

## Non-negotiable: reduced motion

This applies before anything else, because this product is for users with reading and attention differences, some of whom have vestibular sensitivity to motion. Every animation defined below must be wrapped so it's skipped entirely when the user has motion reduction enabled:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Check `prefersReducedMotion` before initializing the smooth-scroll library or any IntersectionObserver-based reveal below — if true, skip them and just show content in its final state immediately. This check must happen even if the OS-level setting changes mid-session (listen for changes on the media query, not just read it once on load).

## Motion tokens (additions to the existing token file)

```css
--ease-reveal: cubic-bezier(0.16, 1, 0.3, 1); /* confident decelerate, used for scroll reveals */
--duration-reveal: 600ms;
--duration-counter: 1200ms;
--reveal-distance: 20px; /* keep small — this is a fade-and-settle, not a slide-in */
```

## 1. Smooth scroll (page-level momentum)

Use Lenis (`npm install lenis`) to replace the browser's default instant scroll with inertia:

```js
import Lenis from 'lenis';

if (!prefersReducedMotion) {
  const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
}
```

This alone is most of what makes a site feel "premium" when scrolling — don't skip it even if the reveal animations below feel like the more obvious win.

## 2. Scroll-triggered reveal (sections fade and settle in)

```css
.reveal {
  opacity: 0;
  transform: translateY(var(--reveal-distance));
  transition: opacity var(--duration-reveal) var(--ease-reveal),
              transform var(--duration-reveal) var(--ease-reveal);
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // animate once, not every scroll pass
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.reveal').forEach((el) => {
  if (prefersReducedMotion) {
    el.classList.add('is-visible'); // skip straight to final state
  } else {
    observer.observe(el);
  }
});
```

Apply the `.reveal` class to: the hero headline block, the "Simplify complex content..." subtext line, the stats row as a single group (not each stat separately — they should arrive together), and the login form card. For multiple sibling elements that should stagger rather than arrive simultaneously, add `transition-delay` in 80ms increments (first child 0ms, second 80ms, third 160ms) rather than animating them as one block.

## 3. Animated stat counters

Apply this to the "50,000+" and "95%" numbers specifically, triggered the same way as the reveal above (reuse the same IntersectionObserver, fire this alongside the `is-visible` class add):

```js
function animateCounter(el, target, suffix = '') {
  if (prefersReducedMotion) { el.textContent = target.toLocaleString() + suffix; return; }
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / 1200, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
// animateCounter(statEl, 50000, '+')
// animateCounter(statEl, 95, '%')
```

## 4. What not to do

No parallax background drift, no pinned/sticky sections that hijack scroll, no element that moves faster or slower than the actual scroll speed — those are the specific patterns most likely to bother someone with vestibular sensitivity, and they add disproportionate implementation complexity for a relatively small visual gain here. The fade-and-settle reveal plus the inertia scroll already gets most of the "smooth, alive" feeling that prompted this — there's no need to layer on the more aggressive techniques some marketing sites use.

## 5. Where this applies

This is dashboard-only. The extension panel and floating widget open and close instantly inside a fixed-position popup — they don't scroll, so none of this motion layer applies there; their only animation needs are the existing micro-interactions already defined in the component spec (toggle slide, segmented-control slide, hover states).
