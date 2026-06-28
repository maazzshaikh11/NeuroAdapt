/**
 * NeuroAdapt — Service Worker (T-2.7)
 *
 * Centralized message router for all extension-to-backend communication.
 *
 * In Manifest V3, content scripts cannot directly call external APIs.
 * The service worker acts as the trusted bridge:
 *   1. Receives messages from content scripts via chrome.runtime.onMessage
 *   2. Reads the JWT from chrome.storage.local
 *   3. Calls the backend API (via the api.js Axios wrapper)
 *   4. Returns the response (or a standardised error) to the sender
 *
 * Supported message types:
 *   • SIMPLIFY      – POST /api/simplify
 *   • GET_PROFILE   – GET  /api/profile
 *   • UPDATE_PROFILE – PUT /api/profile   (future-ready)
 *   • GET_USAGE     – GET  /api/usage     (future-ready)
 *   • GET_ANALYTICS – GET  /api/analytics/overview
 *
 * Adding a new message type:
 *   1. Add a case to the `MESSAGE_HANDLERS` map
 *   2. Implement the handler function (async, returns a response object)
 */

import { simplifyText, getProfile, updateProfile, getAnalyticsOverview } from '../utils/api';

// ---------------------------------------------------------------------------
// Lifecycle events
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
});

chrome.runtime.onStartup.addListener(() => {
});

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

/**
 * Logs a message with a consistent prefix.  In production, flip `ENABLE_LOGS`
 * to false to silence debug output.
 */
const ENABLE_LOGS = false;

function log(...args) {
  if (ENABLE_LOGS) {
    console.log('[NeuroAdapt SW]', ...args);
  }
}

function logError(...args) {
  console.error('[NeuroAdapt SW]', ...args);
}

// ---------------------------------------------------------------------------
// Standard error shape
// ---------------------------------------------------------------------------

/**
 * Builds a standardised error response object.
 *
 * @param {string} code    – machine-readable error code
 * @param {string} message – human-readable explanation
 * @returns {{ error: true, code: string, message: string }}
 */
function errorResponse(code, message) {
  return { error: true, code, message };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Reads the JWT token from chrome.storage.local.
 *
 * @returns {Promise<string|null>}
 */
async function getToken() {
  try {
    const data = await chrome.storage.local.get('neuroadapt_token');
    return data.neuroadapt_token || null;
  } catch (err) {
    logError('Failed to read token:', err);
    return null;
  }
}

/**
 * Handles a 401 response: removes the stale token and broadcasts a
 * SESSION_EXPIRED message so the popup can react.
 */
async function handleAuthFailure() {
  try {
    await chrome.storage.local.remove('neuroadapt_token');
    log('Token removed after 401.');
  } catch (err) {
    logError('Failed to remove token:', err);
  }

  // Broadcast to all extension pages (popup, options, etc.)
  try {
    chrome.runtime.sendMessage({ type: 'SESSION_EXPIRED' }).catch(() => {
      // No listeners — that's fine
    });
  } catch (_) {
    // Swallow — there may be no listeners
  }
}

// ---------------------------------------------------------------------------
// HTTP error classifier
// ---------------------------------------------------------------------------

/**
 * Classifies an Axios error into a standardised response.
 *
 * @param {Error} err
 * @returns {{ error: true, code: string, message: string }}
 */
async function classifyError(err) {
  const status = err.response?.status;

  if (!status) {
    // Network / timeout
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return errorResponse('AI_TIMEOUT', 'The request took too long.');
    }
    return errorResponse('NETWORK_ERROR', 'Unable to reach the server.');
  }

  switch (status) {
    case 401:
      await handleAuthFailure();
      return errorResponse('AUTH_TOKEN_EXPIRED', 'Your session has expired.');
    case 403:
      return errorResponse('FORBIDDEN', 'You do not have permission.');
    case 404:
      return errorResponse('NOT_FOUND', 'The requested resource was not found.');
    case 429:
      return errorResponse('RATE_LIMITED', 'Too many requests. Please wait.');
    default:
      if (status >= 500) {
        return errorResponse('SERVER_ERROR', 'The server encountered an error.');
      }
      return errorResponse(
        'UNEXPECTED_ERROR',
        err.response?.data?.message || 'An unexpected error occurred.',
      );
  }
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

/**
 * Handles the SIMPLIFY message.
 *
 * @param {{ text: string, level?: string, hostname?: string }} payload
 * @returns {Promise<Object>}
 */
async function handleSimplify(payload) {
  const { text, level, hostname } = payload;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return errorResponse('INVALID_PAYLOAD', 'No text provided.');
  }

  log('SIMPLIFY request:', { textLength: text.length, level, hostname });

  const startMs = Date.now();

  try {
    const response = await simplifyText({ text, level, hostname });
    const latencyMs = Date.now() - startMs;
    const data = response.data;

    log('SIMPLIFY success:', { latencyMs, cacheHit: !!data.cacheHit });

    // Notify open popup (and other extension pages) to refetch live usage data.
    try {
      chrome.runtime.sendMessage({ type: 'USAGE_UPDATED' }).catch(() => {});
    } catch (_) {
      // No listeners — that's fine
    }

    return {
      success: true,
      simplifiedText: data.simplifiedText || data.simplified_text || data.text,
      cacheHit: !!data.cacheHit,
      latencyMs,
      dailyUsed: data.dailyUsed,
      dailyLimit: data.dailyLimit,
    };
  } catch (err) {
    logError('SIMPLIFY failed:', err.message);
    return classifyError(err);
  }
}

/**
 * Handles the GET_PROFILE message.
 *
 * @returns {Promise<Object>}
 */
async function handleGetProfile() {
  log('GET_PROFILE request');

  try {
    const response = await getProfile();
    log('GET_PROFILE success');
    return { success: true, user: response.data.user ?? response.data };
  } catch (err) {
    logError('GET_PROFILE failed:', err.message);
    return classifyError(err);
  }
}

/**
 * Handles the UPDATE_PROFILE message (future-ready).
 *
 * @param {{ data: Object }} payload
 * @returns {Promise<Object>}
 */
async function handleUpdateProfile(payload) {
  if (!payload.data || typeof payload.data !== 'object') {
    return errorResponse('INVALID_PAYLOAD', 'Profile data is required.');
  }

  log('UPDATE_PROFILE request');

  try {
    const response = await updateProfile(payload.data);
    log('UPDATE_PROFILE success');
    return {
      success: true,
      user: response.data.user ?? response.data,
      message: response.data.message,
    };
  } catch (err) {
    logError('UPDATE_PROFILE failed:', err.message);
    return classifyError(err);
  }
}

/**
 * Handles the GET_ANALYTICS message.
 *
 * @returns {Promise<Object>}
 */
async function handleGetAnalytics() {
  log('GET_ANALYTICS request');

  try {
    const response = await getAnalyticsOverview();
    log('GET_ANALYTICS success');
    return { success: true, analytics: response.data };
  } catch (err) {
    logError('GET_ANALYTICS failed:', err.message);
    return classifyError(err);
  }
}

/**
 * Handles the OPEN_EXTENSION_UI message sent from the Dashboard page
 * (relayed through the content script via window.postMessage).
 *
 * Chrome MV3 restricts programmatic popup opening to certain contexts.
 * Strategy:
 *   1. Try chrome.action.openPopup() — works only if a browser window is
 *      focused and Chrome version >= 99.
 *   2. Fallback: open the extension options page in a new tab.
 *   3. If both fail, fall back to focusing the active tab (no-op graceful).
 *
 * @returns {Promise<{ success: boolean, method: string }>}
 */
async function handleOpenExtensionUI() {
  log('OPEN_EXTENSION_UI request');

  // Strategy 1: openPopup (Chrome 99+ only, requires user gesture in context)
  if (chrome.action && typeof chrome.action.openPopup === 'function') {
    try {
      await chrome.action.openPopup();
      log('Opened popup via chrome.action.openPopup()');
      return { success: true, method: 'popup' };
    } catch (err) {
      log('openPopup failed (expected in non-user-gesture context):', err.message);
    }
  }

  // Strategy 2: Open the popup HTML as a standalone page in a new tab.
  // chrome.runtime.getURL() resolves to the extension's actual origin,
  // so no hardcoded ID is ever needed.
  try {
    const popupUrl = chrome.runtime.getURL('src/popup/index.html');
    await chrome.tabs.create({ url: popupUrl, active: true });
    log('Opened popup in new tab:', popupUrl);
    return { success: true, method: 'tab' };
  } catch (err) {
    logError('Failed to open popup in new tab:', err.message);
    return { success: false, method: 'failed' };
  }
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

/**
 * Map of message type → async handler function.
 * Adding a new type is a one-liner.
 */
const MESSAGE_HANDLERS = {
  SIMPLIFY:           handleSimplify,
  GET_PROFILE:        handleGetProfile,
  UPDATE_PROFILE:     handleUpdateProfile,
  GET_ANALYTICS:      handleGetAnalytics,
  OPEN_EXTENSION_UI:  handleOpenExtensionUI,
};

/**
 * Central message listener.
 *
 * IMPORTANT: We return `true` from the listener to signal Chrome that
 * sendResponse will be called asynchronously.  Without this, the message
 * port closes before the async handler can respond.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ---- Validate message shape ----
  if (!message || typeof message !== 'object' || !message.type) {
    sendResponse(
      errorResponse('INVALID_MESSAGE', 'Message must include a "type" field.'),
    );
    return false; // synchronous response, no need to keep port open
  }

  const handler = MESSAGE_HANDLERS[message.type];

  if (!handler) {
    log(`Unknown message type: ${message.type}`);
    sendResponse(
      errorResponse(
        'UNKNOWN_MESSAGE_TYPE',
        `Unsupported message type: "${message.type}".`,
      ),
    );
    return false;
  }

  // ---- Dispatch to the async handler ----
  log(`Routing message: ${message.type}`);

  handler(message)
    .then((result) => {
      sendResponse(result);
    })
    .catch((err) => {
      logError(`Unhandled error in ${message.type}:`, err);
      sendResponse(
        errorResponse('INTERNAL_ERROR', 'An unexpected error occurred.'),
      );
    });

  // CRITICAL: return true to keep the message port open for the async response
  return true;
});
