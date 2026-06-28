/**
 * NeuroAdapt — Text Simplification (T-2.6)
 *
 * Implements the core AI workflow:
 *   1. User highlights text on any webpage
 *   2. User clicks "Simplify Selection" in the widget
 *   3. The selected text + DOM Range are captured
 *   4. Text is sent to the backend via the service worker
 *   5. The original selection is replaced in-place with simplified text
 *   6. A "Show Original" button enables undo
 *
 * Exports:
 *   handleSimplifySelection()  – main entry point (called on button click)
 */

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/**
 * Stores every active simplification so each can be independently undone.
 * Key:   a unique numeric ID
 * Value: { id, originalContents, wrapperSpan, parentNode }
 *
 * @type {Map<number, Object>}
 */
const activeSimplifications = new Map();

/** Auto-incrementing ID for simplification entries. */
let nextSimplificationId = 0;

/** Prevents overlapping requests when one is already in flight. */
let isRequestInFlight = false;

/** Default simplification level sent to the backend. */
const DEFAULT_LEVEL = 'standard';

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

/** Duration (ms) before a toast auto-dismisses. */
const TOAST_DURATION = 3000;

/**
 * Shows a lightweight toast notification anchored to the bottom-left of the
 * viewport.  Auto-dismisses after `TOAST_DURATION` ms.
 *
 * @param {string} message – plain-text message to display
 * @param {'info'|'error'|'success'} [type='info'] – visual variant
 */
function showToast(message, type = 'info') {
  // Remove any existing toast to avoid stacking
  const existing = document.getElementById('neuroadapt-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'neuroadapt-toast';
  toast.className = `neuroadapt-toast neuroadapt-toast--${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  document.body.appendChild(toast);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => {
    toast.classList.add('neuroadapt-toast--visible');
  });

  setTimeout(() => {
    toast.classList.remove('neuroadapt-toast--visible');
    // Wait for fade-out transition before removing from DOM
    setTimeout(() => toast.remove(), 300);
  }, TOAST_DURATION);
}

// ---------------------------------------------------------------------------
// Selection helpers
// ---------------------------------------------------------------------------

/**
 * Captures the current user selection and validates it.
 *
 * @returns {{ text: string, range: Range } | null}
 *   The selected plain text and the live DOM Range, or null if invalid.
 */
function captureSelection() {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const text = selection.toString().trim();
  if (!text) {
    return null;
  }

  // Clone the range so we hold a stable reference even if the user clicks away
  const range = selection.getRangeAt(0).cloneRange();

  return { text, range };
}

// ---------------------------------------------------------------------------
// DOM replacement & undo
// ---------------------------------------------------------------------------

/**
 * Replaces the DOM content inside `range` with the simplified text, wrapped
 * in a highlighted `<span>`, and appends a "Show Original" undo button.
 *
 * The original contents are extracted (not deleted) so they can be restored.
 *
 * @param {Range}  range          – the DOM range to replace
 * @param {string} simplifiedText – plain text from the backend (treated as
 *                                  text, never injected as raw HTML for XSS
 *                                  safety)
 */
function replaceSelectionWithSimplified(range, simplifiedText) {
  const id = nextSimplificationId++;

  // ---- 1. Extract original contents (removes them from the DOM) ----
  const originalContents = range.extractContents();

  // ---- 2. Build the simplified wrapper ----
  const wrapper = document.createElement('span');
  wrapper.className = 'neuroadapt-simplified';
  wrapper.setAttribute('data-neuroadapt-id', String(id));

  // SECURITY: treat AI response as plain text — never innerHTML
  const simplifiedNode = document.createTextNode(simplifiedText);
  wrapper.appendChild(simplifiedNode);

  // ---- 3. Build the "Show Original" undo button ----
  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'neuroadapt-undo-btn';
  undoBtn.textContent = 'Show Original';
  undoBtn.setAttribute('aria-label', 'Restore original text');
  undoBtn.addEventListener('click', () => restoreOriginal(id));

  // ---- 4. Assemble & insert ----
  const container = document.createElement('span');
  container.className = 'neuroadapt-simplify-container';
  container.setAttribute('data-neuroadapt-container-id', String(id));
  container.appendChild(wrapper);
  container.appendChild(undoBtn);

  range.insertNode(container);

  // ---- 5. Store for undo ----
  activeSimplifications.set(id, {
    id,
    originalContents,
    container,
    parentNode: container.parentNode,
  });

  // Clear the browser selection so the highlight doesn't linger
  window.getSelection()?.removeAllRanges();
}

/**
 * Restores the original content for a given simplification ID.
 *
 * @param {number} id – the simplification entry to undo
 */
function restoreOriginal(id) {
  const entry = activeSimplifications.get(id);
  if (!entry) {
    showToast('Content could not be restored.', 'error');
    return;
  }

  const { originalContents, container, parentNode } = entry;

  try {
    if (container.parentNode) {
      // Replace the simplified container with the original fragment
      container.parentNode.replaceChild(originalContents, container);
    } else if (parentNode && parentNode.isConnected) {
      parentNode.appendChild(originalContents);
    } else {
      showToast('Content could not be restored.', 'error');
    }
  } catch (err) {
    console.warn('[NeuroAdapt] Undo failed:', err);
    showToast('Content could not be restored.', 'error');
  }

  // Cleanup
  activeSimplifications.delete(id);
}

// ---------------------------------------------------------------------------
// Service worker communication
// ---------------------------------------------------------------------------

/**
 * Sends the selected text to the service worker for backend simplification.
 *
 * @param {string} text – the user-selected text
 * @returns {Promise<{ simplifiedText: string }>}
 * @throws {Error} on network failure, timeout, or backend error
 */
async function requestSimplification(text) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timed out.'));
    }, 30000); // 30 s timeout

    try {
      chrome.runtime.sendMessage(
        {
          type: 'SIMPLIFY',
          text,
          level: DEFAULT_LEVEL,
          hostname: window.location.hostname,
        },
        (response) => {
          clearTimeout(timeoutId);

          // chrome.runtime.lastError fires when the port closes unexpectedly
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response) {
            reject(new Error('No response from service worker.'));
            return;
          }

          if (response.error) {
            reject(new Error(response.message || 'Unable to simplify text.'));
            return;
          }

          if (!response.simplifiedText) {
            reject(new Error('Empty AI response.'));
            return;
          }

          resolve(response);
        },
      );
    } catch (err) {
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// Widget button state helpers
// ---------------------------------------------------------------------------

/**
 * Updates the Simplify button text and disabled state in the widget.
 *
 * @param {'idle'|'loading'} state
 */
function setSimplifyButtonState(state) {
  const btn = document.getElementById('neuroadapt-simplify-btn');
  if (!btn) return;

  if (state === 'loading') {
    btn.textContent = '⏳ Simplifying…';
    btn.disabled = true;
    btn.classList.add('neuroadapt-button--loading');
  } else {
    btn.textContent = 'Simplify Selection';
    btn.disabled = false;
    btn.classList.remove('neuroadapt-button--loading');
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main entry point — called when the user clicks "Simplify Selection".
 *
 * Flow:
 *   1. Validate selection
 *   2. Capture text + range
 *   3. Show loading state
 *   4. Send to backend via service worker
 *   5. Replace DOM on success
 *   6. Show undo affordance
 *
 * Errors at any stage surface as a toast and restore the button state.
 */
export async function handleSimplifySelection() {
  // ---- Guard: duplicate request ----
  if (isRequestInFlight) {
    return;
  }

  // ---- 1. Capture selection ----
  const captured = captureSelection();
  if (!captured) {
    showToast('Please highlight some text first.', 'info');
    return;
  }

  const { text, range } = captured;

  // ---- 2. Loading state ----
  isRequestInFlight = true;
  setSimplifyButtonState('loading');

  try {
    // ---- 3. Send to service worker → backend ----
    const response = await requestSimplification(text);

    // ---- 4. Validate range is still valid ----
    // The user might have navigated away or the DOM changed
    try {
      // If the range's common ancestor is detached, this will throw
      range.commonAncestorContainer; // eslint-disable-line no-unused-expressions
    } catch (_) {
      showToast('Selection was lost before the response arrived.', 'error');
      return;
    }

    // ---- 5. Replace in DOM ----
    replaceSelectionWithSimplified(range, response.simplifiedText);

    // ---- 6. Success feedback ----
    showToast('Text simplified. Click "Show Original" to undo.', 'success');
  } catch (err) {
    console.error('[NeuroAdapt] Simplification failed:', err);

    if (err.message.includes('timed out')) {
      showToast('Request timed out.', 'error');
    } else {
      showToast(err.message || 'Unable to simplify text.', 'error');
    }
  } finally {
    // ---- Restore button ----
    isRequestInFlight = false;
    setSimplifyButtonState('idle');
  }
}
