# NeuroAdapt design system spec

This replaces the current dark navy / purple-indigo gradient theme used across the browser extension, the floating selection menu, and the dashboard. The goal: one consistent, warm, light, high-contrast visual system across all three surfaces, instead of three different design languages. Apply every token and component rule below identically everywhere — nothing here is extension-only or dashboard-only unless stated.

## 1. Design tokens

Paste this directly into a shared CSS file (e.g. `tokens.css`) and import it into the extension, the content-script popup, and the dashboard app so all three pull from one source.

```css
:root {
  /* Surfaces */
  --color-bg: #FAF7F2;          /* page / panel background, replaces navy */
  --color-surface: #FFFFFF;     /* cards, inputs, popups */
  --color-border: #E8E2D6;      /* default hairline border */
  --color-border-strong: #D6CFC0; /* hover / focus border */

  /* Text */
  --color-text-primary: #2B2B28;   /* headings, primary copy — never pure black */
  --color-text-secondary: #5F5E5A; /* body copy, labels */
  --color-text-muted: #8A8579;     /* captions, helper text, placeholders */

  /* Brand — single accent, used everywhere */
  --color-brand: #1B6B5A;
  --color-brand-hover: #155847;
  --color-brand-active: #0F4636;
  --color-brand-soft: #E1F0EA;   /* tinted backgrounds, selected states */
  --color-on-brand: #FFFFFF;     /* text/icons sitting on solid brand fill */

  /* Accent — reserved for ONE thing: primary calls to action (Sign in, Upgrade, Save) */
  --color-accent: #E2664B;
  --color-accent-hover: #C8523A;
  --color-on-accent: #FFFFFF;

  /* Semantic (status only — never decorative) */
  --color-success: #3B6D11;
  --color-warning: #854F0B;
  --color-error: #A32D2D;

  /* Radius */
  --radius-sm: 8px;   /* chips, small buttons */
  --radius-md: 12px;  /* inputs, secondary cards */
  --radius-lg: 20px;  /* panels, primary cards, popups */
  --radius-pill: 999px; /* segmented controls, toggle tracks */

  /* Spacing — 4px base grid, no arbitrary values outside this scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  /* Elevation — one soft shadow, used sparingly. Hairline borders do most of the work instead. */
  --shadow-card: 0 1px 2px rgba(43,43,40,0.04), 0 4px 12px rgba(43,43,40,0.05);

  /* Motion */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 120ms;
  --duration-standard: 200ms;

  /* Type */
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display: 'Source Serif 4', Georgia, serif; /* dashboard hero headline only */
}
```

Type scale (applies to extension, popup, and dashboard alike — only the dashboard hero uses `--font-display`, everything else uses `--font-ui`):

| Role | Font | Size | Weight | Line height |
|---|---|---|---|---|
| Hero headline (dashboard only) | display | 48px | 600 | 1.1 |
| Panel title | ui | 16px | 500 | 1.3 |
| Section label (eyebrow) | ui | 11px, uppercase, 0.04em tracking | 500 | 1.2 |
| Body / card label | ui | 14px | 500 | 1.5 |
| Helper / caption | ui | 12px | 400 | 1.4 |

Do not introduce a second UI font anywhere. The dashboard hero is the only place the serif appears, and only for the main headline — subheads and body copy on the dashboard still use Inter.

## 2. Component rules

**Buttons.** Primary (e.g. Sign in, Save): solid `--color-accent` fill, white text, `--radius-md`, `--space-3` vertical padding. Secondary: transparent fill, 1px `--color-border-strong`, `--color-text-primary` text. Hover on either: background darkens one step (`-hover` token), no shadow added. Active: scale(0.98) over `--duration-fast`. Never use the brand teal for buttons — teal is for selected/active states, accent coral is reserved for primary actions only, so the two never compete.

**Cards.** Two types only. Primary action card: solid `--color-brand` fill, white icon and text, used for exactly one action per screen (e.g. "Simplify" in the main panel). Secondary card: `--color-surface` fill, 1px `--color-border`, `--radius-md`, icon in `--color-text-secondary` with no background chip behind it. Never put a colored square behind an icon — that's the pattern to remove everywhere it currently exists.

**Segmented control** (e.g. reading level). Track: `--color-surface`, 1px `--color-border`, `--radius-pill`, `--space-1` internal padding. Selected segment: `--color-brand` fill, white text, `--radius-pill` minus 2px, animates position over `--duration-standard` with `--ease-standard` rather than snapping.

**Toggle switch** (used in the Simplify Selection menu for Bionic Mode, Focus Mode, OpenDyslexic Font). Track 36x20px, `--radius-pill`. Off state: `--color-border-strong` track, white thumb. On state: `--color-brand` track, white thumb, thumb slides over `--duration-standard`. This replaces the default browser-style toggle currently in the Simplify Selection popup.

**Progress bar** (daily usage). Track: `--color-border`, 6px height, `--radius-sm`. Fill: solid `--color-brand`, no gradient. Width animates on value change, not on load.

**Icons.** Tabler-style outline icons only, 18–20px, color `--color-text-secondary` by default or `--color-on-brand` when on a solid brand fill. No background chip, no duotone, no filled icon variants. This is the single biggest visual unifier between the main panel and the Simplify Selection popup, since right now they use two different icon treatments.

## 3. Surface-by-surface changes

**Extension main panel.** Replace the navy background and indigo gradient headline with `--color-bg`. Give "Simplify" the primary action card treatment; Focus, Bionic, and Dyslexia Font become secondary cards in a row beneath it, not four equal tiles. Reading level segmented control and daily usage bar use the component rules above. Footer version text and settings icon use `--color-text-muted`.

**Floating toggle button** (the round button that sits over the page). Currently a plain purple circle — change its fill to `--color-brand`, white brand mark icon, `--shadow-card` for separation from the page content behind it (this is the one place a shadow is load-bearing, since it floats over arbitrary page backgrounds). On hover, scale to 1.05 over `--duration-fast`.

**Simplify Selection popup.** This currently has a different background, shadow, and icon style than the main panel — that inconsistency is the most visible sign the product wasn't built as one system. Rebuild it with `--color-surface` background, `--radius-lg`, `--shadow-card`, and the same icon treatment (no colored chips) as the main panel's secondary cards. Toggles use the toggle-switch spec above, not the current default browser toggles.

**Dashboard (marketing page, login, signup).** Background `--color-bg`, not navy. Hero headline in `--font-display` at the size in the type scale above, `--color-text-primary` — no gradient text. Stat blocks ("50,000+ texts simplified," "95% readability improvement") drop the heavy display weight and sit as plain numbers in `--color-brand` with `--color-text-secondary` labels beneath, no card wrapper needed. Login form inputs: `--color-surface` fill, 1px `--color-border`, `--radius-md`, focus state is a 2px `--color-brand` outline (important for an accessibility product to have a visible, high-contrast focus ring). Primary CTA button (Sign in / Get started) uses `--color-accent`, the only accent-colored element on the page.

## 4. Accessibility requirements

Since the product's whole purpose is accessibility, the chrome itself has to meet a higher bar than typical. Text on `--color-bg` and `--color-surface` must hit at least 4.5:1 contrast against `--color-text-primary` and `--color-text-secondary` — both already verified against the hex values above. Every interactive element needs a visible focus ring (2px solid `--color-brand`, never `outline: none`). Respect `prefers-reduced-motion`: disable the segment-slide and thumb-slide animations and fall back to an instant state change. None of these chrome changes should alter the existing Bionic Mode, Dyslexia Font, or text-simplification logic — this spec only covers the visual shell around those features.

## 5. Remove / add checklist

Remove: the indigo-to-teal gradient on headlines, the dark navy page and panel background, colored square chips behind icons, the default browser toggle styling, any drop shadow used as a glow effect, and the mismatch between the main panel's style and the Simplify Selection popup's style.

Add: `--color-bg` ivory background everywhere, `--color-brand` teal as the single recurring accent for active/selected states, `--color-accent` coral reserved only for primary CTA buttons, hairline borders in place of most shadows, one consistent icon treatment, and the shared `tokens.css` file so the extension, popup, and dashboard import the same values instead of each surface defining its own.
