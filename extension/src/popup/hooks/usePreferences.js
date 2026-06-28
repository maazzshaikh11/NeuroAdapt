/**
 * NeuroAdapt — usePreferences Hook
 *
 * Manages loading / saving user preferences from chrome.storage.local.
 * Provides a single source of truth for the popup UI.
 * Syncs to backend API when user is authenticated.
 *
 * Storage key: "neuroadapt_prefs"
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

/** Default preference values used when storage is empty or corrupted. */
export const DEFAULT_PREFS = {
  bionicModeEnabled: false,
  focusModeEnabled: false,
  simplifyModeEnabled: false,
  fontFamily: 'default',           // 'default' | 'openDyslexic'
  simplificationLevel: 'standard', // 'basic' | 'standard' | 'academic'
  colorTheme: 'light',             // 'light' | 'dark' | 'yellow' | 'cream'
  appearance: 'auto',              // 'auto' | 'light' | 'dark'
  fontSize: 18,
};

const STORAGE_KEY = 'neuroadapt_prefs';

/**
 * React hook that loads preferences on mount and saves them automatically
 * whenever they change.  Guards against race conditions by skipping the
 * initial save triggered by hydration.
 * 
 * When authenticated, syncs preferences to backend API via PUT /api/profile.
 *
 * @returns {[Object, Function, boolean]}
 *   [prefs, updatePref, isLoading]
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);

  // Flag to skip the very first save (which is just hydration, not a user change)
  const isHydrated = useRef(false);

  // ---- Load on mount and register storage listener ----
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      try {
        const stored = result[STORAGE_KEY];
        if (stored && typeof stored === 'object') {
          // Merge with defaults so any missing keys get fallback values
          const merged = { ...DEFAULT_PREFS, ...stored };
          setPrefs(merged);
        }
      } catch (err) {
        console.error('[NeuroAdapt] Failed to load preferences:', err);
      }
      setIsLoading(false);

      // Mark hydration complete after state has settled
      requestAnimationFrame(() => {
        isHydrated.current = true;
      });
    });

    const handleStorageChange = (changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY]) {
        const newValue = changes[STORAGE_KEY].newValue;
        if (newValue && typeof newValue === 'object') {
          setPrefs((prev) => {
            let changed = false;
            const updated = { ...prev };
            for (const key in DEFAULT_PREFS) {
              if (prev[key] !== newValue[key]) {
                updated[key] = newValue[key];
                changed = true;
              }
            }
            return changed ? updated : prev;
          });
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // ---- Auto-save on change (skip hydration) ----
  useEffect(() => {
    if (!isHydrated.current) return;

    // Save to local storage immediately
    chrome.storage.local.set({ [STORAGE_KEY]: prefs }, () => {
      if (chrome.runtime.lastError) {
        console.error('[NeuroAdapt] Failed to save preferences locally:', chrome.runtime.lastError);
      }
    });
  }, [prefs]);

  /**
   * Updates a single preference key.
   *
   * @param {string} key   – preference key (e.g. 'bionicModeEnabled')
   * @param {*}      value – new value
   */
  const updatePref = useCallback((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  return [prefs, updatePref, isLoading];
}
