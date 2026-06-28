# NeuroAdapt — extension panel and floating widget implementation spec

This defines the exact structure and values for the two surfaces shown in the mockups: the extension's main panel (opened from the toolbar icon) and the floating widget that sits on the page (collapsed circle button + expanded Simplify Selection menu). Match these values exactly rather than approximating — they're pulled directly from the approved mockups. This assumes the shared tokens below; if `tokens.css` from the earlier design spec is already in the codebase, these are the same values, just listed inline here for a self-contained handoff.

## Shared tokens used on both surfaces

```css
--color-bg: #FAF7F2;
--color-surface: #FFFFFF;
--color-border: #E8E2D6;
--color-border-strong: #D6CFC0;
--color-divider: #F1ECE2;        /* lighter than --color-border, used between list rows inside a card */
--color-text-primary: #2B2B28;
--color-text-secondary: #5F5E5A;
--color-text-muted: #8A8579;
--color-brand: #1B6B5A;
--color-brand-soft: #CFE6DD;     /* subtitle text sitting on a solid brand fill */
--color-on-brand: #FFFFFF;
--shadow-card: 0 1px 2px rgba(43,43,40,0.04), 0 4px 12px rgba(43,43,40,0.05);
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 20px;
--radius-pill: 999px;
```

No purple, indigo, red, or blue anywhere on either surface. `--color-brand` is the only accent color used on these two surfaces (the coral accent from the design spec is reserved for the dashboard's primary CTA and does not appear here).

## 1. Extension main panel

Overall container: width 380px, `background: var(--color-bg)`, `border-radius: var(--radius-lg)`, `border: 1px solid var(--color-border)`, `padding: 24px`.

**Header row.** Flex, space-between, align-center, margin-bottom 24px.
- Left group: flex, gap 12px. Brand mark: 40x40px box, `border-radius: var(--radius-md)`, `background: var(--color-brand)`, centered white icon at 20px. Next to it, stacked text: title "NeuroAdapt" at 16px / weight 500 / `--color-text-primary`; subtitle "AI accessibility" at 12px / `--color-text-muted`.
- Right: "Sign in" button — transparent background, `border: 1px solid var(--color-brand)`, `color: var(--color-brand)`, `border-radius: var(--radius-sm)`, padding 6px 14px, font 13px / weight 500. Hover: background `--color-brand-soft`.

**Quick actions section.** Eyebrow label "Quick actions" — 11px, uppercase, weight 500, 0.04em letter-spacing, `--color-text-muted`, margin-bottom 10px.

Primary action card (Simplify only): `background: var(--color-brand)`, `border-radius: var(--radius-md)`, padding 14px 16px, flex row gap 12px, margin-bottom 10px. White icon at 20px on the left. Title "Simplify" 14px / weight 500 / white. Subtitle "AI text simplification" 12px / `--color-brand-soft`. Hover: background darkens to `--color-brand` minus one step (`#155847`); active: `scale(0.98)`.

Secondary actions: 3-column grid, gap 8px, margin-bottom 24px. Each cell: `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`, padding 12px 10px, text-align center. Icon 18px, `--color-text-secondary`, no background chip behind it. Label below at 12px, `--color-text-primary`, margin-top 6px. Cells in order: Focus, Bionic, Dyslexia font. Hover: `border-color: var(--color-border-strong)`.

**Reading level section.** Same eyebrow label style as above. Segmented control: flex row, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`, padding 4px, margin-bottom 24px. Three equal-width segments (Basic / Standard / Academic), each padding 8px 0, text-align center, font 13px. Unselected: `--color-text-muted`. Selected: `background: var(--color-brand)`, `color: white`, weight 500, `border-radius: var(--radius-sm)`, position animates over 200ms with `cubic-bezier(0.4,0,0.2,1)` rather than snapping between segments.

**Daily usage section.** Row with label "Daily usage" (13px / weight 500 / `--color-text-primary`) and value e.g. "50 of 50 remaining" (12px / `--color-text-muted`) on a space-between baseline, margin-bottom 8px. Progress track: height 6px, `background: var(--color-border)`, `border-radius: var(--radius-sm)`. Fill: solid `--color-brand`, no gradient, width animates only on value change.

**Footer.** Border-top 1px `--color-border`, padding-top 14px, flex space-between. Version text 11px `--color-text-muted`. Settings gear icon 16px `--color-text-muted`, no background.

## 2. Floating widget — collapsed button

A 52x52px circle, `background: var(--color-brand)`, centered white brand-mark icon at 22px, `box-shadow: var(--shadow-card)`. This sits fixed in the page's bottom-right corner over arbitrary page content, which is why it's the one element on this surface allowed a shadow — it needs separation from whatever's behind it. Hover: `scale(1.05)` over 120ms. Clicking it expands the Simplify Selection menu directly above it.

## 3. Floating widget — expanded Simplify Selection menu

Card: width 300px, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-card)`, padding 14px. Positioned directly above the collapsed button, right-aligned to it.

**Primary row** (Simplify selection — this is the one-tap action, styled the same way the Simplify card is styled in the main panel): `background: var(--color-brand)`, `border-radius: var(--radius-md)`, padding 12px 14px, flex row gap 10px, margin-bottom 14px. White icon 18px, label "Simplify selection" 14px / weight 500 / white.

**Toggle rows** (Bionic mode, Focus mode, OpenDyslexic font, in that order): flex space-between align-center, padding 10px 4px, `border-top: 1px solid var(--color-divider)` (each row divided from the one above, first row's divider sits below the primary action row). Left side: icon 18px `--color-text-secondary` with no background chip, then stacked text — label 13px / weight 500 / `--color-text-primary`, description 12px / `--color-text-muted` below it.

Toggle switch (right side of each row): track 36x20px, `border-radius: var(--radius-pill)`. Off state: `background: var(--color-border)`, white 16x16px circular thumb positioned 2px from the left. On state: `background: var(--color-brand)`, thumb positioned 2px from the right. Thumb has a subtle `0 1px 2px rgba(0,0,0,0.15)` shadow in both states. Thumb position transitions over 200ms with `cubic-bezier(0.4,0,0.2,1)`. This replaces whatever default toggle component is currently used — there should be no other toggle color anywhere in the product besides this teal/border-grey pair.

## What this removes from the current build

The purple icon background behind Bionic, the red/coral background behind Focus, and the blue background behind the dyslexia font icon in the current floating menu all go away — icons sit directly on the white card with no chip behind them. The floating button's purple fill becomes the same teal used everywhere else. The extension panel's navy background, gradient header text, indigo selected-segment pill, and gradient progress fill are replaced with the ivory/teal values above. Nothing about what these controls do should change — only their colors, surfaces, and spacing.
