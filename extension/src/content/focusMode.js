/**
 * NeuroAdapt — Focus Mode (T-2.5)
 *
 * Transforms any webpage into a distraction-free reading environment by:
 *   1. Detecting the main article / content area
 *   2. Hiding surrounding clutter (sidebars, ads, navbars)
 *   3. Applying accessibility-friendly typography and themes
 *   4. Optionally loading the OpenDyslexic font for dyslexia support
 *
 * Exports:
 *   enableFocusMode(theme)   – activate focus mode with a given theme
 *   disableFocusMode()       – restore the page to its original state
 *   isFocusActive()          – returns current state
 */

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let isFocusModeEnabled = false;

/**
 * Stores the original `display` value of every element we hide so we can
 * restore them exactly when focus mode is turned off.
 * @type {Map<HTMLElement, string>}
 */
const hiddenElementsMap = new Map();

/** Reference to the overlay container we create. */
let focusOverlay = null;

/** Reference to the <style> tag injected for theme colours. */
let themeStyleTag = null;

/** Reference to the <style> tag injected for the OpenDyslexic @font-face. */
let fontStyleTag = null;

/** Reference to the original content node we cloned into the overlay. */
let originalContentNode = null;

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

const THEMES = {
  light: {
    background: '#FFFFFF',
    text: '#111827',
  },
  dark: {
    background: '#111827',
    text: '#F9FAFB',
  },
  yellow: {
    background: '#000000',
    text: '#FDE047',
  },
  cream: {
    background: '#FAF3E0',
    text: '#2D2D2D',
  },
};

// ---------------------------------------------------------------------------
// Content Detection
// ---------------------------------------------------------------------------

/**
 * Finds the main content area of the page.
 *
 * Detection priority:
 *   1. `<article>` element
 *   2. `<main>` element
 *   3. The largest visible text container in the body
 *
 * @returns {HTMLElement|null} The detected content node, or null.
 */
function findMainContent() {
  // Priority 1 — <article>
  const article = document.querySelector('article');
  if (article && article.innerText.trim().length > 100) {
    return article;
  }

  // Priority 2 — <main>
  const main = document.querySelector('main');
  if (main && main.innerText.trim().length > 100) {
    return main;
  }

  // Priority 3 — largest visible text container
  // Walk all direct + nested children looking for the element with the most text
  let bestNode = null;
  let bestScore = 0;

  /**
   * Scoring heuristic: we look at block-level elements (divs, sections) at
   * most 6 levels deep.  The element whose `innerText` is longest wins.
   * We skip elements that are clearly non-content (nav, header, footer,
   * aside, form) and hidden elements.
   */
  const SKIP_TAGS = new Set([
    'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'FORM',
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IFRAME',
  ]);

  const candidates = document.body.querySelectorAll(
    'div, section, td, [role="main"], [role="article"]',
  );

  for (const el of candidates) {
    if (SKIP_TAGS.has(el.tagName)) continue;

    // Skip NeuroAdapt's own elements
    if (isNeuroAdaptElement(el)) continue;

    // Skip hidden elements
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
    } catch (_) {
      continue;
    }

    const textLen = el.innerText ? el.innerText.trim().length : 0;
    if (textLen > bestScore) {
      bestScore = textLen;
      bestNode = el;
    }
  }

  return bestNode;
}

/**
 * Returns true if the element belongs to NeuroAdapt's injected UI.
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function isNeuroAdaptElement(el) {
  if (!el || !el.id) {
    // Also check class
    if (
      el &&
      typeof el.className === 'string' &&
      el.className.split(/\s+/).some((c) => c.startsWith('neuroadapt-'))
    ) {
      return true;
    }
    if (el && el.id && el.id.startsWith('neuroadapt-')) {
      return true;
    }
    return false;
  }
  return el.id.startsWith('neuroadapt-');
}

// ---------------------------------------------------------------------------
// Theme injection
// ---------------------------------------------------------------------------

/**
 * Creates and injects a `<style>` tag with theme colours for the focus overlay.
 *
 * @param {string} themeName – one of 'light', 'dark', 'yellow', 'cream'
 */
function applyTheme(themeName) {
  // Remove existing theme style if present
  if (themeStyleTag && themeStyleTag.parentNode) {
    themeStyleTag.parentNode.removeChild(themeStyleTag);
    themeStyleTag = null;
  }

  const theme = THEMES[themeName] || THEMES.light;

  const css = `
    .neuroadapt-focus-overlay {
      background-color: ${theme.background} !important;
    }
    .neuroadapt-focus-content,
    .neuroadapt-focus-content * {
      color: ${theme.text} !important;
    }
    /* Preserve link colour distinction in dark/yellow themes */
    .neuroadapt-focus-content a {
      text-decoration: underline !important;
    }
  `;

  themeStyleTag = document.createElement('style');
  themeStyleTag.id = 'neuroadapt-focus-theme';
  themeStyleTag.textContent = css;
  document.head.appendChild(themeStyleTag);
}

// ---------------------------------------------------------------------------
// Hide / Restore helpers
// ---------------------------------------------------------------------------

/**
 * Hides all direct children of `<body>` except the NeuroAdapt widget and the
 * focus overlay.  Stores the original `display` value in `hiddenElementsMap`.
 */
function hideEverythingExceptContent() {
  const children = Array.from(document.body.children);

  for (const child of children) {
    // Never hide the NeuroAdapt widget
    if (isNeuroAdaptElement(child)) continue;

    // Never hide the focus overlay we just created
    if (child === focusOverlay) continue;

    // Never hide injected style tags
    if (child.tagName === 'STYLE' || child.tagName === 'LINK') continue;
    if (child.tagName === 'SCRIPT') continue;

    // Store original display value
    const originalDisplay = child.style.display;
    hiddenElementsMap.set(child, originalDisplay);

    child.style.display = 'none';
  }
}

/**
 * Restores all hidden elements to their original `display` values and clears
 * the map.
 */
function restoreHiddenElements() {
  for (const [element, originalDisplay] of hiddenElementsMap) {
    try {
      element.style.display = originalDisplay;
    } catch (err) {
      console.warn('[NeuroAdapt] Could not restore element display:', err);
    }
  }
  hiddenElementsMap.clear();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enables Focus Mode.
 *
 * Flow:
 *   1. Detect main content via `findMainContent()`
 *   2. Clone the content into a fullscreen overlay
 *   3. Hide everything else on the page
 *   4. Apply the requested theme and typography
 *   5. Optionally inject OpenDyslexic font
 *
 * @param {string} [theme='light']    – 'light' | 'dark' | 'yellow' | 'cream'
 * @param {Object} [options={}]       – additional options
 * @param {string} [options.fontFamily='default'] – 'default' | 'openDyslexic'
 * @param {number} [options.fontSize=18]          – base font size in px
 */
export function enableFocusMode(theme = 'light', options = {}) {
  if (isFocusModeEnabled) {
    return;
  }

  const { fontFamily = 'default', fontSize = 18 } = options;

  // 1. Find content
  const contentNode = findMainContent();
  if (!contentNode) {
    console.warn('[NeuroAdapt] Could not detect main content area.');
    return;
  }

  originalContentNode = contentNode;

  // 2. Create the overlay
  focusOverlay = document.createElement('div');
  focusOverlay.className = 'neuroadapt-focus-overlay';
  focusOverlay.id = 'neuroadapt-focus-overlay';

  // 3. Clone content into an accessible container
  const contentContainer = document.createElement('div');
  contentContainer.className = 'neuroadapt-focus-content';

  if (fontFamily === 'openDyslexic') {
    contentContainer.classList.add('neuroadapt-font-dyslexic');
  }

  contentContainer.style.fontSize = `${fontSize}px`;

  // Deep-clone the detected content so we don't destroy the original DOM
  const clonedContent = contentNode.cloneNode(true);
  contentContainer.appendChild(clonedContent);

  focusOverlay.appendChild(contentContainer);

  // 4. Inject into the page
  document.body.appendChild(focusOverlay);

  // 5. Hide everything else
  hideEverythingExceptContent();

  // 6. Apply theme
  applyTheme(theme);

  isFocusModeEnabled = true;
}

/**
 * Disables Focus Mode and restores the page to its exact original state.
 *
 * Steps:
 *   1. Restore all hidden elements' `display` values
 *   2. Remove the focus overlay from the DOM
 *   3. Remove injected theme and font style tags
 *   4. Clear all stored state
 */
export function disableFocusMode() {
  if (!isFocusModeEnabled) {
    return;
  }

  // 1. Restore hidden elements
  restoreHiddenElements();

  // 2. Remove overlay
  if (focusOverlay && focusOverlay.parentNode) {
    focusOverlay.parentNode.removeChild(focusOverlay);
  }
  focusOverlay = null;

  // 3. Remove theme styles
  if (themeStyleTag && themeStyleTag.parentNode) {
    themeStyleTag.parentNode.removeChild(themeStyleTag);
  }
  themeStyleTag = null;

  // 4. Clear state
  originalContentNode = null;
  isFocusModeEnabled = false;
}

/**
 * Returns whether focus mode is currently active.
 * @returns {boolean}
 */
export function isFocusActive() {
  return isFocusModeEnabled;
}

/**
 * Live-updates the Focus Mode theme without rescanning the DOM.
 * @param {string} themeName
 */
export function updateFocusTheme(themeName) {
  if (isFocusModeEnabled) {
    applyTheme(themeName);
  }
}

/**
 * Live-updates the Focus Mode font size.
 * @param {number} fontSize
 */
export function updateFocusFontSize(fontSize) {
  if (isFocusModeEnabled && focusOverlay) {
    const contentContainer = focusOverlay.querySelector('.neuroadapt-focus-content');
    if (contentContainer) {
      contentContainer.style.fontSize = `${fontSize}px`;
    }
  }
}
