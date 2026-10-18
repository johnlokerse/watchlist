import { useId, useRef, useState, useEffect, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { clearLibrary, addToLibrary, exportLibrary, updateSeriesProgress, bulkImportEpisodes, updateWatchedItem, addWatchLogEntry, useWatchedItems } from '../db/hooks';
import type { WatchedStatus, ContentType } from '../db/models';
import { useSettings } from '../hooks/useSettings';
import {
  THEMES,
  getTheme,
  getThemesForScheme,
  getSystemPrefersDark,
  resolveThemeId,
  type ColorScheme,
} from '../utils/themes';
import { useAvailableProviders } from '../api/tmdb';
import { logoUrl } from '../utils/image';
import { toLocalISODate } from '../utils/date';
import Toggle from '../components/ui/Toggle';
import SegmentedControl from '../components/ui/SegmentedControl';
import Select from '../components/ui/Select';
import { buttonClasses } from '../components/ui/buttonStyles';
import { spring } from '../design/motion';

// Ordered curated list of provider IDs to display in Settings.
// IDs are stable TMDB provider IDs. Order determines display order.
// Includes 1899 (Max) and 384 (HBO Max) since TMDB regions use both.
const CURATED_PROVIDER_IDS = [
  8,    // Netflix
  119,  // Amazon Prime Video
  337,  // Disney+
  350,  // Apple TV+
  1899, // Max (formerly HBO Max)
  384,  // HBO Max
  1773, // SkyShowtime
  72,   // Videoland
  71,   // Pathé Thuis
  472,  // NLZiet
  1986, // NPO Plus
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
];

const EXAMPLE_JSON = JSON.stringify(
  {
    items: [
      {
        tmdbId: 302946,
        title: 'The Accountant',
        contentType: 'movie',
        status: 'watched',
        posterPath: '/fceheXB5fC4WrLVuWJ6OZv9FXYr.jpg',
        releaseDate: '2016-10-13',
        watchedAt: '2024-01-15T00:00:00.000Z',
        addedAt: '2024-01-10T12:00:00.000Z',
        genreIds: [53, 80],
      },
      {
        tmdbId: 1396,
        title: 'Breaking Bad',
        contentType: 'series',
        status: 'watching',
        posterPath: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        releaseDate: '2008-01-20',
      },
    ],
    progress: [
      {
        tmdbId: 1396,
        currentSeason: 3,
        currentEpisode: 7,
        totalSeasons: 5,
        totalEpisodes: 62,
      },
    ],
    episodes: [
      { tmdbId: 1396, season: 1, episode: 1 },
      { tmdbId: 1396, season: 1, episode: 2 },
    ],
    watchLog: [
      { tmdbId: 302946, contentType: 'movie', watchedAt: '2024-01-15T00:00:00.000Z', note: 'first viewing' },
    ],
  },
  null,
  2,
);

interface ImportEntry {
  tmdbId: number;
  title: string;
  contentType: ContentType;
  status: WatchedStatus;
  posterPath?: string | null;
  releaseDate?: string | null;
  userRating?: number | null;
  notes?: string;
  watchedAt?: string | null;
  addedAt?: string | null;
  genreIds?: number[];
}

interface ImportProgress {
  tmdbId: number;
  currentSeason: number;
  currentEpisode: number;
  totalSeasons: number;
  totalEpisodes: number;
}

interface ImportEpisode {
  tmdbId: number;
  season: number;
  episode: number;
  watchedAt?: string | null;
}

interface ImportWatchLog {
  tmdbId: number;
  contentType: ContentType;
  watchedAt: string;
  note?: string;
}

interface AppVersionResponse {
  version?: string;
}

interface ActionStatus {
  kind: 'success' | 'error';
  text: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0 text-accent">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Model picker combobox ─────────────────────────────────────────────────────

interface ModelPickerProps {
  models: { id: string; name: string }[];
  values: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}

function groupModels(models: { id: string; name: string }[], term: string) {
  const lower = term.toLowerCase();
  const filtered = lower
    ? models.filter((m) => m.name.toLowerCase().includes(lower) || m.id.toLowerCase().includes(lower))
    : models;
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const m of filtered) {
    const provider = m.id.includes('/') ? m.id.split('/')[0] : 'Other';
    const label = provider.charAt(0).toUpperCase() + provider.slice(1);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(m);
  }
  return { groups, total: filtered.length };
}

function ModelPicker({ models, values, onChange, disabled, loading }: ModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const firstSelectedRef = useRef<HTMLButtonElement>(null);

  const { groups, total } = groupModels(models, search);

  const triggerLabel = loading
    ? 'Loading models…'
    : values.length === 0
      ? 'Select models'
      : values.length === 1
        ? (models.find((m) => m.id === values[0])?.name ?? values[0])
        : `${values.length} models selected`;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Auto-focus search and scroll first selected item into view when opening
  useEffect(() => {
    if (!isOpen) { setSearch(''); return; }
    searchRef.current?.focus();
    setTimeout(() => firstSelectedRef.current?.scrollIntoView({ block: 'nearest' }), 0);
  }, [isOpen]);

  const handleToggle = (id: string) => {
    const next = values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
    onChange(next);
    // Re-focus search so the user can keep typing after selecting a model
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const handleRemoveChip = (id: string) => {
    onChange(values.filter((v) => v !== id));
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="field flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={values.length > 0 ? 'text-text-primary' : 'text-text-muted'}>
          {triggerLabel}
        </span>
        <ChevronDownIcon open={isOpen} />
      </button>

      {/* Selected chips */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((id) => {
            const name = models.find((m) => m.id === id)?.name ?? id.split('/').pop() ?? id;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-accent/15 py-0.5 pl-2.5 pr-1 text-[0.8125rem] font-medium text-accent"
              >
                {name}
                <button
                  type="button"
                  onClick={() => handleRemoveChip(id)}
                  className="hit-44 grid h-5 w-5 place-items-center rounded-full hover:bg-accent/20"
                  aria-label={`Remove ${name}`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown panel */}
      {isOpen && (
        <div className="material-sheet shadow-sheet absolute z-50 mt-1 flex w-full origin-top flex-col overflow-hidden rounded-[14px]"
          role="listbox"
          aria-multiselectable="true"
          style={{ maxHeight: '320px' }}>

          {/* Search input */}
          <div className="hairline-bottom shrink-0 p-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
              placeholder="Filter models…"
              aria-label="Filter models"
              className="field"
            />
          </div>

          {/* Grouped list */}
          <div className="overflow-y-auto overscroll-contain">
            {total === 0 ? (
              <p className="px-4 py-3 text-sm text-text-muted">No models match "{search}"</p>
            ) : (
              Array.from(groups.entries()).map(([provider, providerModels]) => (
                <div key={provider}>
                  <p className="t-label select-none px-3 pb-1 pt-2.5">
                    {provider}
                  </p>
                  {providerModels.map((m, idx) => {
                    const isSelected = values.includes(m.id);
                    const isFirstSelected = isSelected && values.indexOf(m.id) === 0 && idx === 0;
                    return (
                      <button
                        key={m.id}
                        ref={isFirstSelected ? firstSelectedRef : undefined}
                        type="button"
                        onClick={() => handleToggle(m.id)}
                        role="option"
                        aria-selected={isSelected}
                        className={`flex min-h-10 w-full items-center justify-between gap-2 px-3 text-left text-[0.875rem] transition-colors ${
                          isSelected
                            ? 'bg-accent/12 text-text-primary'
                            : 'text-text-secondary hover:bg-fill hover:text-text-primary'
                        }`}
                      >
                        <span className="truncate">{m.name || m.id}</span>
                        {isSelected && <CheckIcon />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Building blocks ──────────────────────────────────────────────────────────

function Group({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      {title && <h2 className="t-label px-4">{title}</h2>}
      <div className="grouped">{children}</div>
      {footer && <div className="t-caption px-4">{footer}</div>}
    </section>
  );
}

function Row({ title, description, htmlFor, titleId, children }: { title: string; description?: ReactNode; htmlFor?: string; titleId?: string; children?: ReactNode }) {
  const Title = htmlFor ? 'label' : 'p';
  return (
    <div className="grouped-row flex-wrap justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <Title id={titleId} htmlFor={htmlFor} className="t-body block text-text-primary">{title}</Title>
        {description && <p className="t-caption mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function StatusLine({ status }: { status: ActionStatus | null }) {
  if (!status) return null;
  return (
    <p
      role={status.kind === 'error' ? 'alert' : 'status'}
      className={`t-caption mt-1 flex items-center gap-1 font-medium ${status.kind === 'error' ? 'text-danger' : 'text-success'}`}
    >
      {status.kind === 'error' ? '⚠︎' : '✓'} {status.text}
    </p>
  );
}

function looksLikeTmdbCredential(value: string) {
  const v = value.trim();
  return /^[a-f0-9]{32}$/i.test(v) || (v.startsWith('eyJ') && v.split('.').length === 3);
}

export default function SettingsPage() {
  const { settings, updateSettings, saveStatus } = useSettings();
  const libraryCount = useWatchedItems()?.length ?? 0;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [aiOpen, setAiOpen] = useState(settings.openrouterEnabled);
  const [tmdbFormatWarning, setTmdbFormatWarning] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ActionStatus | null>(null);
  const [clearStatus, setClearStatus] = useState<ActionStatus | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [schemeTab, setSchemeTab] = useState<ColorScheme>(() => (getSystemPrefersDark() ? 'dark' : 'light'));
  const fileRef = useRef<HTMLInputElement>(null);

  const tmdbTokenConfigured = settings.tmdbApiToken.trim().length > 0;
  const { providers, isLoading: providersLoading, isError: providersError } = useAvailableProviders(settings.tmdbApiToken.trim());
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // OpenRouter model list
  const [orModels, setOrModels] = useState<{ id: string; name: string }[]>([]);
  const [orModelsLoading, setOrModelsLoading] = useState(false);
  const [orModelsError, setOrModelsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/version')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch version (${r.status})`);
        return r.json() as Promise<AppVersionResponse>;
      })
      .then((data) => {
        if (active) setAppVersion(data.version?.trim() || null);
      })
      .catch(() => {
        if (active) setAppVersion(null);
      });

    return () => { active = false; };
  }, []);

  // The models request does not use the key value, only whether one is present.
  const hasOpenrouterKey = settings.openrouterApiKey.length >= 10;

  useEffect(() => {
    if (!settings.openrouterEnabled || !hasOpenrouterKey) {
      setOrModels([]);
      setOrModelsLoading(false);
      setOrModelsError(null);
      return;
    }
    const controller = new AbortController();
    setOrModelsLoading(true);
    setOrModelsError(null);
    // Debounce so a burst of key changes does not fire a request per change.
    const timer = setTimeout(() => {
      fetch('/api/chat/models', { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch models (${r.status})`);
          return r.json();
        })
        .then((data: { id: string; name: string }[]) => {
          setOrModels(data);
          setOrModelsLoading(false);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setOrModelsError(err instanceof Error ? err.message : String(err));
          setOrModels([]);
          setOrModelsLoading(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [settings.openrouterEnabled, hasOpenrouterKey]);

  const toggleProvider = (id: number) => {
    const current = settings.streamingServices;
    updateSettings({
      streamingServices: current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    });
  };

  const handleExport = async () => {
    setExporting(true);
    setExportStatus(null);
    try {
      const data = await exportLibrary();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `movie-db-export-${toLocalISODate()}.json`;
        a.click();
      } finally {
        // Revoking synchronously can cancel the download in Safari/Firefox.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setExportStatus({ kind: 'success', text: `Exported ${data.items.length} titles` });
    } catch (err) {
      setExportStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Export failed.' });
    } finally {
      setExporting(false);
    }
  };

  const handleClear = async () => {
    setConfirmingDelete(false);
    setClearing(true);
    setClearStatus(null);
    try {
      await clearLibrary();
      setClearStatus({ kind: 'success', text: 'Library cleared.' });
    } catch (err) {
      setClearStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to clear library.' });
    } finally {
      setClearing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setImporting(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);

      let entries: ImportEntry[];
      let progressEntries: ImportProgress[];
      let episodeEntries: ImportEpisode[];
      let watchLogEntries: ImportWatchLog[];
      if (Array.isArray(parsed)) {
        entries = parsed as ImportEntry[];
        progressEntries = [];
        episodeEntries = [];
        watchLogEntries = [];
      } else if (parsed && typeof parsed === 'object' && 'items' in parsed) {
        const data = parsed as { items: ImportEntry[]; progress?: ImportProgress[]; episodes?: ImportEpisode[]; watchLog?: ImportWatchLog[] };
        entries = data.items ?? [];
        progressEntries = data.progress ?? [];
        episodeEntries = data.episodes ?? [];
        watchLogEntries = data.watchLog ?? [];
      } else {
        throw new Error('JSON must be an array or an object with an "items" array.');
      }

      let added = 0;
      let skipped = 0;
      // Older exports lack addedAt and are ordered newest-first; import oldest-first to preserve order.
      const ordered = entries.some((e) => e.addedAt) ? entries : [...entries].reverse();
      for (const entry of ordered) {
        if (!entry.tmdbId || !entry.title || !entry.contentType || !entry.status) {
          skipped++;
          continue;
        }
        const id = await addToLibrary({
          tmdbId: entry.tmdbId,
          title: entry.title,
          contentType: entry.contentType,
          status: entry.status,
          posterPath: entry.posterPath ?? null,
          releaseDate: entry.releaseDate ?? null,
          userRating: entry.userRating ?? null,
          notes: entry.notes ?? '',
          genreIds: Array.isArray(entry.genreIds) ? entry.genreIds : [],
          watchedAt: entry.watchedAt ?? null,
          addedAt: entry.addedAt ?? undefined,
        });

        if (!id) { skipped++; continue; }
        await updateWatchedItem(id, {
          userRating: entry.userRating ?? null,
          notes: entry.notes ?? '',
          watchedAt: entry.watchedAt ?? null,
        });
        added++;

        if (entry.contentType === 'series') {
          const progress = progressEntries.find((p) => p.tmdbId === entry.tmdbId);
          if (progress) {
            await updateSeriesProgress({
              watchedItemId: id,
              tmdbId: progress.tmdbId,
              currentSeason: progress.currentSeason,
              currentEpisode: progress.currentEpisode,
              totalSeasons: progress.totalSeasons,
              totalEpisodes: progress.totalEpisodes,
            });
          }
        }
      }

      if (episodeEntries.length) {
        await bulkImportEpisodes(episodeEntries);
      }

      for (const entry of watchLogEntries) {
        if (!entry.tmdbId || !entry.contentType || !entry.watchedAt) continue;
        await addWatchLogEntry({
          tmdbId: entry.tmdbId,
          contentType: entry.contentType,
          watchedAt: entry.watchedAt,
          note: entry.note,
        });
      }

      setImportResult({ added, skipped });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse JSON.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };


  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'error' ? "Couldn't save. Check that the server is running." : 'Keys are stored on your Watchlist server, not in the browser.';
  const switchId = useId();

  return (
    <div className="mx-auto max-w-[720px] space-y-8">
      <div className="pr-12 md:pr-0">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* ── Setup needed ── */}
      {!tmdbTokenConfigured && (
        <div className="flex gap-3 rounded-[18px] bg-warning/12 p-4" role="alert">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-warning text-on-warning" aria-hidden="true">!</span>
          <div>
            <p className="t-headline text-text-primary">Setup needed</p>
            <p className="t-callout mt-0.5 text-text-secondary">Add a TMDB API key below to search, load artwork and show streaming providers.</p>
          </div>
        </div>
      )}

      {/* ── Appearance ── */}
      <Group title="Appearance">
        <Row title="Dynamic themes" description="Follow system light/dark appearance" titleId={`${switchId}-dynamic`}>
          <Toggle
            label="Dynamic themes"
            checked={settings.dynamicTheme}
            onChange={() => {
              const next = !settings.dynamicTheme;
              if (next) {
                const current = getTheme(settings.theme);
                updateSettings({
                  dynamicTheme: true,
                  ...(current.scheme === 'light'
                    ? { themeLight: current.id }
                    : { themeDark: current.id }),
                });
                setSchemeTab(current.scheme);
              } else {
                updateSettings({
                  dynamicTheme: false,
                  theme: resolveThemeId(settings),
                });
              }
            }}
          />
        </Row>
        {settings.dynamicTheme && (
          <div className="px-4 py-3">
            <SegmentedControl
              fill
              ariaLabel="Theme scheme"
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
              value={schemeTab}
              onChange={(value) => setSchemeTab(value as ColorScheme)}
            />
          </div>
        )}
        <div role="radiogroup" aria-label="Theme">
          {(settings.dynamicTheme ? getThemesForScheme(schemeTab) : THEMES).map((theme) => {
            const isActive = settings.dynamicTheme
              ? (schemeTab === 'light' ? settings.themeLight : settings.themeDark) === theme.id
              : settings.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  if (settings.dynamicTheme) {
                    updateSettings(schemeTab === 'light' ? { themeLight: theme.id } : { themeDark: theme.id });
                  } else {
                    updateSettings({ theme: theme.id });
                  }
                }}
                className="grouped-row w-full justify-between text-left transition-colors active:bg-fill [@media(hover:hover)]:hover:bg-fill"
              >
                <span className={`t-body ${isActive ? 'font-semibold text-text-primary' : 'text-text-primary'}`}>{theme.name}</span>
                <span className="flex items-center gap-3">
                  <span className="flex -space-x-1" aria-hidden="true">
                    {theme.swatches.map((color, si) => (
                      <span key={si} className="h-4 w-4 rounded-full ring-2 ring-surface-raised" style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <svg className={`h-4 w-4 text-accent transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      {/* ── API Keys ── */}
      <Group title="API Keys" footer={<span role="status">{saveLabel}</span>}>
        <div className="grouped-row flex-col items-stretch gap-2 py-3">
          <label className="t-body text-text-primary" htmlFor="tmdb-api-token">TMDB API key</label>
          <input
            id="tmdb-api-token"
            type="password"
            autoComplete="off"
            value={settings.tmdbApiToken}
            onChange={(e) => {
              updateSettings({ tmdbApiToken: e.target.value });
              setTmdbFormatWarning(false);
            }}
            onBlur={(e) => setTmdbFormatWarning(e.target.value.trim().length > 0 && !looksLikeTmdbCredential(e.target.value))}
            placeholder="TMDB API key or read access token"
            aria-describedby="tmdb-api-token-help"
            className="field"
          />
          <p id="tmdb-api-token-help" className="t-caption">
            Required for searches, details, Discover feeds, artwork, and streaming provider data. Supports either a TMDB API key or v4 read access token.
          </p>
          {tmdbFormatWarning && (
            <p className="t-caption font-medium text-warning" role="alert">This doesn't look like a TMDB API key (32 characters) or read access token (starts with “eyJ”).</p>
          )}
          {tmdbTokenConfigured && providersError && (
            <p className="t-caption font-medium text-danger" role="alert">TMDB rejected this key. Check that it's valid.</p>
          )}
        </div>
        <div className="grouped-row flex-col items-stretch gap-2 py-3">
          <label className="t-body text-text-primary" htmlFor="streaming-availability-key">Deep linking API key</label>
          <input
            id="streaming-availability-key"
            type="password"
            autoComplete="off"
            value={settings.streamingAvailabilityApiKey}
            onChange={(e) => updateSettings({ streamingAvailabilityApiKey: e.target.value })}
            placeholder="Streaming Availability API key"
            className="field"
          />
          <p className="t-caption">
            Optional. Add a Streaming Availability API key to open exact movie and series pages on supported providers.
            The app only uses it when you open a Where to Watch tab, and successful results are cached for 7 days.
          </p>
        </div>
      </Group>

      {/* ── Streaming Services ── */}
      <Group title="Streaming Services" footer="Select the services you subscribe to.">
        <div className="p-3">
          {providersLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-[88px] rounded-[14px]" />
              ))}
            </div>
          ) : providersError ? (
            <p className="t-callout p-1 text-danger" role="alert">
              {tmdbTokenConfigured
                ? 'Failed to load providers. Check that your TMDB API token is valid.'
                : 'TMDB API token is missing. Add it in API Keys to load streaming providers.'}
            </p>
          ) : providers.length === 0 ? (
            <p className="t-callout p-1 text-text-secondary">No providers found for your country.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CURATED_PROVIDER_IDS
                .map((id) => providers.find((p) => p.provider_id === id))
                .filter((p): p is NonNullable<typeof p> => p !== undefined)
                .map((p) => {
                  const isSelected = settings.streamingServices.includes(p.provider_id);
                  const logo = logoUrl(p.logo_path, 'w92');
                  return (
                    <button
                      key={p.provider_id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleProvider(p.provider_id)}
                      className={`press relative flex flex-col items-center gap-1.5 rounded-[14px] p-3 transition-colors ${
                        isSelected
                          ? 'bg-accent/12 ring-2 ring-inset ring-accent'
                          : 'bg-fill hover:bg-fill-strong'
                      }`}
                    >
                      {logo && (
                        <img src={logo} alt="" className="h-10 w-10 rounded-[10px] object-cover" loading="lazy" />
                      )}
                      <span className={`line-clamp-2 text-center text-[0.75rem] leading-tight ${isSelected ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                        {p.provider_name}
                      </span>
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-accent text-on-accent" aria-hidden="true">
                          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </Group>

      {/* ── Preferences ── */}
      <Group title="Preferences">
        <Row title="Country" description="Used to find streaming services near you">
          <Select
            ariaLabel="Country"
            value={settings.country}
            onChange={(value) => updateSettings({ country: value })}
            options={[
              ...(!COUNTRIES.some((c) => c.code === settings.country) ? [{ value: settings.country, label: settings.country }] : []),
              ...COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
            ]}
          />
        </Row>
        <Row title="Show Spoilers" description="Reveal episode descriptions and AI recaps without a tap" titleId={`${switchId}-spoilers`}>
          <Toggle
            labelledBy={`${switchId}-spoilers`}
            checked={settings.showSpoilers}
            onChange={() => updateSettings({ showSpoilers: !settings.showSpoilers })}
          />
        </Row>
        <Row title="Episode Recap" description="Show an AI Recap button on the last watched episode" titleId={`${switchId}-recap`}>
          <Toggle
            labelledBy={`${switchId}-recap`}
            checked={settings.episodeRecapEnabled}
            onChange={() => updateSettings({ episodeRecapEnabled: !settings.episodeRecapEnabled })}
          />
        </Row>
      </Group>

      {/* ── Library Data ── */}
      <Group title="Library Data">
        <div className="grouped-row flex-wrap justify-between gap-x-4 gap-y-2 py-3">
          <div className="min-w-0 flex-1 basis-56">
            <p className="t-body text-text-primary">Export to JSON</p>
            <p className="t-caption mt-0.5">Download your full library as a backup file</p>
            <StatusLine status={exportStatus} />
          </div>
          <button type="button" onClick={handleExport} disabled={exporting} className={buttonClasses('tinted', 'md')}>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
        <div className="grouped-row flex-col items-stretch gap-2 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 basis-56">
              <p className="t-body text-text-primary">Import from JSON</p>
              <p className="t-caption mt-0.5">Restore from an export file or a plain items array</p>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              aria-label={importing ? 'Importing JSON file' : 'Choose JSON file'}
              className={buttonClasses('tinted', 'md', 'min-w-[105px]')}
            >
              {importing ? (
                <span role="status" className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" aria-hidden="true" />
                  Importing…
                </span>
              ) : (
                'Choose file'
              )}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
          />
          {importResult && (
            <p className="t-caption font-medium text-success" role="status">
              ✓ Added {importResult.added} item{importResult.added !== 1 ? 's' : ''}{importResult.skipped > 0 ? `, skipped ${importResult.skipped}` : ''}.
            </p>
          )}
          {importError && <p className="t-caption font-medium text-danger" role="alert">⚠︎ {importError}</p>}
          <details className="group">
            <summary className="t-caption cursor-pointer select-none font-semibold text-accent">Show example JSON format</summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-fill p-3 text-xs leading-relaxed text-text-secondary">
              {EXAMPLE_JSON}
            </pre>
            <p className="t-caption mt-2">
              Valid <code className="rounded bg-fill px-1">contentType</code>: <code className="rounded bg-fill px-1">movie</code> | <code className="rounded bg-fill px-1">series</code><br />
              Valid <code className="rounded bg-fill px-1">status</code>: <code className="rounded bg-fill px-1">watched</code> | <code className="rounded bg-fill px-1">plan_to_watch</code> | <code className="rounded bg-fill px-1">watching</code> | <code className="rounded bg-fill px-1">dropped</code><br />
              <code className="rounded bg-fill px-1">progress</code> and <code className="rounded bg-fill px-1">episodes</code> are optional.
            </p>
          </details>
        </div>
      </Group>

      {/* ── AI Assistant (advanced, collapsed by default) ── */}
      <Group title="Watch Assistant">
        <button
          type="button"
          aria-expanded={aiOpen}
          onClick={() => setAiOpen((v) => !v)}
          className="grouped-row w-full justify-between text-left transition-colors active:bg-fill [@media(hover:hover)]:hover:bg-fill"
        >
          <span>
            <span className="t-body block text-text-primary">AI model</span>
            <span className="t-caption block">{settings.openrouterEnabled ? 'OpenRouter' : 'GitHub Copilot (default)'}</span>
          </span>
          <m.svg
            className="h-4 w-4 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            initial={false}
            animate={{ rotate: aiOpen ? 90 : 0 }}
            transition={spring.default}
          >
            <path d="m9 18 6-6-6-6" />
          </m.svg>
        </button>
        <AnimatePresence initial={false}>
          {aiOpen && (
            <m.div
              key="ai"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: spring.move, opacity: { duration: 0.18 } }}
              className="overflow-hidden"
            >
              <Row title="Use OpenRouter" description="Use your own API key instead of GitHub Copilot models" titleId={`${switchId}-openrouter`}>
                <Toggle
                  labelledBy={`${switchId}-openrouter`}
                  checked={settings.openrouterEnabled}
                  onChange={() => updateSettings({ openrouterEnabled: !settings.openrouterEnabled })}
                />
              </Row>
              {settings.openrouterEnabled && (
                <div className="grouped-row flex-col items-stretch gap-2 py-3">
                  <label className="t-body text-text-primary" htmlFor="openrouter-api-key">API Key</label>
                  <input
                    id="openrouter-api-key"
                    type="password"
                    autoComplete="off"
                    value={settings.openrouterApiKey}
                    onChange={(e) => updateSettings({ openrouterApiKey: e.target.value })}
                    placeholder="sk-or-..."
                    className="field"
                  />
                  <p className="t-caption">
                    Get yours at{' '}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent">
                      openrouter.ai/keys
                    </a>
                  </p>
                </div>
              )}
              {settings.openrouterEnabled && hasOpenrouterKey && (
                <div className="grouped-row flex-col items-stretch gap-2 py-3">
                  <p className="t-body text-text-primary">Model</p>
                  <p className="t-caption">
                    {orModelsLoading ? 'Loading models…' : orModelsError ? 'Failed to load models' : `${orModels.length} models available`}
                  </p>
                  <ModelPicker
                    models={orModels}
                    values={settings.openrouterModels}
                    onChange={(ids) => {
                      // Keep openrouterModel in sync — always points to an active pinned model
                      const activeModel =
                        ids.length === 0
                          ? ''
                          : ids.includes(settings.openrouterModel)
                            ? settings.openrouterModel
                            : ids[0];
                      updateSettings({ openrouterModels: ids, openrouterModel: activeModel });
                    }}
                    disabled={orModelsLoading || orModels.length === 0}
                    loading={orModelsLoading}
                  />
                  {orModelsError && <p className="t-caption text-danger" role="alert">{orModelsError}</p>}
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </Group>

      {/* ── Destructive action, separated at the bottom and confirmed inline ── */}
      <Group footer={<>Permanently removes all items, ratings, and episode progress.<StatusLine status={clearStatus} /></>}>
        <button
          type="button"
          aria-expanded={confirmingDelete}
          onClick={() => setConfirmingDelete((v) => !v)}
          disabled={clearing}
          className="grouped-row w-full text-left transition-colors active:bg-fill disabled:opacity-50 [@media(hover:hover)]:hover:bg-fill"
        >
          <span className="t-body font-semibold text-danger">{clearing ? 'Deleting…' : 'Delete Library…'}</span>
        </button>
        <AnimatePresence initial={false}>
          {confirmingDelete && (
            <m.div
              key="confirm"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: spring.default, opacity: { duration: 0.15 } }}
              className="overflow-hidden"
              role="alertdialog"
              aria-label="Confirm delete library"
            >
              <div className="px-4 pb-4 pt-1">
                <p className="t-callout mb-3 text-text-secondary">
                  Delete <strong className="text-text-primary">{libraryCount} {libraryCount === 1 ? 'title' : 'titles'}</strong> and all episode progress? This can't be undone. Export a backup first if you might need it.
                </p>
                <div className="flex gap-2">
                  <button type="button" autoFocus onClick={() => setConfirmingDelete(false)} className={buttonClasses('secondary', 'lg', 'flex-1')}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleClear} className={buttonClasses('destructive', 'lg', 'flex-1')}>
                    Delete
                  </button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </Group>

      <p className="t-caption pb-4 text-center text-text-muted">
        Watchlist {appVersion ? `v${appVersion}` : 'version unknown'}
      </p>
    </div>
  );
}
