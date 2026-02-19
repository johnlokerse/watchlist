import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_COUNTRY } from '../utils/constants';

interface AppSettings {
  country: string;
  showSpoilers: boolean;
}

const STORAGE_KEY = 'app-settings';

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { country: DEFAULT_COUNTRY, showSpoilers: false };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...updates }));
  }, []);

  return { settings, updateSettings };
}
