/**
 * @file dashboard/src/pages/Preferences.jsx
 * @description Premium accessibility preferences page with live preview panels.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PreferenceCard, { Toggle, Select, RangeSlider } from "../components/PreferenceCard";
import { getProfile, updateProfile, MOCK_PROFILE } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

// ─── Live Preview Components ──────────────────────────────────────────────────

const BionicPreview = ({ enabled }) => {
  const text = "The quick brown fox jumps over the lazy dog near the riverbank.";
  const bionicText = text.split(" ").map((word, i) => {
    const boldLen = Math.ceil(word.length * 0.45);
    return (
      <span key={i}>
        {i > 0 && " "}
        {enabled ? (
          <>
            <span className="font-bold text-primary">{word.slice(0, boldLen)}</span>
            <span className="text-muted">{word.slice(boldLen)}</span>
          </>
        ) : (
          <span className="text-secondary">{word}</span>
        )}
      </span>
    );
  });

  return (
    <motion.div layout className="mt-4 p-4 rounded-xl bg-bg border border-strong">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${enabled ? "bg-emerald-400" : "bg-slate-600"}`} />
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {enabled ? "Bionic Preview" : "Normal Preview"}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{bionicText}</p>
    </motion.div>
  );
};

const FontPreview = ({ fontFamily, fontSize, lineSpacing }) => {
  const fontClass = fontFamily === "openDyslexic" ? "font-[OpenDyslexic]" : "";
  return (
    <motion.div layout className="mt-4 p-4 rounded-xl bg-bg border border-strong">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Font Preview</span>
      </div>
      <p
        className={`text-secondary ${fontClass}`}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: lineSpacing,
          fontFamily: fontFamily === "openDyslexic" ? "'OpenDyslexic', sans-serif" : "inherit",
        }}
      >
        Reading made accessible. Every word matters, and every reader deserves clarity.
      </p>
    </motion.div>
  );
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function Preferences() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const { setTheme } = useTheme();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getProfile();
        console.log("GET /api/profile response:", data);
        
        // The backend returns { success: true, user: { preferences: {...} } }
        const loadedPrefs = data?.user?.preferences || data?.preferences || MOCK_PROFILE.preferences;
        console.log("Preferences state after loading:", loadedPrefs);
        
        if (mounted) setPrefs(loadedPrefs);
      } catch (err) {
        console.error("GET /api/profile failed:", err);
        if (mounted) setPrefs(MOCK_PROFILE.preferences);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading || !prefs) return;
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    const handler = setTimeout(async () => {
      setSaving(true);
      try {
        console.log("PUT /api/profile request payload:", { preferences: prefs });
        const response = await updateProfile({ preferences: prefs });
        console.log("PUT /api/profile response:", response);
        
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err) { 
        console.error("PUT /api/profile failed:", err);
        setSaveStatus("error"); 
      }
      finally { setSaving(false); }
    }, 500);
    return () => clearTimeout(handler);
  }, [prefs, loading]);

  const update = useCallback((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (loading || !prefs) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="skeleton h-8 w-64 rounded mb-2" />
        <div className="skeleton h-4 w-48 rounded mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-[76px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Accessibility Settings</h1>
          <p className="text-muted text-sm mt-1">Customize your reading experience. Changes save automatically.</p>
        </div>

        {/* Save Indicator */}
        <AnimatePresence mode="wait">
          {saveStatus === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-emerald-500/15 text-emerald-400 text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Saved
            </motion.div>
          )}
          {saveStatus === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-red-500/15 text-red-400 text-sm font-medium px-4 py-2 rounded-xl border border-red-500/20"
            >
              Error saving
            </motion.div>
          )}
          {saving && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-muted text-sm font-medium flex items-center gap-2"
            >
              <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
              Saving...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Section 1: AI Features ── */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 ml-1">
          AI Features
        </h2>
        <div className="space-y-2">
          <PreferenceCard
            icon={() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
            label="Simplification Level"
            description="How aggressively AI simplifies content"
          >
            <Select
              id="pref-simplificationLevel"
              value={prefs.simplificationLevel}
              onChange={(v) => update("simplificationLevel", v)}
              options={[
                { value: "basic", label: "Basic — Simple" },
                { value: "standard", label: "Standard — Balanced" },
                { value: "academic", label: "Academic — Full context" },
              ]}
            />
          </PreferenceCard>

          <PreferenceCard
            icon={() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>}
            label="Bionic Reading"
            description="Bold first syllables to accelerate reading"
            active={prefs.bionicModeEnabled}
          >
            <Toggle id="pref-bionicMode" checked={prefs.bionicModeEnabled} onChange={(v) => update("bionicModeEnabled", v)} />
          </PreferenceCard>

          {/* Live Preview for Bionic */}
          <BionicPreview enabled={prefs.bionicModeEnabled} />

          <PreferenceCard
            icon={() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>}
            label="Focus Mode"
            description="Remove distractions and dim background elements"
            active={prefs.focusModeEnabled}
          >
            <Toggle id="pref-focusMode" checked={prefs.focusModeEnabled} onChange={(v) => update("focusModeEnabled", v)} />
          </PreferenceCard>
        </div>
      </div>

      {/* ── Section 2: Display & Typography ── */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 ml-1">
          Display & Typography
        </h2>
        <div className="space-y-2">
          <PreferenceCard
            icon={() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>}
            label="Font Family"
            description="Choose a dyslexia-friendly font"
          >
            <Select
              id="pref-fontFamily"
              value={prefs.fontFamily}
              onChange={(v) => update("fontFamily", v)}
              options={[
                { value: "default", label: "System Default" },
                { value: "openDyslexic", label: "OpenDyslexic" },
              ]}
            />
          </PreferenceCard>

          <PreferenceCard
            icon={() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg>}
            label="Font Size"
            description="Base text size"
          >
            <RangeSlider id="pref-fontSize" min={14} max={24} step={1} unit="px" value={prefs.fontSize} onChange={(v) => update("fontSize", v)} />
          </PreferenceCard>

          <PreferenceCard
            icon={() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="12" x2="3" y2="12" /><line x1="21" y1="18" x2="3" y2="18" /></svg>}
            label="Line Spacing"
            description="Space between lines"
          >
            <RangeSlider id="pref-lineSpacing" min={1.2} max={2.2} step={0.1} unit="×" value={prefs.lineSpacing} onChange={(v) => update("lineSpacing", v)} />
          </PreferenceCard>

          {/* Live Font Preview */}
          <FontPreview fontFamily={prefs.fontFamily} fontSize={prefs.fontSize} lineSpacing={prefs.lineSpacing} />
        </div>
      </div>

      {/* ── Section 3: Color Theme ── */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 ml-1">
          Color Theme
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { value: "light", label: "Light", icon: "☀️", bg: "bg-slate-100", border: "border-slate-300" },
            { value: "dark", label: "Dark", icon: "🌙", bg: "bg-surface", border: "border-strong" },
            { value: "yellow", label: "Yellow", icon: "◐", bg: "bg-yellow-100", border: "border-yellow-300" },
            { value: "cream", label: "Cream", icon: "☕", bg: "bg-orange-50", border: "border-orange-200" },
          ].map((theme) => {
            const isSelected = prefs.colorTheme === theme.value;
            return (
              <button
                key={theme.value}
                onClick={() => {
                  update("colorTheme", theme.value);
                  setTheme(theme.value);
                }}
                className={[
                  "relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  isSelected
                    ? "border-indigo-500 shadow-lg "
                    : `${theme.border} hover:border-slate-500`,
                  theme.bg,
                ].join(" ")}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}
                <span className="text-2xl">{theme.icon}</span>
                <span className={`text-sm font-semibold ${isSelected ? "text-brand" : "text-secondary"}`}>
                  {theme.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
