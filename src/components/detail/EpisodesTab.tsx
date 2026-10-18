import { useRef, useState } from 'react';
import { m } from 'motion/react';
import { useSeasonDetail } from '../../api/tmdb';
import { useWatchedEpisodes, toggleEpisodeWatched, markSeasonWatched } from '../../db/hooks';
import { formatDate, toLocalISODate } from '../../utils/date';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { appleSpring } from '../../design/motion';
import SegmentedControl from '../ui/SegmentedControl';
import RecapModal from './RecapModal';

interface Props {
  tmdbId: number;
  totalSeasons: number;
  initialSeason?: number;
  seriesTitle: string;
  imdbId?: string;
  onEpisodeWatched?: (season: number, episode: number) => void;
}

interface RecapState {
  isOpen: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  recap: string | null;
  error: string | null;
  episodeTitle: string;
  episodeNumber: number;
}

const checkPop = appleSpring(0.3, 0.6);

function EpisodeCheck({ checked }: { checked: boolean }) {
  return (
    <m.span
      className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full transition-colors duration-150 ${
        checked ? 'bg-accent text-on-accent' : 'text-transparent shadow-[inset_0_0_0_2px_var(--color-border-strong)]'
      }`}
      initial={false}
      animate={{ scale: checked ? [0.86, 1] : 1 }}
      transition={checkPop}
      aria-hidden="true"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <m.path
          d="m3 8.5 3.2 3L13 4.5"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: checked ? 0.05 : 0 }}
        />
      </svg>
    </m.span>
  );
}

export default function EpisodesTab({ tmdbId, totalSeasons, initialSeason = 1, seriesTitle, imdbId, onEpisodeWatched }: Props) {
  const { settings } = useSettings();
  const toast = useToast();
  const recapTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Follow initialSeason when it changes, without a sync effect.
  const [seasonState, setSeasonState] = useState({ base: initialSeason, season: initialSeason });
  const season = seasonState.base === initialSeason ? seasonState.season : initialSeason;
  const setSeason = (next: number) => setSeasonState({ base: initialSeason, season: next });
  // Optimistic episode state: applied immediately, reconciled when the server answers.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [recapState, setRecapState] = useState<RecapState>({
    isOpen: false,
    isLoading: false,
    isStreaming: false,
    recap: null,
    error: null,
    episodeTitle: '',
    episodeNumber: 0,
  });

  const { data, isLoading, isPlaceholderData } = useSeasonDetail(tmdbId, season);
  const watchedEpisodes = useWatchedEpisodes(tmdbId, season);
  const serverSet = new Set(watchedEpisodes?.map((e) => e.episode) ?? []);
  const isWatched = (episode: number) => overrides.get(`${season}-${episode}`) ?? serverSet.has(episode);
  const episodes = data?.episodes ?? [];
  const watchedSet = new Set(episodes.map((e) => e.episode_number).filter(isWatched));

  const today = toLocalISODate();
  const watchableEpisodes = episodes.filter((e) => !e.air_date || e.air_date <= today);
  const allWatched = watchableEpisodes.length > 0 && watchableEpisodes.every((e) => watchedSet.has(e.episode_number));
  const watchedCount = watchableEpisodes.filter((e) => watchedSet.has(e.episode_number)).length;

  // The last watched episode in the current season view
  const lastWatchedEpisodeNumber =
    watchedSet.size > 0 ? Math.max(...Array.from(watchedSet)) : null;

  const setOverride = (key: string, value: boolean | null) =>
    setOverrides((prev) => {
      const next = new Map(prev);
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    });

  const handleToggleEpisode = async (episode: number) => {
    const key = `${season}-${episode}`;
    const wasWatched = isWatched(episode);
    setOverride(key, !wasWatched);
    if (!wasWatched) onEpisodeWatched?.(season, episode + 1);
    else onEpisodeWatched?.(season, episode);
    try {
      await toggleEpisodeWatched(tmdbId, season, episode);
      // Give the refetch a moment before dropping the optimistic value.
      window.setTimeout(() => setOverride(key, null), 1500);
    } catch {
      setOverride(key, null);
      toast.show({ message: "Couldn't update that episode. Try again.", tone: 'error' });
    }
  };

  const handleToggleAll = () => {
    if (!data) return;
    const previous = Array.from(watchedSet);
    const previousNext = previous.length > 0 ? Math.max(...previous) + 1 : watchableEpisodes[0]?.episode_number ?? 1;
    setOverrides(new Map());
    if (allWatched) {
      markSeasonWatched(tmdbId, season, []);
      // Roll series progress back, mirroring the single-episode unmark.
      if (onEpisodeWatched && watchableEpisodes.length > 0) {
        onEpisodeWatched(season, watchableEpisodes[0].episode_number);
      }
    } else {
      markSeasonWatched(tmdbId, season, watchableEpisodes.map((e) => e.episode_number));
      if (onEpisodeWatched && watchableEpisodes.length > 0) {
        const lastEp = watchableEpisodes[watchableEpisodes.length - 1];
        onEpisodeWatched(season, lastEp.episode_number + 1);
      }
    }
    const changed = allWatched ? previous.length : watchableEpisodes.length - previous.length;
    toast.show({
      message: allWatched
        ? `Unmarked ${changed} episode${changed === 1 ? '' : 's'}`
        : `Marked ${changed} episode${changed === 1 ? '' : 's'} as watched`,
      action: {
        label: 'Undo',
        onClick: () => {
          markSeasonWatched(tmdbId, season, previous);
          onEpisodeWatched?.(season, previousNext);
        },
      },
    });
  };

  const handleRecapClick = async (episodeNumber: number, episodeTitle: string) => {
    setRecapState({
      isOpen: true,
      isLoading: true,
      isStreaming: false,
      recap: null,
      error: null,
      episodeTitle,
      episodeNumber,
    });

    try {
      const res = await fetch('/api/recap/episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imdbId,
          seasonNumber: season,
          episodeNumber,
          episodeTitle,
          seriesTitle,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json() as { error?: string };
        setRecapState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: data.error ?? 'Failed to generate recap.',
        }));
        return;
      }

      // Switch from spinner to streaming text
      setRecapState((prev) => ({ ...prev, isLoading: false, isStreaming: true }));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: { type: string; content?: string; message?: string };
          try {
            event = JSON.parse(line.slice(6)) as { type: string; content?: string; message?: string };
          } catch {
            // Skip malformed SSE payloads instead of aborting the whole stream.
            continue;
          }

          if (event.type === 'delta' && event.content) {
            setRecapState((prev) => ({
              ...prev,
              recap: (prev.recap ?? '') + event.content,
            }));
          } else if (event.type === 'done') {
            setRecapState((prev) => ({ ...prev, isStreaming: false }));
          } else if (event.type === 'error') {
            setRecapState((prev) => ({
              ...prev,
              isStreaming: false,
              error: event.message ?? 'Failed to generate recap.',
            }));
          }
        }
      }

      // The stream can end without a 'done' event; never leave the recap spinning.
      setRecapState((prev) => ({ ...prev, isStreaming: false }));
    } catch {
      setRecapState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: 'Something went wrong. Please try again.',
      }));
    }
  };

  const handleCloseRecap = () => {
    setRecapState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="space-y-4">
      {totalSeasons > 1 && (
        <SegmentedControl
          options={Array.from({ length: totalSeasons }, (_, i) => ({ value: String(i + 1), label: `S${i + 1}` }))}
          value={String(season)}
          onChange={(value) => setSeason(Number(value))}
          ariaLabel="Season"
        />
      )}

      {isLoading && !data ? (
        <div className="grouped" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grouped-row gap-3">
              <div className="skeleton h-[26px] w-[26px] rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-1/2 rounded" />
                <div className="skeleton h-3 w-1/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`space-y-3 transition-opacity duration-200 ${isPlaceholderData ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="min-w-0 flex-1">
              <p className="t-callout num font-semibold text-text-primary">
                {watchedCount}/{watchableEpisodes.length} watched
              </p>
              <div className="mt-1.5 h-1.5 max-w-56 overflow-hidden rounded-full bg-fill">
                <m.div
                  className="h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: `${watchableEpisodes.length ? (watchedCount / watchableEpisodes.length) * 100 : 0}%` }}
                  transition={appleSpring(0.4)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleAll}
              disabled={watchableEpisodes.length === 0}
              className="press hit-44 min-h-8 shrink-0 rounded-full px-3 text-[0.875rem] font-semibold text-accent hover:bg-accent/10 disabled:opacity-40"
            >
              {allWatched ? 'Unmark all' : 'Mark all watched'}
            </button>
          </div>

          <div className="grouped">
            {episodes.map((ep) => {
              const watched = watchedSet.has(ep.episode_number);
              const isFuture = !!ep.air_date && ep.air_date > today;
              const isLastWatched = ep.episode_number === lastWatchedEpisodeNumber;
              return (
                <div
                  key={ep.episode_number}
                  data-episode={ep.episode_number}
                  onClick={(event) => {
                    if (isFuture || (event.target as HTMLElement).closest('[data-recap]')) return;
                    void handleToggleEpisode(ep.episode_number);
                  }}
                  className={`grouped-row items-start gap-3 py-3 transition-[background-color,transform] duration-100 ${
                    isFuture
                      ? 'cursor-default'
                      : 'cursor-pointer active:scale-[0.99] active:bg-fill [@media(hover:hover)]:hover:bg-fill'
                  }`}
                >
                  {isFuture ? (
                    <span className="t-micro mt-0.5 shrink-0 rounded-md bg-accent/15 px-1.5 py-1 uppercase text-accent">
                      Soon
                    </span>
                  ) : (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={watched}
                      aria-label={`Episode ${ep.episode_number}: ${ep.name}`}
                      className="hit-44 shrink-0 rounded-full"
                      onClick={(event) => {
                        // Pointer clicks bubble to the row; keyboard activation (detail 0) toggles here.
                        if (event.detail !== 0) return;
                        event.stopPropagation();
                        void handleToggleEpisode(ep.episode_number);
                      }}
                    >
                      <EpisodeCheck checked={watched} />
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className={`text-[0.9375rem] font-semibold tracking-[-0.01em] ${isFuture ? 'text-text-muted' : 'text-text-primary'} ${settings.showSpoilers && ep.overview ? '' : 'truncate'}`}>
                      <span className="num mr-1.5 text-text-muted">{ep.episode_number}</span>
                      {ep.name}
                    </p>
                    <p className="t-caption num mt-0.5">
                      {[ep.air_date ? formatDate(ep.air_date) : null, ep.runtime ? `${ep.runtime} min` : null].filter(Boolean).join(' · ')}
                    </p>
                    {settings.showSpoilers && ep.overview && (
                      <p className="t-caption mt-1 line-clamp-2 text-text-secondary">{ep.overview}</p>
                    )}
                  </div>

                  {isLastWatched && imdbId && settings.episodeRecapEnabled && (
                    <button
                      type="button"
                      data-recap
                      onClick={(e) => {
                        e.stopPropagation();
                        recapTriggerRef.current = e.currentTarget;
                        handleRecapClick(ep.episode_number, ep.name);
                      }}
                      className="press hit-44 inline-flex min-h-8 shrink-0 items-center gap-1 self-center rounded-full bg-accent/15 px-3 text-[0.8125rem] font-semibold text-accent hover:bg-accent/25"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                      </svg>
                      AI Recap
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recapState.isOpen && (
        <RecapModal
          seriesTitle={seriesTitle}
          seasonNumber={season}
          episodeNumber={recapState.episodeNumber}
          episodeTitle={recapState.episodeTitle}
          recap={recapState.recap}
          isLoading={recapState.isLoading}
          isStreaming={recapState.isStreaming}
          error={recapState.error}
          hideSpoilers={!settings.showSpoilers}
          originRef={recapTriggerRef}
          onRegenerate={() => handleRecapClick(recapState.episodeNumber, recapState.episodeTitle)}
          onClose={handleCloseRecap}
        />
      )}
    </div>
  );
}
