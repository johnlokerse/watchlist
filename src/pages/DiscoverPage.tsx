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
import { posterUrl, backdropUrl } from '../utils/image';

type ContentFilter = 'all' | 'movies' | 'series';

interface DiscoveryItem {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
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
    backdropPath: movie.backdrop_path,
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
    backdropPath: series.backdrop_path,
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
      <div className="flex min-h-[300px] items-center justify-center p-4 text-center text-sm text-text-muted">
        No matching titles in the current feeds.
      </div>
    );
  }

  const backdrop = backdropUrl(item.backdropPath, 'w780') ?? posterUrl(item.posterPath, 'w780');

  return (
    <Link
      to={itemHref(item)}
      className="discover-spotlight group relative flex min-h-[300px] flex-col justify-end overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      {backdrop ? (
        <img
          src={backdrop}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-overlay" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />
      {/* Side fades so the banner melts seamlessly into the page background (dark themes only) */}
      <div className="discover-spotlight-fade pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--color-surface)] to-transparent" />
      <div className="discover-spotlight-fade pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--color-surface)] to-transparent" />
      <div className="relative p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="uppercase tracking-[0.18em] text-accent">Focus</span>
          <span className="text-warning">★ {item.voteAverage.toFixed(1)}</span>
          {item.status && <span className="uppercase tracking-wide text-text-secondary">In Library</span>}
        </div>
        <h2 className="mt-2 line-clamp-2 text-3xl font-bold leading-tight text-white drop-shadow">{item.title}</h2>
        <p className="mt-1.5 text-sm font-medium text-white/70">
          {item.type === 'movie' ? 'Movie' : 'Series'} · {item.releaseDate ? formatDate(item.releaseDate) : 'TBA'} · {totalMatches} matches
        </p>
        <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-white/60">{item.overview || 'No overview available yet.'}</p>
      </div>
    </Link>
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
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border-subtle/60 pb-2">
        <h2 className="flex items-baseline gap-2 text-lg font-bold tracking-tight text-text-primary">
          <span>{title}</span>
          <span className="section-title font-semibold">{eyebrow}</span>
        </h2>
        <span className="text-xs font-medium text-text-muted">{meta}</span>
      </div>
      {isLoading ? (
        <ScrollRow coverSize={coverSize}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </ScrollRow>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-sm text-text-muted">
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
    <div className="space-y-8">
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
          ariaLabel="Discover content type"
        />
      </div>

      <DiscoverySpotlight item={spotlight} totalMatches={visibleItems.length} />

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
