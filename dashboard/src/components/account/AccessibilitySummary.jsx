/**
 * @file dashboard/src/components/account/AccessibilitySummary.jsx
 * @description Displays currently enabled accessibility preferences read
 *              directly from the already-fetched profile object.
 *              Footer button navigates to /preferences.
 */

import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ─── Icons ────────────────────────────────────────────────────────────────────

const AccessibilityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FONT_LABELS = {
  openDyslexic: "OpenDyslexic",
  inter: "Inter",
  atkinson: "Atkinson Hyperlegible",
  lexie: "Lexie Readable",
  default: "System Default",
};

const THEME_LABELS = {
  dark: "Dark",
  light: "Light",
  yellow: "High Contrast Yellow",
  cream: "Warm Cream",
  default: "Default",
};

const LEVEL_LABELS = {
  simple: "Simple",
  standard: "Standard",
  advanced: "Advanced",
  default: "Standard",
};

// Single preference item
const PrefItem = ({ label, value, indicator }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
    <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-2">
      {indicator}
      <span className="text-sm font-semibold text-primary">{value}</span>
    </div>
  </div>
);

// Enabled / Disabled pill
const StatusPill = ({ enabled }) => (
  <span
    className={[
      "text-xs font-semibold px-2 py-0.5 rounded-full",
      enabled
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "bg-surface text-muted border border-strong",
    ].join(" ")}
  >
    {enabled ? "Enabled" : "Disabled"}
  </span>
);

// ─── Component ────────────────────────────────────────────────────────────────

const AccessibilitySummary = ({ preferences = {} }) => {
  const navigate = useNavigate();

  const readingLevel = LEVEL_LABELS[preferences.simplificationLevel] ?? LEVEL_LABELS.default;
  const theme        = THEME_LABELS[preferences.colorTheme]          ?? THEME_LABELS.default;
  const font         = FONT_LABELS[preferences.fontFamily]           ?? FONT_LABELS.default;
  const bionicOn     = !!preferences.bionicModeEnabled;
  const focusOn      = !!preferences.focusModeEnabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      whileHover={{ boxShadow: "0 4px 20px rgba(27,107,90,0.08)" }}
      className="bg-surface border border-strong rounded-2xl p-6 sm:p-8 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center flex-shrink-0">
          <AccessibilityIcon />
        </div>
        <h2 className="text-base font-semibold text-primary">Accessibility Summary</h2>
      </div>

      {/* List */}
      <div className="space-y-5 flex-1">
        <PrefItem label="Reading Level" value={readingLevel} />
        <PrefItem label="Theme"         value={theme} />
        <PrefItem label="Bionic Reading" value="" indicator={<StatusPill enabled={bionicOn} />} />
        <PrefItem label="Focus Mode"    value="" indicator={<StatusPill enabled={focusOn} />} />
        <PrefItem label="Font"          value={font} />
      </div>

      {/* Footer CTA */}
      <div className="pt-6 mt-6 border-t border-strong">
        <button
          onClick={() => navigate("/preferences")}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-brand border border-brand/30 bg-brand-soft hover:bg-brand hover:text-white rounded-xl px-4 py-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Manage Accessibility
          <ArrowRightIcon />
        </button>
      </div>
    </motion.div>
  );
};

export default AccessibilitySummary;
