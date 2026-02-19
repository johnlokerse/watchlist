import { useRef, useState } from 'react';
import { clearLibrary, addToLibrary, exportLibrary } from '../db/hooks';
import { db } from '../db/database';
import type { WatchedStatus, ContentType } from '../db/models';

const EXAMPLE_JSON = JSON.stringify(
  [
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
}

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      const entries: ImportEntry[] = JSON.parse(text);
      if (!Array.isArray(entries)) throw new Error('JSON must be an array of entries.');
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
          userRating: null,
          notes: '',
          genreIds: [],
        });
        id ? added++ : skipped++;
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
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="bg-surface-raised rounded-xl border border-border-subtle p-6 space-y-4">
        <p className="text-text-secondary text-sm">Settings will be available in a future update.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Country</span>
            <span className="text-sm text-text-muted">NL (default)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Show Spoilers</span>
            <span className="text-sm text-text-muted">Off</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-raised rounded-xl border border-border-subtle p-6 space-y-4">
        <h2 className="text-base font-semibold">Export Library</h2>
        <p className="text-text-secondary text-xs">
          Download your full library as a JSON file. You can import it on another device using the Import from JSON feature.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? 'Exporting…' : 'Export to JSON'}
        </button>
      </div>

      <div className="bg-surface-raised rounded-xl border border-border-subtle p-6 space-y-4">
        <h2 className="text-base font-semibold">Import from JSON</h2>
        <p className="text-text-secondary text-xs">
          Upload a <code className="bg-surface px-1 rounded">.json</code> file containing an array of movies or series to add to your library. Existing entries (same TMDB ID) are skipped.
        </p>

        <details className="group">
          <summary className="text-xs text-accent cursor-pointer select-none hover:underline">Show example JSON</summary>
          <pre className="mt-2 text-xs bg-surface rounded-lg p-3 overflow-x-auto text-text-secondary leading-relaxed">
            {EXAMPLE_JSON}
          </pre>
          <p className="mt-2 text-xs text-text-muted">
            Valid <code className="bg-surface px-1 rounded">contentType</code>: <code className="bg-surface px-1 rounded">movie</code> | <code className="bg-surface px-1 rounded">series</code><br />
            Valid <code className="bg-surface px-1 rounded">status</code>: <code className="bg-surface px-1 rounded">watched</code> | <code className="bg-surface px-1 rounded">plan_to_watch</code> | <code className="bg-surface px-1 rounded">watching</code> | <code className="bg-surface px-1 rounded">dropped</code>
          </p>
        </details>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          disabled={importing}
          className="w-full text-sm text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-accent file:text-white file:text-sm file:font-medium hover:file:bg-accent-hover file:cursor-pointer disabled:opacity-50"
        />

        {importing && <p className="text-xs text-text-muted">Importing…</p>}
        {importResult && (
          <p className="text-xs text-success">
            ✓ Added {importResult.added} item{importResult.added !== 1 ? 's' : ''}{importResult.skipped > 0 ? `, skipped ${importResult.skipped}` : ''}.
          </p>
        )}
        {importError && <p className="text-xs text-danger">✗ {importError}</p>}
      </div>

      <div className="bg-surface-raised rounded-xl border border-border-subtle p-6 space-y-4">
        <h2 className="text-base font-semibold">Migrate from IndexedDB</h2>
        <p className="text-text-secondary text-xs">
          One-time migration: copy all data from IndexedDB (Dexie) to the new SQLite database on the server. Your IndexedDB data stays intact as a backup.
        </p>
        <button
          onClick={async () => {
            setMigrating(true);
            setMigrateResult(null);
            try {
              const items = await db.watchedItems.toArray();
              const progress = await db.seriesProgress.toArray();
              const episodes = await db.watchedEpisodes.toArray();
              const res = await fetch('/api/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, progress, episodes }),
              });
              if (!res.ok) throw new Error(await res.text());
              setMigrateResult(`✓ Migrated ${items.length} items, ${progress.length} progress records, ${episodes.length} episodes.`);
            } catch (err) {
              setMigrateResult(`✗ ${err instanceof Error ? err.message : String(err)}`);
            } finally {
              setMigrating(false);
            }
          }}
          disabled={migrating}
          className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {migrating ? 'Migrating…' : 'Migrate to SQLite'}
        </button>
        {migrateResult && <p className="text-xs text-text-secondary">{migrateResult}</p>}
      </div>

      <div className="bg-surface-raised rounded-xl border border-danger/30 p-6 space-y-3">
        <h2 className="text-base font-semibold text-danger">Danger Zone</h2>
        <p className="text-text-secondary text-xs">Permanently removes all library data including watch history, ratings, and episode progress.</p>
        <button
          onClick={handleClear}
          disabled={clearing}
          className="w-full px-4 py-2 bg-danger/15 text-danger rounded-lg text-sm font-medium hover:bg-danger/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? 'Clearing…' : 'Clear All Library Data'}
        </button>
      </div>
    </div>
  );
}
