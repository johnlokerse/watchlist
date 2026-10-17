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
        <span className="t-callout text-text-secondary">Watched on:</span>
        {watchedAt ? (
          <input
            type="date"
            value={watchedAt.slice(0, 10)}
            onChange={(e) => handleDateChange(e.target.value)}
            className="field w-auto"
            aria-label="Watched on date"
          />
        ) : (
          <span className="t-callout text-text-muted">Not recorded yet</span>
        )}
        <button
          onClick={() => setShowLogForm((v) => !v)}
          aria-expanded={showLogForm}
          className="press min-h-9 rounded-[10px] bg-accent/15 px-3.5 text-[0.875rem] font-semibold text-accent hover:bg-accent/25"
        >
          Log rewatch
        </button>
      </div>

      {showLogForm && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="t-caption">Date</label>
            <input
              type="date"
              value={rewatchDate}
              onChange={(e) => setRewatchDate(e.target.value)}
              className="field w-auto"
              aria-label="Rewatch date"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
            <label className="t-caption">Note (optional)</label>
            <input
              type="text"
              value={rewatchNote}
              onChange={(e) => setRewatchNote(e.target.value)}
              placeholder="e.g. with friends"
              className="field"
            />
          </div>
          <button
            onClick={handleLogRewatch}
            className="press min-h-10 rounded-[10px] bg-accent px-4 text-[0.875rem] font-semibold text-on-accent hover:bg-accent-hover"
          >
            Save rewatch
          </button>
        </div>
      )}

      {count > 0 && (
        <div className="space-y-1">
          <p className="t-callout num text-text-secondary">
            Watched {count}×{last ? ` — last on ${formatDate(last)}` : ''}
          </p>
          <ul className="space-y-1">
            {log!.map((entry) => (
              <li key={entry.id} className="t-callout flex min-h-9 items-center gap-2 text-text-muted">
                <span className="text-text-primary">{formatDate(entry.watchedAt)}</span>
                {entry.note && <span>— {entry.note}</span>}
                <button
                  onClick={() => removeWatchLogEntry(entry.id)}
                  aria-label="Delete rewatch entry"
                  className="press hit-44 ml-auto grid h-7 w-7 place-items-center rounded-full text-danger hover:bg-danger/10"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
