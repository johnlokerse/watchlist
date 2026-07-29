import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_COUNTRY } from '../utils/constants';
import {
  applyTheme,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  resolveThemeId,
} from '../utils/themes';

export type CoverSize = 'xs' | 'small' | 'medium' | 'large';

export interface AppSettings {
  country: string;
  showSpoilers: boolean;
  episodeRecapEnabled: boolean;
  theme: string;
  dynamicTheme: boolean;
  themeLight: string;
  themeDark: string;
  coverSize: CoverSize;
  streamingServices: number[];
  tmdbApiToken: string;
  streamingAvailabilityApiKey: string;
  openrouterEnabled: boolean;
  openrouterApiKey: string;
  openrouterModel: string;
  openrouterModels: string[];
}

interface ThemeCache {
  theme: string;
  dynamicTheme: boolean;
  themeLight: string;
  themeDark: string;
}

const DEFAULTS: AppSettings = {
  country: DEFAULT_COUNTRY,
  showSpoilers: false,
  episodeRecapEnabled: true,
  theme: 'default',
  dynamicTheme: false,
  themeLight: DEFAULT_LIGHT_THEME,
  themeDark: DEFAULT_DARK_THEME,
  coverSize: 'medium',
  streamingServices: [],
  tmdbApiToken: '',
  streamingAvailabilityApiKey: '',
  openrouterEnabled: false,
  openrouterApiKey: '',
  openrouterModel: '',
  openrouterModels: [],
};
const THEME_KEY = 'app-theme-cache';

function readThemeCache(): ThemeCache {
  const raw = localStorage.getItem(THEME_KEY);
  if (!raw) {
    return {
      theme: DEFAULTS.theme,
      dynamicTheme: DEFAULTS.dynamicTheme,
      themeLight: DEFAULTS.themeLight,
      themeDark: DEFAULTS.themeDark,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ThemeCache>;
    if (parsed && typeof parsed === 'object' && typeof parsed.theme === 'string') {
      return {
        theme: parsed.theme,
        dynamicTheme: Boolean(parsed.dynamicTheme),
        themeLight: typeof parsed.themeLight === 'string' ? parsed.themeLight : DEFAULTS.themeLight,
        themeDark: typeof parsed.themeDark === 'string' ? parsed.themeDark : DEFAULTS.themeDark,
      };
    }
  } catch {
    // Legacy cache stored a bare theme id string.
  }

  return {
    theme: raw,
    dynamicTheme: false,
    themeLight: DEFAULTS.themeLight,
    themeDark: DEFAULTS.themeDark,
  };
}

function writeThemeCache(cache: ThemeCache): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(cache));
}

function applyFromSettings(settings: Pick<AppSettings, 'theme' | 'dynamicTheme' | 'themeLight' | 'themeDark'>): string {
  const resolved = resolveThemeId(settings);
  applyTheme(resolved);
  return resolved;
}

// Apply cached theme immediately to avoid flash on load
const cachedTheme = readThemeCache();
applyFromSettings(cachedTheme);

function mergeDefaults(partial: Partial<AppSettings>): AppSettings {
  return {
    country: partial.country ?? DEFAULTS.country,
    showSpoilers: partial.showSpoilers ?? DEFAULTS.showSpoilers,
    episodeRecapEnabled: partial.episodeRecapEnabled ?? DEFAULTS.episodeRecapEnabled,
    theme: partial.theme ?? DEFAULTS.theme,
    dynamicTheme: partial.dynamicTheme ?? DEFAULTS.dynamicTheme,
    themeLight: partial.themeLight ?? DEFAULTS.themeLight,
    themeDark: partial.themeDark ?? DEFAULTS.themeDark,
    coverSize: partial.coverSize ?? DEFAULTS.coverSize,
    streamingServices: partial.streamingServices ?? DEFAULTS.streamingServices,
    tmdbApiToken: partial.tmdbApiToken ?? DEFAULTS.tmdbApiToken,
    streamingAvailabilityApiKey: partial.streamingAvailabilityApiKey ?? DEFAULTS.streamingAvailabilityApiKey,
    openrouterEnabled: partial.openrouterEnabled ?? DEFAULTS.openrouterEnabled,
    openrouterApiKey: partial.openrouterApiKey ?? DEFAULTS.openrouterApiKey,
    openrouterModel: partial.openrouterModel ?? DEFAULTS.openrouterModel,
    openrouterModels: partial.openrouterModels ?? DEFAULTS.openrouterModels,
  };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => mergeDefaults(cachedTheme));
  const initialized = useRef(false);

  // Load settings from server on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: Partial<AppSettings>) => {
        const merged = mergeDefaults(data);
        setSettingsState(merged);
        applyFromSettings(merged);
        writeThemeCache({
          theme: merged.theme,
          dynamicTheme: merged.dynamicTheme,
          themeLight: merged.themeLight,
          themeDark: merged.themeDark,
        });
        initialized.current = true;
      })
      .catch(() => { initialized.current = true; });
  }, []);

  // Persist to server whenever settings change (skip the initial default state)
  useEffect(() => {
    if (!initialized.current) return;
    fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    writeThemeCache({
      theme: settings.theme,
      dynamicTheme: settings.dynamicTheme,
      themeLight: settings.themeLight,
      themeDark: settings.themeDark,
    });
  }, [settings]);

  // Apply theme + follow system appearance when dynamic mode is on
  useEffect(() => {
    applyFromSettings(settings);

    if (!settings.dynamicTheme || typeof window.matchMedia !== 'function') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyFromSettings(settings);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme, settings.dynamicTheme, settings.themeLight, settings.themeDark]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    initialized.current = true;
    setSettingsState((prev) => ({ ...prev, ...updates }));
  }, []);

  return { settings, updateSettings };
}
