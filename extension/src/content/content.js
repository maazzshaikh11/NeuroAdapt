/**
 * NeuroAdapt — Content Script Entry Point (T-2.9 — Preference Sync)
 *
 * Bootstraps the floating widget and wires up event listeners for each
 * accessibility feature module.
 *
 * T-2.9 additions:
 *   • Loads preferences from chrome.storage.local on page load
 *   • Auto-applies saved settings (bionic, focus, font, font-size)
 *   • Listens for chrome.storage.onChanged for live sync when popup changes
 *   • Syncs widget button states to match stored preferences
 *
 * Features:
 *   T-2.3  Widget            → injectWidget()
 *   T-2.4  Bionic Reading    → enableBionicMode() / disableBionicMode()
 *   T-2.5  Focus Mode        → enableFocusMode()  / disableFocusMode()
 *   T-2.6  Simplify          → handleSimplifySelection()
 *   T-2.9  Preference Sync   → loadAndApplyPreferences() / onStorageChanged()
 */

import { injectWidget } from './widget';
import { enableBionicMode, disableBionicMode } from './bionicMode';
import { enableFocusMode, disableFocusMode, isFocusActive, updateFocusTheme, updateFocusFontSize } from './focusMode';
import { handleSimplifySelection } from './simplify';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'neuroadapt_prefs';

/** Default preferences — must match the popup's DEFAULT_PREFS exactly. */
const DEFAULT_PREFS = {
  bionicModeEnabled: false,
  focusModeEnabled: false,
  simplifyModeEnabled: false,
  fontFamily: 'default',
  simplificationLevel: 'standard',
  colorTheme: 'light',
  fontSize: 18,
};

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** Reference to the global OpenDyslexic <style> tag (outside Focus Mode). */
let globalFontStyleTag = null;

/** Reference to the global font-size <style> tag. */
let globalFontSizeStyleTag = null;

// ---------------------------------------------------------------------------
// Global OpenDyslexic font (works even when Focus Mode is OFF)
// ---------------------------------------------------------------------------

/**
 * Injects a @font-face for OpenDyslexic and applies it to the entire page body.
 */
function injectGlobalOpenDyslexic() {
  if (globalFontStyleTag) return; // already injected

  let fontUrl;
  try {
    fontUrl = chrome.runtime.getURL('fonts/OpenDyslexic-Regular.woff2');
  } catch (_) {
    console.warn('[NeuroAdapt] Could not resolve OpenDyslexic font URL.');
    return;
  }

  const css = `
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('${fontUrl}') format('woff2');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    body.neuroadapt-global-dyslexic,
    body.neuroadapt-global-dyslexic * {
      font-family: 'OpenDyslexic', sans-serif !important;
    }
  `;

  globalFontStyleTag = document.createElement('style');
  globalFontStyleTag.id = 'neuroadapt-global-font';
  globalFontStyleTag.textContent = css;
  document.head.appendChild(globalFontStyleTag);

  document.body.classList.add('neuroadapt-global-dyslexic');
}

/**
 * Removes the global OpenDyslexic font injection.
 */
function removeGlobalOpenDyslexic() {
  if (globalFontStyleTag && globalFontStyleTag.parentNode) {
    globalFontStyleTag.parentNode.removeChild(globalFontStyleTag);
    globalFontStyleTag = null;
  }
  document.body.classList.remove('neuroadapt-global-dyslexic');
}

// ---------------------------------------------------------------------------
// Global font-size
// ---------------------------------------------------------------------------

/**
 * Applies a custom base font size to the body.
 * @param {number} size – font size in px
 */
function applyGlobalFontSize(size) {
  if (!size || size === 18) {
    // Default — remove any override
    removeGlobalFontSize();
    return;
  }

  if (!globalFontSizeStyleTag) {
    globalFontSizeStyleTag = document.createElement('style');
    globalFontSizeStyleTag.id = 'neuroadapt-global-fontsize';
    document.head.appendChild(globalFontSizeStyleTag);
  }

  globalFontSizeStyleTag.textContent = `
    body {
      font-size: ${size}px !important;
    }
  `;
}

/**
 * Removes the custom font size override.
 */
function removeGlobalFontSize() {
  if (globalFontSizeStyleTag && globalFontSizeStyleTag.parentNode) {
    globalFontSizeStyleTag.parentNode.removeChild(globalFontSizeStyleTag);
    globalFontSizeStyleTag = null;
  }
}

// ---------------------------------------------------------------------------
// Widget button state helpers
// ---------------------------------------------------------------------------

/**
 * Updates a widget button's visual state to match the stored preference.
 *
 * @param {string}  btnId      – DOM id of the button
 * @param {string}  labelOn    – label when active
 * @param {string}  labelOff   – label when inactive
 * @param {boolean} isActive   – current state
 */
function syncWidgetButton(btnId, labelOn, labelOff, isActive) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.textContent = isActive ? labelOn : labelOff;
  btn.classList.toggle('neuroadapt-button--active', isActive);
  btn.setAttribute('aria-pressed', String(isActive));
}

// ---------------------------------------------------------------------------
// Preference application
// ---------------------------------------------------------------------------

/**
 * Applies a full set of preferences to the page.  Called on initial load
 * and on storage change.
 *
 * @param {Object} newPrefs – the incoming preference object
 */
function applyPreferences(newPrefs) {
  const prefs = { ...DEFAULT_PREFS, ...newPrefs };

  // ---- Bionic Mode ----
  if (prefs.bionicModeEnabled) {
    enableBionicMode();
  } else {
    disableBionicMode();
  }

  // ---- Focus Mode ----
  if (prefs.focusModeEnabled) {
    enableFocusMode(prefs.colorTheme || 'light', {
      fontFamily: prefs.fontFamily || 'default',
      fontSize: prefs.fontSize || 18,
    });
    // Update theme and font size instantly inside active Focus Mode
    updateFocusTheme(prefs.colorTheme || 'light');
    updateFocusFontSize(prefs.fontSize || 18);
  } else {
    disableFocusMode();
  }

  // ---- OpenDyslexic (global — works outside focus mode) ----
  if (prefs.fontFamily === 'openDyslexic') {
    injectGlobalOpenDyslexic();
  } else {
    removeGlobalOpenDyslexic();
  }

  // ---- Font size (global) ----
  applyGlobalFontSize(prefs.fontSize);
}

// ---------------------------------------------------------------------------
// Widget event handlers
// ---------------------------------------------------------------------------

/**
 * Toggles Bionic Reading Mode via the widget button.
 * Also saves the new state to chrome.storage.
 */
function handleBionicClick() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const prefs = result[STORAGE_KEY] || { ...DEFAULT_PREFS };
    prefs.bionicModeEnabled = !prefs.bionicModeEnabled;
    chrome.storage.local.set({ [STORAGE_KEY]: prefs });
  });
}

/**
 * Toggles Focus Mode via the widget button.
 * Also saves the new state to chrome.storage.
 */
function handleFocusClick() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const prefs = result[STORAGE_KEY] || { ...DEFAULT_PREFS };
    prefs.focusModeEnabled = !prefs.focusModeEnabled;
    chrome.storage.local.set({ [STORAGE_KEY]: prefs });
  });
}

/**
 * Handles the Simplify Selection button click.
 */
function handleSimplifyClick() {
  handleSimplifySelection();
}

/**
 * Toggles OpenDyslexic Font via the widget button.
 * Also saves the new state to chrome.storage.
 */
function handleOpenDyslexicClick() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const prefs = result[STORAGE_KEY] || { ...DEFAULT_PREFS };
    const isDyslexic = prefs.fontFamily === 'openDyslexic';
    prefs.fontFamily = isDyslexic ? 'default' : 'openDyslexic';
    chrome.storage.local.set({ [STORAGE_KEY]: prefs });
  });
}

// ---------------------------------------------------------------------------
// Storage change listener (live sync)
// ---------------------------------------------------------------------------

/**
 * Called by chrome.storage.onChanged when any storage key changes.
 * Only reacts to changes in `neuroadapt_prefs`.
 *
 * @param {Object} changes   – { key: { oldValue, newValue } }
 * @param {string} areaName  – 'local' | 'sync' | 'managed'
 */
function onStorageChanged(changes, areaName) {
  if (areaName !== 'local') return;
  if (!changes[STORAGE_KEY]) return;

  const newPrefs = changes[STORAGE_KEY].newValue;
  if (!newPrefs || typeof newPrefs !== 'object') return;

  applyPreferences(newPrefs);
}

// ---------------------------------------------------------------------------
// Initial preference loader
// ---------------------------------------------------------------------------

/**
 * Reads preferences from chrome.storage.local and applies them.
 * Called once on content script startup.
 */
function loadAndApplyPreferences() {
  try {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (chrome.runtime.lastError) {
        console.error('[NeuroAdapt] Failed to load preferences:', chrome.runtime.lastError);
        return;
      }

      const stored = result[STORAGE_KEY];
      if (stored && typeof stored === 'object') {
        applyPreferences(stored);
      }
    });
  } catch (err) {
    console.error('[NeuroAdapt] Error loading preferences:', err);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap (runs once per page)
// ---------------------------------------------------------------------------

if (!window.__neuroadaptInitialized) {
  window.__neuroadaptInitialized = true;

  // 1. Inject the floating widget
  injectWidget();

  // 2. Wire up widget button event listeners
  window.addEventListener('neuroadapt:bionic-click', handleBionicClick);
  window.addEventListener('neuroadapt:focus-click', handleFocusClick);
  window.addEventListener('neuroadapt:simplify-click', handleSimplifyClick);
  window.addEventListener('neuroadapt:opendyslexic-click', handleOpenDyslexicClick);

  // 3. Load and auto-apply saved preferences
  loadAndApplyPreferences();

  // 4. Register live storage change listener
  chrome.storage.onChanged.addListener(onStorageChanged);

  // 5. Auth sync + extension detection/control from Dashboard
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    const { type } = event.data;

    // ── Auth sync ──────────────────────────────────────────────────────────
    if (type === 'NEUROADAPT_AUTH_SYNC') {
      chrome.storage.local.set({
        neuroadapt_token: event.data.token,
        neuroadapt_user:  event.data.user,
      });

    } else if (type === 'NEUROADAPT_AUTH_LOGOUT') {
      chrome.storage.local.remove(['neuroadapt_token', 'neuroadapt_user']);

    // ── Presence ping — dashboard checks if extension is installed ──────────
    } else if (type === 'NEUROADAPT_PING') {
      window.postMessage({
        type:    'NEUROADAPT_PONG',
        version: chrome.runtime.getManifest().version,
        id:      chrome.runtime.id,
      }, '*');

    // ── Open extension popup/options page via service worker ──────────────
    } else if (type === 'NEUROADAPT_OPEN_EXTENSION') {
      chrome.runtime.sendMessage({ type: 'OPEN_EXTENSION_UI' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[NeuroAdapt] SW message error:', chrome.runtime.lastError.message);
        }
        // Relay result back to the dashboard page
        window.postMessage({
          type:    'NEUROADAPT_OPEN_EXTENSION_RESULT',
          success: response?.success ?? false,
          method:  response?.method  ?? 'unknown',
        }, '*');
      });
    }
  });
}
