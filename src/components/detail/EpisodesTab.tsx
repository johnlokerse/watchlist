import { useState } from 'react';
import { useSeasonDetail } from '../../api/tmdb';
import { useWatchedEpisodes, toggleEpisodeWatched, markSeasonWatched } from '../../db/hooks';

interface Props {
  tmdbId: number;
  totalSeasons: number;
  initialSeason?: number;
}

export default function EpisodesTab({ tmdbId, totalSeasons, initialSeason = 1 }: Props) {
  const [season, setSeason] = useState(initialSeason);
  const { data, isLoading } = useSeasonDetail(tmdbId, season);
  const watchedEpisodes = useWatchedEpisodes(tmdbId, season);
  const watchedSet = new Set(watchedEpisodes?.map((e) => e.episode) ?? []);
  const allWatched = data ? data.episodes.length > 0 && data.episodes.every((e) => watchedSet.has(e.episode_number)) : false;

  const handleToggleAll = () => {
    if (!data) return;
    if (allWatched) {
      markSeasonWatched(tmdbId, season, []);
    } else {
      markSeasonWatched(tmdbId, season, data.episodes.map((e) => e.episode_number));
    }
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
              {watchedSet.size}/{data?.episodes.length ?? 0} watched
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
            return (
              <button
                key={ep.episode_number}
                onClick={() => toggleEpisodeWatched(tmdbId, season, ep.episode_number)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                  watched
                    ? 'bg-accent/10 text-text-primary'
                    : 'hover:bg-surface-raised text-text-secondary hover:text-text-primary'
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${
                    watched ? 'bg-accent border-accent' : 'border-border-subtle'
                  }`}
                >
                  {watched && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Episode number */}
                <span className="text-xs text-text-muted w-6 flex-shrink-0">
                  {ep.episode_number}
                </span>

                {/* Title */}
                <span className="text-sm flex-1 truncate">{ep.name}</span>

                {/* Air date */}
                {ep.air_date && (
                  <span className="text-xs text-text-muted flex-shrink-0 hidden sm:block">
                    {ep.air_date}
                  </span>
                )}

                {/* Runtime */}
                {ep.runtime && (
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {ep.runtime}m
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
