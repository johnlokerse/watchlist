import { useState } from 'react';
import type { ContentType } from '../../db/models';
import { useWatchLog, addWatchLogEntry, removeWatchLogEntry, updateWatchedItem } from '../../db/hooks';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface WatchHistoryProps {
  itemId: number;
  tmdbId: number;
  contentType: ContentType;
  watchedAt: string | null;
}

export default function WatchHistory({ itemId, tmdbId, contentType, watchedAt }: WatchHistoryProps) {
  const log = useWatchLog(tmdbId, contentType);
  const [showLogForm, setShowLogForm] = useState(false);
  const [rewatchDate, setRewatchDate] = useState('');
  const [rewatchNote, setRewatchNote] = useState('');

  const handleDateChange = async (value: string) => {
    if (!value) return;
    await updateWatchedItem(itemId, { watchedAt: new Date(value).toISOString() });
  };

  const handleLogRewatch = async () => {
    await addWatchLogEntry({
      tmdbId,
      contentType,
      watchedAt: rewatchDate ? new Date(rewatchDate).toISOString() : undefined,
      note: rewatchNote.trim() || undefined,
    });
    setRewatchDate('');
    setRewatchNote('');
    setShowLogForm(false);
  };

  const count = log?.length ?? 0;
  const last = count > 0 ? log![0].watchedAt : watchedAt;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-secondary">Watched on:</span>
        {watchedAt ? (
          <input
            type="date"
            value={watchedAt.slice(0, 10)}
            onChange={(e) => handleDateChange(e.target.value)}
            className="bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary"
            aria-label="Watched on date"
          />
        ) : (
          <span className="text-sm text-text-muted">Not recorded yet</span>
        )}
        <button
          onClick={() => setShowLogForm((v) => !v)}
          className="px-3 py-1.5 bg-accent/15 text-accent rounded-lg text-sm hover:bg-accent/25 transition"
        >
          Log rewatch
        </button>
      </div>

      {showLogForm && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Date</label>
            <input
              type="date"
              value={rewatchDate}
              onChange={(e) => setRewatchDate(e.target.value)}
              className="bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary"
              aria-label="Rewatch date"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
            <label className="text-xs text-text-muted">Note (optional)</label>
            <input
              type="text"
              value={rewatchNote}
              onChange={(e) => setRewatchNote(e.target.value)}
              placeholder="e.g. with friends"
              className="bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <button
            onClick={handleLogRewatch}
            className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition"
          >
            Save rewatch
          </button>
        </div>
      )}

      {count > 0 && (
        <div className="space-y-1">
          <p className="text-sm text-text-secondary">
            Watched {count}×{last ? ` — last on ${formatDate(last)}` : ''}
          </p>
          <ul className="space-y-1">
            {log!.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 text-sm text-text-muted">
                <span className="text-text-primary">{formatDate(entry.watchedAt)}</span>
                {entry.note && <span>— {entry.note}</span>}
                <button
                  onClick={() => removeWatchLogEntry(entry.id)}
                  aria-label="Delete rewatch entry"
                  className="ml-auto text-danger hover:text-danger/80 transition px-1"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
