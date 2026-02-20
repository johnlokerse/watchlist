import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_COUNTRY } from '../utils/constants';
import { applyTheme } from '../utils/themes';

interface AppSettings {
  country: string;
  showSpoilers: boolean;
  theme: string;
  streamingServices: number[];
}

const STORAGE_KEY = 'app-settings';

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: AppSettings = JSON.parse(stored);
      // Apply the persisted theme synchronously before first render
      applyTheme(parsed.theme ?? 'default');
      return { country: parsed.country ?? DEFAULT_COUNTRY, showSpoilers: parsed.showSpoilers ?? false, theme: parsed.theme ?? 'default', streamingServices: parsed.streamingServices ?? [] };
    }
  } catch { /* ignore */ }
  return { country: DEFAULT_COUNTRY, showSpoilers: false, theme: 'default', streamingServices: [] };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...updates }));
  }, []);

  return { settings, updateSettings };
}
