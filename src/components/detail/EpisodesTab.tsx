import { useState, useEffect } from 'react';
import { useSeasonDetail } from '../../api/tmdb';
import { useWatchedEpisodes, toggleEpisodeWatched, markSeasonWatched } from '../../db/hooks';
import { formatDate } from '../../utils/date';
import { useSettings } from '../../hooks/useSettings';
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

export default function EpisodesTab({ tmdbId, totalSeasons, initialSeason = 1, seriesTitle, imdbId, onEpisodeWatched }: Props) {
  const { settings } = useSettings();
  const [season, setSeason] = useState(initialSeason);
  const [recapState, setRecapState] = useState<RecapState>({
    isOpen: false,
    isLoading: false,
    isStreaming: false,
    recap: null,
    error: null,
    episodeTitle: '',
    episodeNumber: 0,
  });

  useEffect(() => {
    setSeason(initialSeason ?? 1);
  }, [initialSeason]);

  const { data, isLoading } = useSeasonDetail(tmdbId, season);
  const watchedEpisodes = useWatchedEpisodes(tmdbId, season);
  const watchedSet = new Set(watchedEpisodes?.map((e) => e.episode) ?? []);

  const today = new Date().toISOString().slice(0, 10);
  const watchableEpisodes = data?.episodes.filter((e) => !e.air_date || e.air_date <= today) ?? [];
  const allWatched = watchableEpisodes.length > 0 && watchableEpisodes.every((e) => watchedSet.has(e.episode_number));

  // The last watched episode in the current season view
  const lastWatchedEpisodeNumber =
    watchedSet.size > 0 ? Math.max(...Array.from(watchedSet)) : null;

  const handleToggleAll = () => {
    if (!data) return;
    if (allWatched) {
      markSeasonWatched(tmdbId, season, []);
    } else {
      markSeasonWatched(tmdbId, season, watchableEpisodes.map((e) => e.episode_number));
      if (onEpisodeWatched && watchableEpisodes.length > 0) {
        const lastEp = watchableEpisodes[watchableEpisodes.length - 1];
        onEpisodeWatched(season, lastEp.episode_number + 1);
      }
    }
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
          const event = JSON.parse(line.slice(6)) as { type: string; content?: string; message?: string };

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
      {/* Season selector */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
          <button
            key={s}
            onClick={() => setSeason(s)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              season === s
                ? 'bg-accent text-white'
                : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-border-subtle'
            }`}
          >
            S{s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-1">
          {/* Mark all button */}
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle mb-3">
            <span className="text-sm text-text-secondary">
              {watchedSet.size}/{watchableEpisodes.length} watched
            </span>
            <button
              onClick={handleToggleAll}
              className="text-xs text-accent hover:underline"
            >
              {allWatched ? 'Unmark all' : 'Mark all watched'}
            </button>
          </div>

          {data?.episodes.map((ep) => {
            const watched = watchedSet.has(ep.episode_number);
            const isFuture = !!ep.air_date && ep.air_date > today;
            const isLastWatched = ep.episode_number === lastWatchedEpisodeNumber;
            return (
              <div
                key={ep.episode_number}
                data-episode={ep.episode_number}
                onClick={() => {
                  if (!isFuture) {
                    toggleEpisodeWatched(tmdbId, season, ep.episode_number);
                    if (!watched) onEpisodeWatched?.(season, ep.episode_number + 1);
                    else onEpisodeWatched?.(season, ep.episode_number);
                  }
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                  isFuture
                    ? 'text-text-muted cursor-default'
                    : watched
                    ? 'bg-accent/10 text-text-primary cursor-pointer hover:bg-accent/15'
                    : 'hover:bg-surface-raised text-text-secondary hover:text-text-primary cursor-pointer'
                } ${isLastWatched ? 'ring-1 ring-accent/40' : ''}`}
              >
                {/* Checkbox / Coming badge */}
                {isFuture ? (
                  <span className="text-[10px] font-bold tracking-widest text-accent border border-accent/50 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                    COMING
                  </span>
                ) : (
                  <div
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition mt-0.5 ${
                      watched ? 'bg-accent border-accent' : 'border-border-subtle'
                    }`}
                  >
                    {watched && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Episode number */}
                <span className="text-xs text-text-muted w-6 flex-shrink-0 mt-0.5">
                  {ep.episode_number}
                </span>

                {/* Title + optional overview */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm block ${settings.showSpoilers && ep.overview ? '' : 'truncate'}`}>{ep.name}</span>
                  {settings.showSpoilers && ep.overview && (
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 mt-0.5">
                      {ep.overview}
                    </p>
                  )}
                </div>

                {/* Right column: date + runtime on top, recap button below */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    {ep.air_date && (
                      <span className="text-xs text-text-muted hidden sm:block">
                        {formatDate(ep.air_date)}
                      </span>
                    )}
                    {ep.runtime && (
                      <span className="text-xs text-text-muted">
                        {ep.runtime}m
                      </span>
                    )}
                  </div>

                  {isLastWatched && imdbId && settings.episodeRecapEnabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecapClick(ep.episode_number, ep.name);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 border border-accent/50 text-accent text-xs font-medium rounded-md hover:bg-accent/10 transition"
                    >
                      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"/>
                      </svg>
                      Recap
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recap modal */}
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
          onClose={handleCloseRecap}
        />
      )}
    </div>
  );
}
