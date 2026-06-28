/**
 * @file dashboard/src/components/account/QuickActions.jsx
 * @description Quick Actions card.
 *
 * "Open Extension" uses a robust postMessage relay architecture:
 *
 *   Dashboard page
 *     │  window.postMessage('NEUROADAPT_PING')
 *     ↓
 *   Content Script (already injected by the extension on all pages)
 *     │  responds with window.postMessage('NEUROADAPT_PONG')  → extension is installed
 *     │  or no response within 600 ms                         → extension not installed
 *     │
 *     │  window.postMessage('NEUROADAPT_OPEN_EXTENSION')
 *     ↓
 *   Content Script → chrome.runtime.sendMessage('OPEN_EXTENSION_UI')
 *     ↓
 *   Service Worker
 *     1. Try chrome.action.openPopup()   (Chrome 99+, works with focused window)
 *     2. Fallback: chrome.tabs.create()  (opens popup as a standalone tab)
 *
 * No extension ID is ever hardcoded anywhere.
 */

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ─── Icons ────────────────────────────────────────────────────────────────────

const ExtIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
);

const A11yIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
);

const ExportIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2v13M5 9l7 7 7-7"/>
    <path d="M3 20h18"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

// ─── Extension detection via postMessage ping ─────────────────────────────────

const PING_TIMEOUT_MS = 700;

/**
 * Sends a NEUROADAPT_PING via window.postMessage and waits for a
 * NEUROADAPT_PONG from the content script. Resolves with true/false.
 * Never rejects — Chrome API errors are handled gracefully.
 */
function detectExtension() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onPong);
      resolve(false);
    }, PING_TIMEOUT_MS);

    function onPong(event) {
      if (event.source !== window || event.data?.type !== "NEUROADAPT_PONG") return;
      clearTimeout(timer);
      window.removeEventListener("message", onPong);
      resolve(true);
    }

    window.addEventListener("message", onPong);
    window.postMessage({ type: "NEUROADAPT_PING" }, "*");
  });
}

/**
 * Tells the content script to ask the service worker to open the extension UI.
 * Returns a promise that resolves when the content script relays the result
 * (or rejects after a timeout).
 */
function requestOpenExtension() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onResult);
      resolve({ success: false, method: "timeout" });
    }, 3000);

    function onResult(event) {
      if (event.source !== window || event.data?.type !== "NEUROADAPT_OPEN_EXTENSION_RESULT") return;
      clearTimeout(timer);
      window.removeEventListener("message", onResult);
      resolve(event.data);
    }

    window.addEventListener("message", onResult);
    window.postMessage({ type: "NEUROADAPT_OPEN_EXTENSION" }, "*");
  });
}

// ─── "Not installed" modal ────────────────────────────────────────────────────

const NotInstalledModal = ({ onClose }) => (
  <AnimatePresence>
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.93, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 12 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-strong rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center"
        role="dialog"
        aria-modal="true"
        aria-label="Extension not installed"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center mx-auto mb-5">
          <ExtIcon />
        </div>

        <h2 className="text-lg font-bold text-primary mb-2">Extension Not Installed</h2>
        <p className="text-sm text-secondary mb-6 leading-relaxed">
          The <strong>NeuroAdapt</strong> Chrome extension is not installed or not active on this page. Install it to get AI-powered accessibility features everywhere you browse.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            style={{ background: "var(--color-brand)" }}
          >
            <ExtIcon />
            Install Extension
          </a>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-semibold text-secondary border border-strong rounded-xl hover:bg-bg transition-colors duration-150"
          >
            Cancel
          </button>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-primary p-1.5 rounded-lg hover:bg-bg transition-colors"
          aria-label="Close"
        >
          <XIcon />
        </button>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// ─── Action button ────────────────────────────────────────────────────────────

const ActionButton = ({ icon: Icon, label, onClick, disabled, title, loading }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled || loading}
    title={title}
    whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
    className={[
      "flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all duration-200 text-center w-full h-full",
      disabled
        ? "border-strong bg-surface text-muted/60 opacity-60 cursor-not-allowed"
        : "border-strong bg-surface hover:border-brand/30 hover:bg-brand/5 hover:-translate-y-0.5 hover:shadow-sm text-secondary hover:text-brand",
    ].join(" ")}
  >
    <span className={disabled ? "text-muted" : "text-brand"}>
      {loading ? <SpinnerIcon /> : <Icon />}
    </span>
    <span className="text-xs font-medium leading-snug">{label}</span>
  </motion.button>
);

// ─── Component ────────────────────────────────────────────────────────────────

const QuickActions = () => {
  const navigate = useNavigate();

  const [extLoading,     setExtLoading]     = useState(false);
  const [showNotInstalled, setShowNotInstalled] = useState(false);

  /**
   * "Open Extension" click handler.
   *
   * Flow:
   *  1. Ping the content script to detect whether the extension is installed.
   *  2a. Extension present → ask it to open the popup/options page.
   *  2b. Extension absent  → show "not installed" modal.
   *
   * Never uses a hardcoded extension ID.
   * All communication is via window.postMessage (content-script relay).
   */
  const handleOpenExtension = useCallback(async () => {
    if (extLoading) return;
    setExtLoading(true);

    try {
      const installed = await detectExtension();

      if (!installed) {
        setShowNotInstalled(true);
        return;
      }

      // Extension is installed — ask it to open its UI
      const result = await requestOpenExtension();

      if (!result.success) {
        // Service worker couldn't open the UI — show a console hint only
        console.info(
          "[NeuroAdapt] Could not open the extension popup automatically. " +
          "Click the NeuroAdapt icon in your browser toolbar instead."
        );
      }
    } catch (err) {
      // Swallow gracefully — no console errors exposed to the user
      console.warn("[NeuroAdapt] Extension open flow error:", err);
    } finally {
      setExtLoading(false);
    }
  }, [extLoading]);

  return (
    <>
      {showNotInstalled && (
        <NotInstalledModal onClose={() => setShowNotInstalled(false)} />
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-surface border border-strong rounded-2xl p-6 sm:p-8 h-full flex flex-col justify-center"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center flex-shrink-0">
            <ZapIcon />
          </div>
          <h2 className="text-base font-semibold text-primary">Quick Actions</h2>
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 flex-1">
          {/* ✅ Functional */}
          <ActionButton
            icon={ExtIcon}
            label={extLoading ? "Opening…" : "Open Extension"}
            onClick={handleOpenExtension}
            loading={extLoading}
            title="Open the NeuroAdapt Chrome extension"
          />
          <ActionButton
            icon={A11yIcon}
            label="Accessibility Settings"
            onClick={() => navigate("/preferences")}
            title="Go to accessibility preferences"
          />

          {/* 🚧 Coming soon */}
          <ActionButton
            icon={ExportIcon}
            label="Export Preferences"
            disabled
            title="Export preferences — coming soon"
            // TODO: Implement preference export (JSON download) when backend supports it
          />
          <ActionButton
            icon={DownloadIcon}
            label="Download Account Data"
            disabled
            title="Download account data — coming soon"
            // TODO: Implement GDPR data export endpoint when backend supports it
          />
          <ActionButton
            icon={HelpIcon}
            label="Help Center"
            disabled
            title="Help center — coming soon"
            // TODO: Link to docs/help site when available
          />
        </div>
      </motion.div>
    </>
  );
};

export default QuickActions;
