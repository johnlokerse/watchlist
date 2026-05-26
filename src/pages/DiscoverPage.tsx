import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrendingMovies, useTrendingSeries, useAnticipatedMovies, useAnticipatedSeries } from '../api/tmdb';
import { useWatchedItems } from '../db/hooks';
import { useSettings } from '../hooks/useSettings';
import type { CoverSize } from '../hooks/useSettings';
import type { TMDBMovie, TMDBSeries } from '../api/types';
import type { WatchedStatus } from '../db/models';
import Card from '../components/ui/Card';
import ScrollRow from '../components/ui/ScrollRow';
import SkeletonCard from '../components/ui/SkeletonCard';
import SearchBar from '../components/ui/SearchBar';
import SegmentedControl from '../components/ui/SegmentedControl';
import { formatDate } from '../utils/date';
import { posterUrl } from '../utils/image';

type ContentFilter = 'all' | 'movies' | 'series';

interface DiscoveryItem {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  overview: string;
  type: 'movie' | 'series';
  status: WatchedStatus | null;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function movieMatches(movie: TMDBMovie, query: string) {
  if (!query) return true;
  return `${movie.title} ${movie.overview} ${movie.release_date}`.toLowerCase().includes(query);
}

function seriesMatches(series: TMDBSeries, query: string) {
  if (!query) return true;
  return `${series.name} ${series.overview} ${series.first_air_date}`.toLowerCase().includes(query);
}

function movieToDiscoveryItem(movie: TMDBMovie, status: WatchedStatus | null): DiscoveryItem {
  return {
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
    overview: movie.overview,
    type: 'movie',
    status,
  };
}

function seriesToDiscoveryItem(series: TMDBSeries, status: WatchedStatus | null): DiscoveryItem {
  return {
    id: series.id,
    title: series.name,
    posterPath: series.poster_path,
    releaseDate: series.first_air_date,
    voteAverage: series.vote_average,
    overview: series.overview,
    type: 'series',
    status,
  };
}

function itemHref(item: DiscoveryItem) {
  return item.type === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
}

function DiscoverySpotlight({ item, totalMatches }: { item?: DiscoveryItem; totalMatches: number }) {
  if (!item) {
    return (
      <div className="app-panel-soft flex min-h-[220px] items-center justify-center p-4 text-center text-sm text-text-muted">
        No matching titles in the current feeds.
      </div>
    );
  }

  const poster = posterUrl(item.posterPath, 'w185');

  return (
    <div className="app-panel-soft grid gap-4 p-4 sm:grid-cols-[96px_1fr]">
      <div className="aspect-[2/3] w-24 overflow-hidden rounded-lg border border-border-subtle bg-surface-overlay">
        {poster ? (
          <img src={poster} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-text-muted">N/A</div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-border-subtle bg-surface-overlay px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Focus
          </span>
          <span className="text-xs font-semibold text-warning">★ {item.voteAverage.toFixed(1)}</span>
          {item.status && (
            <span className="rounded-md bg-accent/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
              In Library
            </span>
          )}
        </div>
        <h2 className="mt-3 line-clamp-2 text-2xl font-bold leading-tight text-text-primary">{item.title}</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {item.type === 'movie' ? 'Movie' : 'Series'} · {item.releaseDate ? formatDate(item.releaseDate) : 'TBA'} · {totalMatches} matches
        </p>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">{item.overview || 'No overview available yet.'}</p>
        <Link
          to={itemHref(item)}
          className="mt-4 inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover"
        >
          Open Details
        </Link>
      </div>
    </div>
  );
}

function DiscoverySection({
  eyebrow,
  title,
  meta,
  isLoading,
  items,
  coverSize,
}: {
  eyebrow: string;
  title: 'Shows' | 'Movies';
  meta: string;
  isLoading: boolean;
  items: DiscoveryItem[];
  coverSize: CoverSize;
}) {
  return (
    <section className="app-panel p-4">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="section-title">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-bold">{title}</h2>
        </div>
        <span className="text-xs font-medium text-text-muted">{meta}</span>
      </div>
      {isLoading ? (
        <ScrollRow coverSize={coverSize}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </ScrollRow>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-overlay p-6 text-center text-sm text-text-muted">
          No matches in this feed.
        </div>
      ) : (
        <ScrollRow coverSize={coverSize}>
          {items.slice(0, 12).map((item) => (
            <Card
              key={`${item.type}-${item.id}`}
              id={item.id}
              title={item.title}
              posterPath={item.posterPath}
              releaseDate={item.releaseDate}
              voteAverage={item.voteAverage}
              type={item.type}
              status={item.status}
            />
          ))}
        </ScrollRow>
      )}
    </section>
  );
}

export default function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const movies = useTrendingMovies();
  const series = useTrendingSeries();
  const anticipatedMovies = useAnticipatedMovies();
  const anticipatedSeries = useAnticipatedSeries();
  const libraryItems = useWatchedItems();
  const { settings } = useSettings();
  const normalizedQuery = normalize(query);

  // Build a map keyed by `${tmdbId}-${contentType}` for O(1) status lookups
  const libraryMap = useMemo(() => {
    const map = new Map<string, WatchedStatus>();
    libraryItems?.forEach((item) => {
      map.set(`${item.tmdbId}-${item.contentType}`, item.status);
    });
    return map;
  }, [libraryItems]);

  const trendingShows = useMemo(
    () =>
      (series.data?.results ?? [])
        .filter((item) => seriesMatches(item, normalizedQuery))
        .map((item) => seriesToDiscoveryItem(item, libraryMap.get(`${item.id}-series`) ?? null)),
    [libraryMap, normalizedQuery, series.data],
  );

  const trendingMovies = useMemo(
    () =>
      (movies.data?.results ?? [])
        .filter((item) => movieMatches(item, normalizedQuery))
        .map((item) => movieToDiscoveryItem(item, libraryMap.get(`${item.id}-movie`) ?? null)),
    [libraryMap, normalizedQuery, movies.data],
  );

  const upcomingShows = useMemo(
    () =>
      (anticipatedSeries.data?.results ?? [])
        .filter((item) => seriesMatches(item, normalizedQuery))
        .map((item) => seriesToDiscoveryItem(item, libraryMap.get(`${item.id}-series`) ?? null)),
    [anticipatedSeries.data, libraryMap, normalizedQuery],
  );

  const upcomingMovies = useMemo(
    () =>
      (anticipatedMovies.data?.results ?? [])
        .filter((item) => movieMatches(item, normalizedQuery))
        .map((item) => movieToDiscoveryItem(item, libraryMap.get(`${item.id}-movie`) ?? null)),
    [anticipatedMovies.data, libraryMap, normalizedQuery],
  );

  const showMovies = contentFilter === 'all' || contentFilter === 'movies';
  const showSeries = contentFilter === 'all' || contentFilter === 'series';
  const tmdbFeedError = movies.isError || series.isError || anticipatedMovies.isError || anticipatedSeries.isError;
  const showMissingTokenBanner = tmdbFeedError && settings.tmdbApiToken.trim().length === 0;
  const visibleItems = [
    ...(showSeries ? trendingShows : []),
    ...(showMovies ? trendingMovies : []),
    ...(showSeries ? upcomingShows : []),
    ...(showMovies ? upcomingMovies : []),
  ];
  const spotlight = visibleItems.find((item) => !item.status) ?? visibleItems[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title mb-2">Recommendations and release radar</p>
          <h1 className="page-title">Discover</h1>
        </div>
      </div>

      {showMissingTokenBanner && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">TMDB API token required</p>
          <p className="mt-1">Add your TMDB API token in Settings to load Discover feeds, searches, and title details.</p>
          <Link to="/settings" className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline">
            Open Settings
          </Link>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="app-panel p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search trending and anticipated..."
              />
            </div>
            <SegmentedControl
              options={[
                { value: 'all', label: 'All' },
                { value: 'movies', label: 'Movies' },
                { value: 'series', label: 'Series' },
              ]}
              value={contentFilter}
              onChange={(value) => setContentFilter(value as ContentFilter)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-text-muted">
            <span className="rounded-md border border-border-subtle bg-surface-overlay px-2 py-1">
              {visibleItems.length} visible
            </span>
            <span className="rounded-md border border-border-subtle bg-surface-overlay px-2 py-1">
              {visibleItems.filter((item) => item.status).length} already in library
            </span>
          </div>
        </div>
        <DiscoverySpotlight item={spotlight} totalMatches={visibleItems.length} />
      </div>

      {showSeries && (
        <DiscoverySection
          eyebrow="Trending"
          title="Shows"
          meta="Top 12"
          isLoading={series.isLoading}
          items={trendingShows}
          coverSize={settings.coverSize}
        />
      )}

      {showMovies && (
        <DiscoverySection
          eyebrow="Trending"
          title="Movies"
          meta="Top 12"
          isLoading={movies.isLoading}
          items={trendingMovies}
          coverSize={settings.coverSize}
        />
      )}

      {showSeries && (
        <DiscoverySection
          eyebrow="Anticipated"
          title="Shows"
          meta="Coming soon"
          isLoading={anticipatedSeries.isLoading}
          items={upcomingShows}
          coverSize={settings.coverSize}
        />
      )}

      {showMovies && (
        <DiscoverySection
          eyebrow="Anticipated"
          title="Movies"
          meta="Coming soon"
          isLoading={anticipatedMovies.isLoading}
          items={upcomingMovies}
          coverSize={settings.coverSize}
        />
      )}
    </div>
  );
}
