/**
 * NeuroAdapt — Bionic Reading Mode (T-2.4)
 *
 * Applies "bionic reading" to every visible text node on the page by bolding
 * the first ~45 % of each word.  Uses a TreeWalker for efficient DOM traversal
 * and stores originals so the effect can be fully reversed.
 *
 * Exports:
 *   enableBionicMode()   – activate bionic reading
 *   disableBionicMode()  – restore the page to its original state
 */

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** @type {Array<{original: Text, parent: Node, wrapper: HTMLSpanElement}>} */
const processedNodes = [];

let isBionicEnabled = false;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Parent tags whose children must never be processed.
 * Upper-cased for case-insensitive comparison with Element.tagName.
 */
const BANNED_PARENT_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT',
  'CODE', 'PRE', 'SVG', 'BUTTON',
]);

/** Fraction of each word to bold. */
const BOLD_RATIO = 0.45;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when `node` (or any ancestor) lives inside an element we
 * must not touch — extension UI, banned tags, content-editable areas, or
 * elements that are hidden / invisible.
 *
 * @param {Node} node
 * @returns {boolean}
 */
function shouldSkipNode(node) {
  let el = node.parentElement;

  while (el) {
    // 1. Banned tag
    if (BANNED_PARENT_TAGS.has(el.tagName)) {
      return true;
    }

    // 2. Content-editable region
    if (el.isContentEditable) {
      return true;
    }

    // 3. NeuroAdapt's own UI (any class starting with "neuroadapt-")
    if (
      typeof el.className === 'string' &&
      el.className.split(/\s+/).some((c) => c.startsWith('neuroadapt-'))
    ) {
      return true;
    }

    // 4. Hidden / invisible elements — skip to avoid processing off-screen text
    try {
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        return true;
      }
    } catch (_) {
      /* getComputedStyle can throw on detached nodes — skip them too */
      return true;
    }

    el = el.parentElement;
  }

  return false;
}

/**
 * Takes a single Text node and replaces it with a wrapper `<span>` whose
 * children are:
 *   • `<b class="neuroadapt-bionic">` containing the first ~45 % of each word
 *   • a plain Text node with the remainder
 *
 * Whitespace-only tokens are preserved as-is so spacing/layout is unchanged.
 *
 * @param {Text} node
 */
function processTextNode(node) {
  if (shouldSkipNode(node)) {
    return;
  }

  const text = node.textContent;

  // Split into words and whitespace, keeping delimiters
  const tokens = text.split(/(\s+)/);

  // If there are no real words, bail out
  if (tokens.every((t) => t.trim() === '')) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const token of tokens) {
    if (token.trim().length > 0) {
      // It's a word → bold the first portion
      const boldCount = Math.ceil(token.length * BOLD_RATIO);
      const boldPart  = token.slice(0, boldCount);
      const normalPart = token.slice(boldCount);

      const b = document.createElement('b');
      b.className = 'neuroadapt-bionic';
      b.textContent = boldPart;

      fragment.appendChild(b);
      if (normalPart) {
        fragment.appendChild(document.createTextNode(normalPart));
      }
    } else {
      // Whitespace — preserve verbatim
      fragment.appendChild(document.createTextNode(token));
    }
  }

  // Wrap the fragment in a span so we have a single element to swap back later
  const wrapper = document.createElement('span');
  wrapper.className = 'neuroadapt-bionic-wrapper';
  wrapper.appendChild(fragment);

  // Store info for undo
  processedNodes.push({
    original: node,
    parent: node.parentNode,
    wrapper,
  });

  node.parentNode.replaceChild(wrapper, node);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enables Bionic Reading on the current page.
 *
 * 1. Creates a TreeWalker over all SHOW_TEXT nodes.
 * 2. Collects them first (the DOM is live — modifying while walking is unsafe).
 * 3. Processes each text node, replacing it with bionic-styled HTML.
 */
export function enableBionicMode() {
  if (isBionicEnabled) {
    return;
  }

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Quick reject: empty / whitespace-only
        if (!node.nodeValue || node.nodeValue.trim() === '') {
          return NodeFilter.FILTER_REJECT;
        }
        // Quick reject: obvious banned parents
        const parentTag = node.parentNode && node.parentNode.tagName;
        if (parentTag && BANNED_PARENT_TAGS.has(parentTag)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  // Collect first, process second — avoids mutating the tree mid-walk
  const nodes = [];
  let current;
  while ((current = walker.nextNode())) {
    nodes.push(current);
  }

  nodes.forEach(processTextNode);

  isBionicEnabled = true;
}

/**
 * Disables Bionic Reading, restoring every processed node to its original
 * Text node.  Clears the internal store so the cycle can repeat cleanly.
 */
export function disableBionicMode() {
  if (!isBionicEnabled) {
    return;
  }

  for (const { original, parent, wrapper } of processedNodes) {
    try {
      // The wrapper may have been removed by the site's own scripts
      if (wrapper.parentNode) {
        wrapper.parentNode.replaceChild(original, wrapper);
      } else if (parent && parent.isConnected) {
        // Fallback — try inserting back under original parent
        parent.appendChild(original);
      }
    } catch (err) {
      console.warn('[NeuroAdapt] Could not restore node:', err);
    }
  }

  // Memory cleanup
  processedNodes.length = 0;
  isBionicEnabled = false;
}