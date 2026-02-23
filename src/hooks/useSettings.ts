import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_COUNTRY } from '../utils/constants';
import { applyTheme } from '../utils/themes';

export interface AppSettings {
  country: string;
  showSpoilers: boolean;
  theme: string;
  streamingServices: number[];
  openrouterEnabled: boolean;
  openrouterApiKey: string;
  openrouterModel: string;
  openrouterModels: string[];
}

const DEFAULTS: AppSettings = { country: DEFAULT_COUNTRY, showSpoilers: false, theme: 'default', streamingServices: [], openrouterEnabled: false, openrouterApiKey: '', openrouterModel: '', openrouterModels: [] };
const THEME_KEY = 'app-theme-cache';

// Apply cached theme immediately to avoid flash on load
const cachedTheme = localStorage.getItem(THEME_KEY) ?? 'default';
applyTheme(cachedTheme);

function mergeDefaults(partial: Partial<AppSettings>): AppSettings {
  return {
    country: partial.country ?? DEFAULTS.country,
    showSpoilers: partial.showSpoilers ?? DEFAULTS.showSpoilers,
    theme: partial.theme ?? DEFAULTS.theme,
    streamingServices: partial.streamingServices ?? DEFAULTS.streamingServices,
    openrouterEnabled: partial.openrouterEnabled ?? DEFAULTS.openrouterEnabled,
    openrouterApiKey: partial.openrouterApiKey ?? DEFAULTS.openrouterApiKey,
    openrouterModel: partial.openrouterModel ?? DEFAULTS.openrouterModel,
    openrouterModels: partial.openrouterModels ?? DEFAULTS.openrouterModels,
  };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => mergeDefaults({ theme: cachedTheme }));
  const initialized = useRef(false);

  // Load settings from server on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: Partial<AppSettings>) => {
        const merged = mergeDefaults(data);
        setSettingsState(merged);
        applyTheme(merged.theme);
        localStorage.setItem(THEME_KEY, merged.theme);
        initialized.current = true;
      })
      .catch(() => { initialized.current = true; });
  }, []);

  // Persist to server whenever settings change (skip the initial default state)
  useEffect(() => {
    if (!initialized.current) return;
    fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    localStorage.setItem(THEME_KEY, settings.theme);
  }, [settings]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    initialized.current = true;
    setSettingsState((prev) => ({ ...prev, ...updates }));
  }, []);

  return { settings, updateSettings };
}
