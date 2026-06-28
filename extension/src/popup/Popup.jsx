import React, { useState, useEffect, useCallback } from 'react';
import { usePreferences } from './hooks/usePreferences';
import { getProfile, getAnalyticsOverview } from '../utils/api';

export default function Popup() {
  const [prefs, updatePref, isLoading] = usePreferences();
  const [user, setUser] = useState(null);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(50);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const tokenData = await chrome.storage.local.get('neuroadapt_token');
      if (!tokenData.neuroadapt_token) {
        setUser(null);
        return;
      }

      const response = await getProfile();
      const profile = response.data?.user ?? response.data;
      if (profile) {
        setUser(profile);
        await chrome.storage.local.set({ neuroadapt_user: profile });
      }
    } catch {
      try {
        const cached = await chrome.storage.local.get('neuroadapt_user');
        if (cached.neuroadapt_user) {
          setUser(
            typeof cached.neuroadapt_user === 'string'
              ? JSON.parse(cached.neuroadapt_user)
              : cached.neuroadapt_user,
          );
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
  }, []);

  const fetchDashboardAnalytics = useCallback(async () => {
    try {
      const tokenData = await chrome.storage.local.get('neuroadapt_token');
      if (!tokenData.neuroadapt_token) {
        setDailyUsed(0);
        setDailyLimit(50);
        return;
      }

      const response = await getAnalyticsOverview();
      const analytics = response.data;
      const used = analytics.dailySimplificationCount ?? 0;
      const limit = analytics.dailyLimit ?? 50;
      setDailyUsed(used);
      setDailyLimit(limit);
    } catch {
      // Keep last known values on transient errors
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchDashboardAnalytics();

    // Remove legacy cached quota if present
    chrome.storage.local.remove('neuroadapt_quota');

    const onMessage = (message) => {
      if (message?.type === 'USAGE_UPDATED') {
        fetchDashboardAnalytics();
      }
      if (message?.type === 'SESSION_EXPIRED') {
        setUser(null);
        setDailyUsed(0);
        setDailyLimit(50);
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, [fetchCurrentUser, fetchDashboardAnalytics]);

  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    const detectPageTheme = () => {
      if (!chrome.tabs || !chrome.scripting) {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedTheme(prefs.appearance === 'auto' ? (isSystemDark ? 'light' : 'dark') : prefs.appearance);
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id || activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('about:')) {
          const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setResolvedTheme(prefs.appearance === 'auto' ? (isSystemDark ? 'light' : 'dark') : prefs.appearance);
          return;
        }

        chrome.scripting.executeScript(
          {
            target: { tabId: activeTab.id },
            func: () => {
              const getBgColor = () => {
                let el = document.body;
                while (el) {
                  const bg = window.getComputedStyle(el).backgroundColor;
                  if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
                    return bg;
                  }
                  el = el.parentElement;
                }
                return 'rgb(255, 255, 255)';
              };
              return {
                bgColor: getBgColor(),
                prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches
              };
            }
          },
          (results) => {
            let isDarkPage = false;
            if (results && results[0] && results[0].result) {
              const { bgColor, prefersDark } = results[0].result;
              const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
              if (match) {
                const r = parseInt(match[1], 10);
                const g = parseInt(match[2], 10);
                const b = parseInt(match[3], 10);
                const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
                if (a >= 0.1) {
                  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                  isDarkPage = brightness < 128;
                } else {
                  isDarkPage = prefersDark;
                }
              } else {
                isDarkPage = prefersDark;
              }
            } else {
              isDarkPage = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }

            if (prefs.appearance === "auto") {
              setResolvedTheme(
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? "dark"
                      : "light"
              );
            } else {
              setResolvedTheme(prefs.appearance);
          }
          }
        );
      });
    };

    if (prefs.appearance === 'auto') {
      detectPageTheme();
    } else {
      setResolvedTheme(prefs.appearance || 'light');
    }
  }, [prefs.appearance]);

  const handleToggle = (key, messageType) => (newValue) => {
    updatePref(key, newValue);
    try { chrome.runtime.sendMessage({ type: messageType, enabled: newValue }).catch(() => { }); } catch { }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-[380px] h-[520px] bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
  const quotaPercent = dailyLimit > 0
    ? Math.max(0, Math.min(100, (dailyRemaining / dailyLimit) * 100))
    : 0;

  return (
      <div
        className="neuroadapt-popup flex flex-col gap-6 w-[380px] bg-bg border border-border rounded-lg text-primary font-sans p-6"
        data-theme={resolvedTheme}
      >      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <img src="/logo.jpeg" alt="NeuroAdapt Logo" className="w-[40px] h-[40px] object-contain rounded-md shadow-sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-medium text-primary leading-tight">NeuroAdapt</span>
            <span className="text-[12px] text-muted leading-tight mt-0.5">AI accessibility</span>
          </div>
        </div>
        <button
          onClick={() => window.open(import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173", "_blank")}
          className="px-[14px] py-[6px] rounded-sm border border-brand bg-transparent text-brand text-[13px] font-medium hover:bg-brand-soft transition-colors"
        >
          {user ? 'Dashboard' : 'Sign in'}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Quick Actions Section ── */}
        <section>
          <div className="text-[11px] uppercase font-medium tracking-[0.04em] text-muted mb-2.5">Quick actions</div>

          {/* Primary Action Card: Simplify */}
          <button
            onClick={() => handleToggle('simplifyModeEnabled', 'TOGGLE_SIMPLIFY')(!prefs.simplifyModeEnabled)}
            className="w-full text-left bg-brand rounded-md py-[14px] px-4 flex items-center gap-3 mb-2.5 hover:bg-[#155847] active:scale-[0.98] transition-all"
          >
            <div className="w-[20px] h-[20px] flex items-center justify-center text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-medium text-white leading-tight">Simplify</span>
              <span className="text-[12px] text-[#CFE6DD] leading-tight mt-0.5">AI text simplification</span>
            </div>
            <div className="ml-auto">
              {prefs.simplifyModeEnabled && <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
            </div>
          </button>

          {/* Secondary Actions: Focus, Bionic, Dyslexia font */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'focusModeEnabled', msg: 'TOGGLE_FOCUS', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>, label: 'Focus' },
              { id: 'bionicModeEnabled', msg: 'TOGGLE_BIONIC', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>, label: 'Bionic' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => handleToggle(item.id, item.msg)(!prefs[item.id])}
                className={`flex flex-col items-center justify-center bg-surface border rounded-md p-3 px-[10px] transition-colors ${prefs[item.id] ? 'border-brand bg-brand-soft' : 'border-border hover:border-strong'}`}
              >
                <div className={`w-[18px] h-[18px] flex items-center justify-center ${prefs[item.id] ? 'text-brand' : 'text-secondary'}`}>
                  {item.icon}
                </div>
                <div className={`text-[12px] leading-tight mt-1.5 ${prefs[item.id] ? 'text-brand font-medium' : 'text-primary'}`}>
                  {item.label}
                </div>
              </button>
            ))}
            <button
              onClick={() => updatePref('fontFamily', prefs.fontFamily === 'openDyslexic' ? 'default' : 'openDyslexic')}
              className={`flex flex-col items-center justify-center bg-surface border rounded-md p-3 px-[10px] transition-colors ${prefs.fontFamily === 'openDyslexic' ? 'border-brand bg-brand-soft' : 'border-border hover:border-strong'}`}
            >
              <div className={`w-[18px] h-[18px] flex items-center justify-center font-serif font-bold ${prefs.fontFamily === 'openDyslexic' ? 'text-brand' : 'text-secondary'}`}>
                Aa
              </div>
              <div className={`text-[12px] leading-tight mt-1.5 ${prefs.fontFamily === 'openDyslexic' ? 'text-brand font-medium' : 'text-primary'}`}>
                Dyslexia font
              </div>
            </button>
          </div>
        </section>

        {/* ── Reading Level Section ── */}
        <section>
          <div className="text-[11px] uppercase font-medium tracking-[0.04em] text-muted mb-2.5">Reading level</div>
          <div className="flex flex-row bg-surface border border-border rounded-md p-1 relative">
            {['basic', 'standard', 'academic'].map((lvl) => {
              const isSelected = prefs.simplificationLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => updatePref('simplificationLevel', lvl)}
                  className={`flex-1 py-2 text-center text-[13px] z-10 transition-colors duration-200 ${isSelected ? 'text-white font-medium' : 'text-muted hover:text-primary'
                    }`}
                >
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </button>
              );
            })}
            {/* Animated pill background */}
            <div
              className="absolute top-1 bottom-1 w-[calc(33.333%-4px)] bg-brand rounded-sm transition-transform duration-200"
              style={{
                transform: `translateX(${['basic', 'standard', 'academic'].indexOf(prefs.simplificationLevel || 'standard') * 100}%)`,
                left: `${['basic', 'standard', 'academic'].indexOf(prefs.simplificationLevel || 'standard') * 4 + 4}px`,
                transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)'
              }}
            />
          </div>
        </section>

        {/* ── Appearance Section ── */}
        <section>
          <div className="text-[11px] uppercase font-medium tracking-[0.04em] text-muted mb-2.5">Appearance</div>
          <div className="flex flex-row bg-surface border border-border rounded-md p-1 relative">
            {['auto', 'light', 'dark'].map((mode) => {
              const isSelected = prefs.appearance === mode;
              const labels = {
                auto: '💻 Auto',
                light: '🌞 Light',
                dark: '🌙 Dark'
              };
              return (
                <button
                  key={mode}
                  onClick={() => updatePref('appearance', mode)}
                  className={`flex-1 py-2 text-center text-[13px] z-10 transition-colors duration-200 ${isSelected ? 'text-white font-medium' : 'text-muted hover:text-primary'
                    }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
            {/* Animated pill background */}
            <div
              className="absolute top-1 bottom-1 w-[calc(33.333%-4px)] bg-brand rounded-sm transition-transform duration-200"
              style={{
                transform: `translateX(${['auto', 'light', 'dark'].indexOf(prefs.appearance || 'auto') * 100}%)`,
                left: `${['auto', 'light', 'dark'].indexOf(prefs.appearance || 'auto') * 4 + 4}px`,
                transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)'
              }}
            />
          </div>
        </section>

        {/* ── Daily Usage Section ── */}
        <section>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[13px] font-medium text-primary">Daily usage</span>
            <span className="text-[12px] text-muted">{dailyRemaining} of {dailyLimit} remaining</span>
          </div>
          <div className="w-full bg-border rounded-sm h-[6px] overflow-hidden">
            <div
              className="h-[6px] rounded-sm bg-brand transition-all duration-500"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 pt-3.5 border-t border-border flex justify-between items-center">
        <span className="text-[11px] text-muted">NeuroAdapt v1.0.0</span>
        <button className="text-muted hover:text-primary transition-colors p-1" aria-label="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
        </button>
      </div>
    </div>
  );
}
