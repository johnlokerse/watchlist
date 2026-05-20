import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWatchedItems, useSeriesProgress } from '../db/hooks';
import { useSearchMovies, useSearchSeries } from '../api/tmdb';
import { useDebounce } from '../hooks/useDebounce';
import { useSettings } from '../hooks/useSettings';
import type { ContentType, WatchedItem, WatchedStatus } from '../db/models';
import type { TMDBMovie, TMDBSeries } from '../api/types';
import SegmentedControl from '../components/ui/SegmentedControl';
import ViewToggle from '../components/ui/ViewToggle';
import type { ViewMode } from '../components/ui/ViewToggle';
import SearchBar from '../components/ui/SearchBar';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import ListRow from '../components/ui/ListRow';
import SkeletonCard from '../components/ui/SkeletonCard';
import { useLocalStorage } from '../hooks/useLocalStorage';

function useSeriesProgressLabel(tmdbId: number) {
  const progress = useSeriesProgress(tmdbId);
  return progress && progress.currentEpisode > 0
    ? `S${progress.currentSeason}E${progress.currentEpisode}`
    : undefined;
}

function WatchingSeriesCard({ item }: { item: WatchedItem }) {
  const progressLabel = useSeriesProgressLabel(item.tmdbId);
  return (
    <Card
      id={item.tmdbId}
      title={item.title}
      posterPath={item.posterPath}
      type={item.contentType}
      progressLabel={progressLabel}
    />
  );
}

function WatchingSeriesListRow({ item }: { item: WatchedItem }) {
  const progressLabel = useSeriesProgressLabel(item.tmdbId);
  return (
    <ListRow
      id={item.tmdbId}
      title={item.title}
      posterPath={item.posterPath}
      type={item.contentType}
      progressLabel={progressLabel}
    />
  );
}

const MOVIE_STATUS_FILTERS = [
  { label: 'Watched', value: 'watched' },
  { label: 'Plan to Watch', value: 'plan_to_watch' },
];

const SERIES_STATUS_FILTERS = [
  { label: 'Watched', value: 'watched' },
  { label: 'Watching', value: 'watching' },
  { label: 'Plan to Watch', value: 'plan_to_watch' },
];

export default function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings, updateSettings } = useSettings();
  const tabParam = searchParams.get('tab');
  const tab: 'movies' | 'series' = tabParam === 'series' ? 'series' : 'movies';
  const setTab = (nextTab: 'movies' | 'series') => {
    if (nextTab === 'series') {
      setSearchParams({ tab: 'series' });
      return;
    }
    setSearchParams({});
  };
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('library-view', 'cards');
  const debouncedSearch = useDebounce(search);

  const contentType: ContentType = tab === 'movies' ? 'movie' : 'series';
  const items = useWatchedItems(contentType);

  // Search TMDB for adding new items
  const movieSearch = useSearchMovies(contentType === 'movie' ? debouncedSearch : '');
  const seriesSearch = useSearchSeries(contentType === 'series' ? debouncedSearch : '');

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = items;

    if (search && !debouncedSearch) return result; // still typing

    if (debouncedSearch) {
      result = result.filter((i) =>
        i.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
      );
    }

    if (statusFilters.length > 0) {
      result = result.filter((i) => statusFilters.includes(i.status));
    }

    // Exclude movies shown on the Upcoming page
    if (contentType === 'movie') {
      const today = new Date().toISOString().slice(0, 10);
      result = result.filter((i) => {
        const isUpcoming = i.releaseDate && i.releaseDate >= today;
        const isPlanned = i.status === 'plan_to_watch' && !i.releaseDate;
        return !isUpcoming && !isPlanned;
      });
    }

    return result;
  }, [items, debouncedSearch, statusFilters, search, contentType]);

  const planToWatchItems = useMemo(() => filteredItems.filter((i) => i.status === 'plan_to_watch'), [filteredItems]);
  const watchedItems = useMemo(() => filteredItems.filter((i) => i.status === 'watched'), [filteredItems]);
  const watchingItems = useMemo(() => filteredItems.filter((i) => i.status === 'watching'), [filteredItems]);

  const tmdbResults = useMemo((): (TMDBMovie | TMDBSeries)[] => {
    if (!debouncedSearch) return [];
    if (contentType === 'movie') {
      return movieSearch.data?.pages.flatMap((p) => p.results) ?? [];
    }
    return seriesSearch.data?.pages.flatMap((p) => p.results) ?? [];
  }, [debouncedSearch, contentType, movieSearch.data, seriesSearch.data]);

  // Map tmdbId → status for quick lookups in search results
  const libraryMap = useMemo(() => {
    const map = new Map<number, WatchedStatus>();
    items?.forEach((item) => map.set(item.tmdbId, item.status));
    return map;
  }, [items]);

  const isSearching = debouncedSearch.length > 1;
  const searchLoading = contentType === 'movie' ? movieSearch.isLoading : seriesSearch.isLoading;
  const stats = [
    { label: 'Visible', value: String(filteredItems.length) },
    { label: 'Watched', value: String(watchedItems.length) },
    ...(tab === 'series' ? [{ label: 'Watching', value: String(watchingItems.length) }] : []),
    { label: 'Planned', value: String(planToWatchItems.length) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-title mb-2">Personal database</p>
          <h1 className="page-title">Your Library</h1>
        </div>
        <SegmentedControl
          options={[
            { value: 'movies', label: 'Movies' },
            { value: 'series', label: 'Series' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as 'movies' | 'series')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="app-panel p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={`Search your ${tab} or find new ones...`}
            />
            </div>
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              coverSize={settings.coverSize}
              onCoverSizeChange={(size) => updateSettings({ coverSize: size })}
            />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FilterBar
              filters={tab === 'movies' ? MOVIE_STATUS_FILTERS : SERIES_STATUS_FILTERS}
              selected={statusFilters}
              onChange={setStatusFilters}
            />
            <p className="text-xs font-medium text-text-muted">
              {isSearching ? `Searching TMDB for "${debouncedSearch}"` : `${filteredItems.length} ${tab} shown`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:min-w-[420px]">
          {stats.map((stat) => (
            <div key={stat.label} className="app-panel-soft flex-1 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{stat.label}</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Library items */}
      {!isSearching && (
        <>
          {!items ? (
            <CardGrid coverSize={settings.coverSize}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <p className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg border border-border-subtle bg-surface-overlay text-accent">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5.5h11.5a2.5 2.5 0 0 1 2.5 2.5v11.5H6.5A2.5 2.5 0 0 1 4 17V5.5Z" />
                  <path d="M7.5 5.5v14M9.5 9h5M9.5 12h5" />
                </svg>
              </p>
              <p>No {tab} in your library yet.</p>
              <p className="text-sm mt-1">Search above to find and add some!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {planToWatchItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Plan to Watch</h2>
                    <span className="text-xs font-medium text-text-muted">{planToWatchItems.length} items</span>
                  </div>
                  {viewMode === 'cards' ? (
                    <CardGrid coverSize={settings.coverSize}>
                      {planToWatchItems.map((item) => (
                        <Card key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                      ))}
                    </CardGrid>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {planToWatchItems.map((item) => (
                        <ListRow key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {watchingItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Watching</h2>
                    <span className="text-xs font-medium text-text-muted">{watchingItems.length} items</span>
                  </div>
                  {viewMode === 'cards' ? (
                    <CardGrid coverSize={settings.coverSize}>
                      {watchingItems.map((item) =>
                        item.contentType === 'series' ? (
                          <WatchingSeriesCard key={item.id} item={item} />
                        ) : (
                          <Card key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                        ),
                      )}
                    </CardGrid>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {watchingItems.map((item) =>
                        item.contentType === 'series' ? (
                          <WatchingSeriesListRow key={item.id} item={item} />
                        ) : (
                          <ListRow key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
              {watchedItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Watched</h2>
                    <span className="text-xs font-medium text-text-muted">{watchedItems.length} items</span>
                  </div>
                  {viewMode === 'cards' ? (
                    <CardGrid compact coverSize={settings.coverSize}>
                      {watchedItems.map((item) => (
                        <Card key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                      ))}
                    </CardGrid>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {watchedItems.map((item) => (
                        <ListRow key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TMDB search results */}
      {isSearching && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Search Results</h2>
            <span className="text-xs font-medium text-text-muted">{tmdbResults.length} matches</span>
          </div>
          {searchLoading ? (
            <CardGrid coverSize={settings.coverSize}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : tmdbResults.length === 0 ? (
            <p className="text-text-muted py-8 text-center">No results found for "{debouncedSearch}"</p>
          ) : (
            <CardGrid coverSize={settings.coverSize}>
              {tmdbResults.map((item) => {
                const isMovie = 'title' in item;
                const movie = item as TMDBMovie;
                const tv = item as TMDBSeries;
                return (
                  <Card
                    key={item.id}
                    id={item.id}
                    title={isMovie ? movie.title : tv.name}
                    posterPath={item.poster_path}
                    releaseDate={isMovie ? movie.release_date : tv.first_air_date}
                    voteAverage={item.vote_average}
                    type={contentType}
                    status={libraryMap.get(item.id) ?? null}
                  />
                );
              })}
            </CardGrid>
          )}
        </div>
      )}
    </div>
  );
}
