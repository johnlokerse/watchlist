import { useRef, useState, useEffect } from 'react';
import { clearLibrary, addToLibrary, exportLibrary, updateSeriesProgress, bulkImportEpisodes, updateWatchedItem } from '../db/hooks';
import type { WatchedStatus, ContentType } from '../db/models';
import { useSettings } from '../hooks/useSettings';
import { THEMES } from '../utils/themes';
import { useAvailableProviders } from '../api/tmdb';
import { logoUrl } from '../utils/image';

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
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="9.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

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
        className="w-full flex items-center justify-between gap-2 bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:border-accent/40"
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
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-medium"
              >
                {name}
                <button
                  type="button"
                  onClick={() => handleRemoveChip(id)}
                  className="hover:text-danger transition-colors leading-none"
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-surface-raised border border-border-subtle rounded-xl shadow-lg flex flex-col overflow-hidden"
          style={{ maxHeight: '300px' }}>

          {/* Search input */}
          <div className="p-2 border-b border-border-subtle shrink-0">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
              placeholder="Filter models…"
              className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* Grouped list */}
          <div className="overflow-y-auto overscroll-contain">
            {total === 0 ? (
              <p className="px-4 py-3 text-sm text-text-muted">No models match "{search}"</p>
            ) : (
              Array.from(groups.entries()).map(([provider, providerModels]) => (
                <div key={provider}>
                  <p className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted select-none">
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
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                          isSelected
                            ? 'bg-accent/10 text-text-primary'
                            : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
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

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-surface-raised ${
        checked ? 'bg-accent' : 'bg-surface-overlay'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { providers, isLoading: providersLoading, isError: providersError } = useAvailableProviders();

  // OpenRouter model list
  const [orModels, setOrModels] = useState<{ id: string; name: string }[]>([]);
  const [orModelsLoading, setOrModelsLoading] = useState(false);
  const [orModelsError, setOrModelsError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.openrouterEnabled || settings.openrouterApiKey.length < 10) {
      setOrModels([]);
      setOrModelsError(null);
      return;
    }
    setOrModelsLoading(true);
    setOrModelsError(null);
    fetch('/api/chat/models')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch models (${r.status})`);
        return r.json();
      })
      .then((data: { id: string; name: string }[]) => {
        setOrModels(data);
        setOrModelsLoading(false);
      })
      .catch((err) => {
        setOrModelsError(err instanceof Error ? err.message : String(err));
        setOrModels([]);
        setOrModelsLoading(false);
      });
  }, [settings.openrouterEnabled, settings.openrouterApiKey]);

  const toggleProvider = (id: number) => {
    const current = settings.streamingServices;
    updateSettings({
      streamingServices: current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    });
  };

  const handleExport = async () => {
    setExporting(true);
    const data = await exportLibrary();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movie-db-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const handleClear = async () => {
    if (!confirm('This will remove all movies, series, and episode progress from your library. Are you sure?')) return;
    setClearing(true);
    await clearLibrary();
    setClearing(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);

      let entries: ImportEntry[];
      let progressEntries: ImportProgress[];
      let episodeEntries: ImportEpisode[];
      if (Array.isArray(parsed)) {
        entries = parsed as ImportEntry[];
        progressEntries = [];
        episodeEntries = [];
      } else if (parsed && typeof parsed === 'object' && 'items' in parsed) {
        const data = parsed as { items: ImportEntry[]; progress?: ImportProgress[]; episodes?: ImportEpisode[] };
        entries = data.items ?? [];
        progressEntries = data.progress ?? [];
        episodeEntries = data.episodes ?? [];
      } else {
        throw new Error('JSON must be an array or an object with an "items" array.');
      }

      let added = 0;
      let skipped = 0;
      for (const entry of entries) {
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
          genreIds: [],
        });

        if (!id) { skipped++; continue; }
        await updateWatchedItem(id, {
          userRating: entry.userRating ?? null,
          notes: entry.notes ?? '',
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

      setImportResult({ added, skipped });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse JSON.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* ── Left column ── */}
        <div className="space-y-4">

          {/* ── Appearance ── */}
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 text-accent">
                <PaletteIcon />
              </div>
              <h2 className="text-base font-semibold">Appearance</h2>
            </div>
            {THEMES.map((theme, i) => {
              const isActive = settings.theme === theme.id;
              return (
                <div key={theme.id}>
                  {i > 0 && <div className="border-t border-border-subtle" />}
                  <button
                    onClick={() => updateSettings({ theme: theme.id })}
                    className={`w-full flex items-center justify-between py-3 px-2 rounded-lg transition-colors ${
                      isActive ? 'bg-accent/5' : 'hover:bg-surface-overlay cursor-pointer'
                    }`}
                  >
                    <span className={`text-sm ${isActive ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                      {theme.name}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1">
                        {theme.swatches.map((color, si) => (
                          <span
                            key={si}
                            className="w-4 h-4 rounded-md inline-block shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className={`w-4 text-right text-sm font-bold transition-opacity ${isActive ? 'text-success opacity-100' : 'opacity-0'}`}>
                        ✓
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Library Data ── */}
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 text-accent">
                <LayersIcon />
              </div>
              <h2 className="text-base font-semibold">Library Data</h2>
            </div>

            {/* Export */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-medium">Export to JSON</p>
                <p className="text-xs text-text-secondary mt-0.5">Download your full library as a backup file</p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="shrink-0 sm:ml-4 px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exporting…' : 'Export'}
              </button>
            </div>

            <div className="border-t border-border-subtle" />

            {/* Import */}
            <div className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Import from JSON</p>
                  <p className="text-xs text-text-secondary mt-0.5">Restore from an export file or a plain items array</p>
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                  className="shrink-0 sm:ml-4 px-3 py-1.5 bg-accent/15 text-accent rounded-lg text-sm font-medium hover:bg-accent/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importing…' : 'Choose file'}
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

              <details className="mt-3 group">
                <summary className="text-xs text-accent cursor-pointer select-none hover:underline">Show example JSON format</summary>
                <pre className="mt-2 text-xs bg-surface rounded-lg p-3 overflow-x-auto text-text-secondary leading-relaxed">
                  {EXAMPLE_JSON}
                </pre>
                <p className="mt-2 text-xs text-text-muted">
                  Valid <code className="bg-surface px-1 rounded">contentType</code>: <code className="bg-surface px-1 rounded">movie</code> | <code className="bg-surface px-1 rounded">series</code><br />
                  Valid <code className="bg-surface px-1 rounded">status</code>: <code className="bg-surface px-1 rounded">watched</code> | <code className="bg-surface px-1 rounded">plan_to_watch</code> | <code className="bg-surface px-1 rounded">watching</code> | <code className="bg-surface px-1 rounded">dropped</code><br />
                  <code className="bg-surface px-1 rounded">progress</code> and <code className="bg-surface px-1 rounded">episodes</code> are optional.
                </p>
              </details>

              {importResult && (
                <p className="mt-3 text-xs text-success">
                  ✓ Added {importResult.added} item{importResult.added !== 1 ? 's' : ''}{importResult.skipped > 0 ? `, skipped ${importResult.skipped}` : ''}.
                </p>
              )}
              {importError && <p className="mt-3 text-xs text-danger">✗ {importError}</p>}
            </div>
          </div>

        </div>{/* end left column */}

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* ── Preferences ── */}
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 text-accent">
                <SlidersIcon />
              </div>
              <h2 className="text-base font-semibold">Preferences</h2>
            </div>

            {/* Country */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-medium">Country</p>
                <p className="text-xs text-text-secondary mt-0.5">Used to find streaming services near you</p>
              </div>
              <select
                value={settings.country}
                onChange={(e) => updateSettings({ country: e.target.value })}
                className="bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer sm:ml-4 shrink-0 w-full sm:w-auto"
              >
                {!COUNTRIES.some((c) => c.code === settings.country) && (
                  <option value={settings.country}>{settings.country}</option>
                )}
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-border-subtle" />

            {/* Show Spoilers */}
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">Show Spoilers</p>
                <p className="text-xs text-text-secondary mt-0.5">Reveal episode titles and descriptions</p>
              </div>
              <Toggle
                checked={settings.showSpoilers}
                onChange={() => updateSettings({ showSpoilers: !settings.showSpoilers })}
              />
            </div>
          </div>

          {/* ── AI Assistant ── */}
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 text-accent">
                <SparklesIcon />
              </div>
              <h2 className="text-base font-semibold">AI Assistant</h2>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">Use OpenRouter</p>
                <p className="text-xs text-text-secondary mt-0.5">Use your own API key instead of GitHub Copilot models</p>
              </div>
              <Toggle
                checked={settings.openrouterEnabled}
                onChange={() => updateSettings({ openrouterEnabled: !settings.openrouterEnabled })}
              />
            </div>

            {settings.openrouterEnabled && (
              <>
                <div className="border-t border-border-subtle" />

                {/* API Key */}
                <div className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">API Key</p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Get yours at{' '}
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          openrouter.ai/keys
                        </a>
                      </p>
                    </div>
                    <input
                      type="password"
                      value={settings.openrouterApiKey}
                      onChange={(e) => updateSettings({ openrouterApiKey: e.target.value })}
                      placeholder="sk-or-..."
                      className="bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 sm:ml-4 shrink-0 w-full sm:w-56"
                    />
                  </div>
                </div>

                {settings.openrouterApiKey.length >= 10 && (
                  <>
                    <div className="border-t border-border-subtle" />

                    {/* Model selector */}
                    <div className="py-3">
                      <p className="text-sm font-medium mb-1">Model</p>
                      <p className="text-xs text-text-secondary mb-2">
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
                    </div>
                    {orModelsError && (
                      <p className="text-xs text-danger pb-2">{orModelsError}</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Streaming Services ── */}
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 text-accent">
                <MonitorIcon />
              </div>
              <h2 className="text-base font-semibold">Streaming Services</h2>
            </div>
            <p className="text-xs text-text-secondary mb-5">Select the services you subscribe to.</p>

            {providersLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-[84px] rounded-xl bg-surface animate-pulse" />
                ))}
              </div>
            ) : providersError ? (
              <p className="text-xs text-danger">Failed to load providers. Check your connection.</p>
            ) : providers.length === 0 ? (
              <p className="text-xs text-text-muted">No providers found for your country.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CURATED_PROVIDER_IDS
                  .map((id) => providers.find((p) => p.provider_id === id))
                  .filter((p): p is NonNullable<typeof p> => p !== undefined)
                  .map((p) => {
                  const isSelected = settings.streamingServices.includes(p.provider_id);
                  const logo = logoUrl(p.logo_path, 'w92');
                  return (
                    <button
                      key={p.provider_id}
                      onClick={() => toggleProvider(p.provider_id)}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-accent bg-accent/10'
                          : 'border-border-subtle bg-surface hover:border-accent/40 hover:bg-surface-overlay'
                      }`}
                    >
                      {logo && (
                        <img src={logo} alt={p.provider_name} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                      )}
                      <span className={`text-xs text-center leading-tight line-clamp-2 ${isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                        {p.provider_name}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Danger Zone ── */}
          <div className="bg-surface-raised rounded-xl border border-danger/30 p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-danger/15 flex items-center justify-center shrink-0 text-danger">
                <TrashIcon />
              </div>
              <h2 className="text-base font-semibold text-danger">Danger Zone</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-medium">Clear All Library Data</p>
                <p className="text-xs text-text-secondary mt-0.5">Permanently removes all items, ratings, and episode progress</p>
              </div>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="shrink-0 sm:ml-4 px-3 py-1.5 bg-danger/15 text-danger rounded-lg text-sm font-medium hover:bg-danger/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearing ? 'Clearing…' : 'Clear all'}
              </button>
            </div>
          </div>

        </div>{/* end right column */}

      </div>
    </div>
  );
}
