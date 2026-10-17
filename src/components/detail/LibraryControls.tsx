import { useState, type ReactNode } from 'react';
import type { WatchedItem, WatchedStatus } from '../../db/models';
import { STATUS_OPTIONS } from '../../utils/constants';
import Menu from '../ui/Menu';
import Select from '../ui/Select';
import RatingStars from '../ui/RatingStars';
import SavedIndicator from '../ui/SavedIndicator';
import { buttonClasses } from '../ui/buttonStyles';
import { useSavedFlash } from '../../hooks/useSavedFlash';

interface ActionsProps {
  item: WatchedItem | undefined;
  addOrder: WatchedStatus[];
  onAdd: (status: WatchedStatus) => void;
  onStatusChange: (status: WatchedStatus) => Promise<void> | void;
  onRemove: () => void;
}

/** Primary actions under the hero: add menu, or status picker + more menu. */
export function LibraryActions({ item, addOrder, onAdd, onStatusChange, onRemove }: ActionsProps) {
  const [saved, flash] = useSavedFlash();

  if (!item) {
    return (
      <Menu
        label="Add to Library"
        items={addOrder.map((status) => ({
          id: status,
          label: STATUS_OPTIONS.find((o) => o.value === status)!.label,
          onSelect: () => onAdd(status),
        }))}
        trigger={(props) => (
          <button type="button" {...props} className={buttonClasses('primary', 'lg')}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add to Library
          </button>
        )}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        ariaLabel="Library status"
        tone="tinted"
        className="[&_select]:min-h-11 [&_select]:rounded-xl [&_select]:text-[0.9375rem]"
        options={STATUS_OPTIONS}
        value={item.status}
        onChange={async (value) => {
          await onStatusChange(value as WatchedStatus);
          flash();
        }}
      />
      <Menu
        label="More actions"
        align="start"
        items={[{ id: 'remove', label: 'Remove from Library', destructive: true, onSelect: onRemove }]}
        trigger={(props) => (
          <button type="button" {...props} aria-label="More actions" className={buttonClasses('secondary', 'lg', 'w-11 !px-0')}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2.1" />
              <circle cx="12" cy="12" r="2.1" />
              <circle cx="19" cy="12" r="2.1" />
            </svg>
          </button>
        )}
      />
      <SavedIndicator show={saved} />
    </div>
  );
}

interface PanelProps {
  item: WatchedItem;
  notes: string;
  onNotesChange: (value: string) => void;
  onSaveNotes: () => Promise<void>;
  onRate: (rating: number) => Promise<void>;
  /** Extra rows above the rating (series progress). */
  leading?: ReactNode;
  /** Watch history, shown in a disclosure. */
  history?: ReactNode;
}

/** "In your library" grouped list: everything that changes this one item, in one place. */
export function LibraryPanel({ item, notes, onNotesChange, onSaveNotes, onRate, leading, history }: PanelProps) {
  const [ratingSaved, flashRating] = useSavedFlash();
  const [notesSaved, flashNotes] = useSavedFlash();
  const [historyOpen, setHistoryOpen] = useState(false);
  const notesDirty = notes !== (item.notes ?? '');

  return (
    <section className="mb-8 space-y-2" aria-label="In your library">
      <h2 className="section-title px-1">In your library</h2>
      <div className="grouped">
        {leading}
        <div className="grouped-row flex-wrap justify-between">
          <span className="t-body text-text-primary">Your Rating</span>
          <div className="flex items-center gap-2">
            <SavedIndicator show={ratingSaved} />
            <RatingStars
              value={item.userRating}
              onChange={async (rating) => {
                await onRate(rating);
                flashRating();
              }}
              size="sm"
            />
            <span className="t-callout num w-7 text-right font-semibold text-text-secondary">
              {item.userRating ? item.userRating / 2 : '–'}
            </span>
          </div>
        </div>
        <div className="grouped-row flex-col items-stretch gap-2 py-3">
          <label htmlFor={`notes-${item.id}`} className="t-body text-text-primary">Notes</label>
          <div className="flex items-center gap-2">
            <input
              id={`notes-${item.id}`}
              type="text"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && notesDirty) {
                  await onSaveNotes();
                  flashNotes();
                }
              }}
              placeholder="Add personal notes..."
              className="field"
            />
            <button
              type="button"
              disabled={!notesDirty}
              onClick={async () => {
                await onSaveNotes();
                flashNotes();
              }}
              className={buttonClasses('tinted', 'md')}
            >
              Save
            </button>
          </div>
          <SavedIndicator show={notesSaved} />
        </div>
        {history && (
          <div>
            <button
              type="button"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((v) => !v)}
              className="grouped-row w-full justify-between text-left transition-colors active:bg-fill [@media(hover:hover)]:hover:bg-fill"
            >
              <span className="t-body text-text-primary">Watch history</span>
              <svg
                className={`h-4 w-4 text-text-muted transition-transform duration-200 ${historyOpen ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            {historyOpen && <div className="px-4 pb-4">{history}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
