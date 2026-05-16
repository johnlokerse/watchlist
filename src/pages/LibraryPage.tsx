import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
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

const LIBRARY_SCROLL_STORAGE_PREFIX = 'library-scroll';

function getLibraryItemRestoreId(contentType: ContentType, tmdbId: number) {
  return `${contentType}-${tmdbId}`;
}

function getLibraryScrollStorageKey(locationKey: string) {
  return `${LIBRARY_SCROLL_STORAGE_PREFIX}:${locationKey}:scrollY`;
}

function getLibraryTargetStorageKey(locationKey: string) {
  return `${LIBRARY_SCROLL_STORAGE_PREFIX}:${locationKey}:target`;
}

function getLibraryPendingStorageKey(locationKey: string) {
  return `${LIBRARY_SCROLL_STORAGE_PREFIX}:${locationKey}:pending`;
}

function WatchingSeriesCard({ item, onOpen }: { item: WatchedItem; onOpen?: () => void }) {
  const progressLabel = useSeriesProgressLabel(item.tmdbId);
  return (
    <Card
      id={item.tmdbId}
      title={item.title}
      posterPath={item.posterPath}
      type={item.contentType}
      progressLabel={progressLabel}
      onClick={onOpen}
      scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
    />
  );
}

function WatchingSeriesListRow({ item, onOpen }: { item: WatchedItem; onOpen?: () => void }) {
  const progressLabel = useSeriesProgressLabel(item.tmdbId);
  return (
    <ListRow
      id={item.tmdbId}
      title={item.title}
      posterPath={item.posterPath}
      type={item.contentType}
      progressLabel={progressLabel}
      onClick={onOpen}
      scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
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
  const location = useLocation();
  const navigationType = useNavigationType();
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
  const locationKey = `${location.pathname}${location.search}`;
  const scrollStorageKey = getLibraryScrollStorageKey(locationKey);
  const targetStorageKey = getLibraryTargetStorageKey(locationKey);
  const pendingStorageKey = getLibraryPendingStorageKey(locationKey);

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

  const rememberLibraryPosition = (item: Pick<WatchedItem, 'contentType' | 'tmdbId'>) => {
    sessionStorage.setItem(scrollStorageKey, String(window.scrollY));
    sessionStorage.setItem(targetStorageKey, getLibraryItemRestoreId(item.contentType, item.tmdbId));
    sessionStorage.setItem(pendingStorageKey, '1');
  };

  useEffect(() => {
    if (sessionStorage.getItem(pendingStorageKey) !== '1') return;
    if (navigationType !== 'POP') {
      sessionStorage.removeItem(pendingStorageKey);
      return;
    }
    if (!items) return;

    const storedScrollY = Number.parseFloat(sessionStorage.getItem(scrollStorageKey) ?? '');
    const targetId = sessionStorage.getItem(targetStorageKey);

    sessionStorage.removeItem(pendingStorageKey);

    if (Number.isNaN(storedScrollY)) return;

    let targetFrameId: number | undefined;
    const scrollFrameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: storedScrollY, behavior: 'auto' });
      targetFrameId = window.requestAnimationFrame(() => {
        if (!targetId) return;

        const target = document.querySelector<HTMLElement>(`[data-library-item-id="${targetId}"]`);
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

        if (!isVisible) {
          target.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(scrollFrameId);
      if (targetFrameId) {
        window.cancelAnimationFrame(targetFrameId);
      }
    };
  }, [items, navigationType, pendingStorageKey, scrollStorageKey, targetStorageKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Your Library</h1>
        <SegmentedControl
          options={[
            { value: 'movies', label: 'Movies' },
            { value: 'series', label: 'Series' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as 'movies' | 'series')}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
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
        <FilterBar
          filters={tab === 'movies' ? MOVIE_STATUS_FILTERS : SERIES_STATUS_FILTERS}
          selected={statusFilters}
          onChange={setStatusFilters}
        />
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
              <p className="text-4xl mb-2">📚</p>
              <p>No {tab} in your library yet.</p>
              <p className="text-sm mt-1">Search above to find and add some!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {planToWatchItems.length > 0 && (
                <div className="space-y-4">
                  {viewMode === 'cards' ? (
                    <CardGrid coverSize={settings.coverSize}>
                      {planToWatchItems.map((item) => (
                        <Card
                          key={item.id}
                          id={item.tmdbId}
                          title={item.title}
                          posterPath={item.posterPath}
                          type={item.contentType}
                          onClick={() => rememberLibraryPosition(item)}
                          scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
                        />
                      ))}
                    </CardGrid>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {planToWatchItems.map((item) => (
                        <ListRow
                          key={item.id}
                          id={item.tmdbId}
                          title={item.title}
                          posterPath={item.posterPath}
                          type={item.contentType}
                          onClick={() => rememberLibraryPosition(item)}
                          scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {watchingItems.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Watching</h2>
                  {viewMode === 'cards' ? (
                    <CardGrid coverSize={settings.coverSize}>
                      {watchingItems.map((item) =>
                        item.contentType === 'series' ? (
                          <WatchingSeriesCard key={item.id} item={item} onOpen={() => rememberLibraryPosition(item)} />
                        ) : (
                          <Card
                            key={item.id}
                            id={item.tmdbId}
                            title={item.title}
                            posterPath={item.posterPath}
                            type={item.contentType}
                            onClick={() => rememberLibraryPosition(item)}
                            scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
                          />
                        ),
                      )}
                    </CardGrid>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {watchingItems.map((item) =>
                        item.contentType === 'series' ? (
                          <WatchingSeriesListRow key={item.id} item={item} onOpen={() => rememberLibraryPosition(item)} />
                        ) : (
                          <ListRow
                            key={item.id}
                            id={item.tmdbId}
                            title={item.title}
                            posterPath={item.posterPath}
                            type={item.contentType}
                            onClick={() => rememberLibraryPosition(item)}
                            scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
              {watchedItems.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Watched</h2>
                  {viewMode === 'cards' ? (
                    <CardGrid compact coverSize={settings.coverSize}>
                      {watchedItems.map((item) => (
                        <Card
                          key={item.id}
                          id={item.tmdbId}
                          title={item.title}
                          posterPath={item.posterPath}
                          type={item.contentType}
                          onClick={() => rememberLibraryPosition(item)}
                          scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
                        />
                      ))}
                    </CardGrid>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {watchedItems.map((item) => (
                        <ListRow
                          key={item.id}
                          id={item.tmdbId}
                          title={item.title}
                          posterPath={item.posterPath}
                          type={item.contentType}
                          onClick={() => rememberLibraryPosition(item)}
                          scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
                        />
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
          <h2 className="text-lg font-semibold text-text-secondary">Search Results</h2>
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
