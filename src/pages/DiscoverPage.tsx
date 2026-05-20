import { useMemo } from 'react';
import { useTrendingMovies, useTrendingSeries, useAnticipatedMovies, useAnticipatedSeries } from '../api/tmdb';
import { useWatchedItems } from '../db/hooks';
import { useSettings } from '../hooks/useSettings';
import type { WatchedStatus } from '../db/models';
import Card from '../components/ui/Card';
import ScrollRow from '../components/ui/ScrollRow';
import SkeletonCard from '../components/ui/SkeletonCard';

export default function DiscoverPage() {
  const movies = useTrendingMovies();
  const series = useTrendingSeries();
  const anticipatedMovies = useAnticipatedMovies();
  const anticipatedSeries = useAnticipatedSeries();
  const libraryItems = useWatchedItems();
  const { settings } = useSettings();

  // Build a map keyed by `${tmdbId}-${contentType}` for O(1) status lookups
  const libraryMap = useMemo(() => {
    const map = new Map<string, WatchedStatus>();
    libraryItems?.forEach((item) => {
      map.set(`${item.tmdbId}-${item.contentType}`, item.status);
    });
    return map;
  }, [libraryItems]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title mb-2">Recommendations and release radar</p>
          <h1 className="page-title">Discover</h1>
        </div>
        <div className="control-surface flex items-center gap-2 px-3 py-2 text-sm text-text-muted">
          <span className="h-2 w-2 rounded-full bg-success" />
          Live TMDB feeds
        </div>
      </div>

      <section className="app-panel p-4">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="section-title">Trending</p>
            <h2 className="mt-1 text-xl font-bold">Shows</h2>
          </div>
          <span className="text-xs font-medium text-text-muted">Top 12</span>
        </div>
        {series.isLoading ? (
          <ScrollRow coverSize={settings.coverSize}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </ScrollRow>
        ) : (
          <ScrollRow coverSize={settings.coverSize}>
            {series.data?.results.slice(0, 12).map((s) => (
              <Card
                key={s.id}
                id={s.id}
                title={s.name}
                posterPath={s.poster_path}
                releaseDate={s.first_air_date}
                voteAverage={s.vote_average}
                type="series"
                status={libraryMap.get(`${s.id}-series`) ?? null}
              />
            ))}
          </ScrollRow>
        )}
      </section>

      <section className="app-panel p-4">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="section-title">Trending</p>
            <h2 className="mt-1 text-xl font-bold">Movies</h2>
          </div>
          <span className="text-xs font-medium text-text-muted">Top 12</span>
        </div>
        {movies.isLoading ? (
          <ScrollRow coverSize={settings.coverSize}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </ScrollRow>
        ) : (
          <ScrollRow coverSize={settings.coverSize}>
            {movies.data?.results.slice(0, 12).map((m) => (
              <Card
                key={m.id}
                id={m.id}
                title={m.title}
                posterPath={m.poster_path}
                releaseDate={m.release_date}
                voteAverage={m.vote_average}
                type="movie"
                status={libraryMap.get(`${m.id}-movie`) ?? null}
              />
            ))}
          </ScrollRow>
        )}
      </section>

      <section className="app-panel p-4">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="section-title">Anticipated</p>
            <h2 className="mt-1 text-xl font-bold">Shows</h2>
          </div>
          <span className="text-xs font-medium text-text-muted">Coming soon</span>
        </div>
        {anticipatedSeries.isLoading ? (
          <ScrollRow coverSize={settings.coverSize}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </ScrollRow>
        ) : (
          <ScrollRow coverSize={settings.coverSize}>
            {anticipatedSeries.data?.results.slice(0, 12).map((s) => (
              <Card
                key={s.id}
                id={s.id}
                title={s.name}
                posterPath={s.poster_path}
                releaseDate={s.first_air_date}
                voteAverage={s.vote_average}
                type="series"
                status={libraryMap.get(`${s.id}-series`) ?? null}
              />
            ))}
          </ScrollRow>
        )}
      </section>

      <section className="app-panel p-4">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="section-title">Anticipated</p>
            <h2 className="mt-1 text-xl font-bold">Movies</h2>
          </div>
          <span className="text-xs font-medium text-text-muted">Coming soon</span>
        </div>
        {anticipatedMovies.isLoading ? (
          <ScrollRow coverSize={settings.coverSize}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </ScrollRow>
        ) : (
          <ScrollRow coverSize={settings.coverSize}>
            {anticipatedMovies.data?.results.slice(0, 12).map((m) => (
              <Card
                key={m.id}
                id={m.id}
                title={m.title}
                posterPath={m.poster_path}
                releaseDate={m.release_date}
                voteAverage={m.vote_average}
                type="movie"
                status={libraryMap.get(`${m.id}-movie`) ?? null}
              />
            ))}
          </ScrollRow>
        )}
      </section>
    </div>
  );
}
