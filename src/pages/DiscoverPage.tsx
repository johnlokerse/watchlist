import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { statusLabel } from '../utils/status';

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

function DiscoverySpotlight({ item, totalMatches, isLoading }: { item?: DiscoveryItem; totalMatches: number; isLoading: boolean }) {
  if (isLoading) {
    return <div aria-busy="true" aria-label="Loading featured title" className="discover-spotlight skeleton min-h-[340px] md:rounded-[22px]" />;
  }

  if (!item) {
    return (
      <div className="t-callout flex min-h-[200px] items-center justify-center rounded-[22px] bg-fill p-4 text-center text-text-secondary">
        No matching titles in the current feeds.
      </div>
    );
  }

  const backdrop = backdropUrl(item.backdropPath, 'w780') ?? posterUrl(item.posterPath, 'w780');
  const label = item.status ? statusLabel(item.status) : null;

  return (
    <Link
      to={itemHref(item)}
      className="discover-spotlight group relative flex min-h-[340px] flex-col justify-end overflow-hidden outline-none transition-transform duration-100 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-accent md:rounded-[22px] md:shadow-card"
    >
      {backdrop ? (
        <img
          src={backdrop}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-overlay" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/0" />
      <div className="relative p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-micro rounded-md bg-accent px-1.5 py-1 uppercase text-on-accent">Featured</span>
          <span className="material-chip t-micro num rounded-md px-1.5 py-1"><span className="text-warning">★</span> {item.voteAverage.toFixed(1)}</span>
          {label && <span className="material-chip t-micro rounded-md px-1.5 py-1">{label}</span>}
        </div>
        <h2 className="t-display mt-3 line-clamp-2 text-white">{item.title}</h2>
        <p className="num mt-1.5 text-[0.875rem] font-medium text-white/75">
          {item.type === 'movie' ? 'Movie' : 'Series'} · {item.releaseDate ? formatDate(item.releaseDate) : 'TBA'} · {totalMatches} {totalMatches === 1 ? 'title' : 'titles'}
        </p>
        <p className="mt-2 line-clamp-2 max-w-2xl text-[0.875rem] leading-6 text-white/70">{item.overview || 'No overview available yet.'}</p>
      </div>
    </Link>
  );
}

function DiscoverySection({
  eyebrow,
  title,
  meta,
  isLoading,
  isError,
  onRetry,
  items,
  coverSize,
}: {
  eyebrow: string;
  title: 'Shows' | 'Movies';
  meta: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  items: DiscoveryItem[];
  coverSize: CoverSize;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="t-label">{eyebrow}</p>
          <h2 className="t-title-2 mt-0.5 text-text-primary">{title}</h2>
        </div>
        <span className="t-caption num text-text-muted">{meta}</span>
      </div>
      {isLoading ? (
        <ScrollRow coverSize={coverSize}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </ScrollRow>
      ) : items.length === 0 ? (
        isError ? (
          <div className="flex flex-col items-center gap-3 rounded-[18px] bg-fill py-8 text-center" role="alert">
            <p className="t-callout text-text-secondary">{"Couldn't load this feed."}</p>
            <button
              type="button"
              onClick={() => onRetry()}
              className="press min-h-9 rounded-full bg-accent px-5 text-[0.875rem] font-semibold text-on-accent"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="t-callout rounded-[18px] bg-fill py-8 text-center text-text-secondary">
            No matches in this feed.
          </div>
        )
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
  // Query and filter live in the URL so returning from a title restores them.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const filterParam = searchParams.get('type');
  const contentFilter: ContentFilter = filterParam === 'movies' || filterParam === 'series' ? filterParam : 'all';
  const updateParam = (key: 'q' | 'type', value: string, empty: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === empty) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };
  const setQuery = (value: string) => updateParam('q', value, '');
  const setContentFilter = (value: ContentFilter) => updateParam('type', value, 'all');
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
  const allVisible = [
    ...(showSeries ? trendingShows : []),
    ...(showMovies ? trendingMovies : []),
    ...(showSeries ? upcomingShows : []),
    ...(showMovies ? upcomingMovies : []),
  ];
  // De-duplicate titles that appear in more than one feed.
  const visibleItems = allVisible.filter(
    (item, index) => allVisible.findIndex((other) => other.type === item.type && other.id === item.id) === index,
  );
  const spotlight = visibleItems.find((item) => !item.status) ?? visibleItems[0];
  const spotlightLoading =
    (showSeries && (series.isLoading || anticipatedSeries.isLoading)) ||
    (showMovies && (movies.isLoading || anticipatedMovies.isLoading));

  return (
    <div className="space-y-9">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title pr-12 md:pr-0">Discover</h1>
          <p className="t-callout mt-1 text-text-secondary">What's trending and what's coming soon</p>
        </div>
      </div>

      {showMissingTokenBanner && (
        <div className="rounded-[18px] bg-warning/12 p-4 text-[0.875rem] text-text-secondary" role="alert">
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
            placeholder="Filter trending and anticipated…"
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

      <DiscoverySpotlight
        item={spotlight}
        totalMatches={visibleItems.length}
        isLoading={spotlightLoading}
      />

      {showSeries && (
        <DiscoverySection
          eyebrow="Trending"
          title="Shows"
          meta={`${Math.min(12, trendingShows.length)} titles`}
          isLoading={series.isLoading}
          isError={series.isError}
          onRetry={series.refetch}
          items={trendingShows}
          coverSize={settings.coverSize}
        />
      )}

      {showMovies && (
        <DiscoverySection
          eyebrow="Trending"
          title="Movies"
          meta={`${Math.min(12, trendingMovies.length)} titles`}
          isLoading={movies.isLoading}
          isError={movies.isError}
          onRetry={movies.refetch}
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
          isError={anticipatedSeries.isError}
          onRetry={anticipatedSeries.refetch}
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
          isError={anticipatedMovies.isError}
          onRetry={anticipatedMovies.refetch}
          items={upcomingMovies}
          coverSize={settings.coverSize}
        />
      )}
    </div>
  );
}
