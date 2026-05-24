import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWatchedItems, useSeriesProgress } from '../db/hooks';
import { useSearchMovies, useSearchSeries } from '../api/tmdb';
import { useDebounce } from '../hooks/useDebounce';
import { useSettings } from '../hooks/useSettings';
import type { ContentType, WatchedItem, WatchedStatus } from '../db/models';
import type { TMDBMovie, TMDBSeries } from '../api/types';
import type { CoverSize } from '../hooks/useSettings';
import SegmentedControl from '../components/ui/SegmentedControl';
import ViewToggle from '../components/ui/ViewToggle';
import type { ViewMode } from '../components/ui/ViewToggle';
import SearchBar from '../components/ui/SearchBar';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import SkeletonCard from '../components/ui/SkeletonCard';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatDate } from '../utils/date';
import { posterUrl } from '../utils/image';

function useSeriesProgressLabel(tmdbId: number) {
  const progress = useSeriesProgress(tmdbId);
  return progress && progress.currentEpisode > 0
    ? `S${progress.currentSeason}E${progress.currentEpisode}`
    : undefined;
}

function getLibraryItemRestoreId(contentType: ContentType, tmdbId: number) {
  return `${contentType}-${tmdbId}`;
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

function WatchingSeriesListRow({ item }: { item: WatchedItem }) {
  return <SeriesProgressValue tmdbId={item.tmdbId} />;
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

const STATUS_LABELS: Record<WatchedStatus, string> = {
  watched: 'Watched',
  watching: 'Watching',
  plan_to_watch: 'Plan to Watch',
};

function itemKey(item: WatchedItem) {
  return `${item.contentType}-${item.tmdbId}`;
}

function itemHref(item: WatchedItem) {
  return item.contentType === 'movie' ? `/movie/${item.tmdbId}` : `/series/${item.tmdbId}`;
}

function itemReleaseLabel(item: WatchedItem) {
  return item.releaseDate ? formatDate(item.releaseDate) : 'TBA';
}

function SeriesProgressValue({ tmdbId }: { tmdbId: number }) {
  const label = useSeriesProgressLabel(tmdbId);

  return (
    <span className={label ? 'font-semibold text-accent' : 'text-text-muted'}>
      {label ?? 'No progress'}
    </span>
  );
}


function LibraryTable({
  items,
}: {
  items: WatchedItem[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
      <div className="hidden grid-cols-[minmax(0,1.7fr)_130px_130px_110px] gap-3 border-b border-border-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted md:grid">
        <span>Title</span>
        <span>Release</span>
        <span>Status</span>
        <span>Signal</span>
      </div>
      <div className="divide-y divide-border-subtle">
        {items.map((item) => {
          const poster = posterUrl(item.posterPath, 'w92');

          return (
            <div
              key={itemKey(item)}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-3 transition hover:bg-surface-overlay md:grid-cols-[minmax(0,1.7fr)_130px_130px_110px] md:items-center md:px-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-overlay">
                  {poster ? (
                    <img src={poster} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-[10px] text-text-muted">N/A</div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    to={itemHref(item)}
                    onClick={(event) => event.stopPropagation()}
                    className="block truncate font-semibold text-text-primary transition hover:text-accent"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs capitalize text-text-muted">{item.contentType}</p>
                </div>
              </div>

              <span className="hidden text-sm text-text-secondary md:block">{itemReleaseLabel(item)}</span>
              <span className="hidden text-sm font-semibold text-text-primary md:block">{STATUS_LABELS[item.status]}</span>
              <span className="self-center justify-self-end text-sm md:justify-self-start">
                {item.contentType === 'series' ? (
                  <WatchingSeriesListRow item={item} />
                ) : (
                  <span className={item.userRating ? 'font-semibold text-warning' : 'text-text-muted'}>
                    {item.userRating ? `${item.userRating}/10` : 'No rating'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LibraryCollection({
  title,
  items,
  viewMode,
  coverSize,
  collapsed,
  onToggleCollapse,
}: {
  title: string;
  items: WatchedItem[];
  viewMode: ViewMode;
  coverSize: CoverSize;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            className="inline-flex items-center gap-2 text-left text-inherit hover:text-text-primary transition-colors"
          >
            {title}
            <svg
              className={`h-3.5 w-3.5 text-text-muted transition-transform ${collapsed ? '-rotate-90' : 'rotate-0'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </h2>
        <span className="text-xs font-medium text-text-muted">{items.length} items</span>
      </div>
      {collapsed ? null : (
        <>
      {viewMode === 'cards' ? (
        <CardGrid compact={title === 'Watched'} coverSize={coverSize}>
          {items.map((item) =>
            item.contentType === 'series' && item.status === 'watching' ? (
              <WatchingSeriesCard key={itemKey(item)} item={item} />
            ) : (
              <Card
                key={itemKey(item)}
                id={item.tmdbId}
                title={item.title}
                posterPath={item.posterPath}
                type={item.contentType}
              />
            ),
          )}
        </CardGrid>
      ) : (
        <LibraryTable items={items} />
      )}
        </>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings, updateSettings } = useSettings();
  const controlsRef = useRef<HTMLDivElement>(null);
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
  const [showMobileFilters, setShowMobileFilters] = useLocalStorage('library-mobile-filters-expanded', false);
  const [isControlsStuck, setIsControlsStuck] = useState(false);
  const [collapsedSections, setCollapsedSections] = useLocalStorage<Record<string, boolean>>('library-collapsed-sections', {});
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
  const librarySections = tab === 'series'
    ? [
        { title: 'Watching', status: 'watching' as const, items: watchingItems },
        { title: 'Plan to Watch', status: 'plan_to_watch' as const, items: planToWatchItems },
        { title: 'Watched', status: 'watched' as const, items: watchedItems },
      ]
    : [
        { title: 'Plan to Watch', status: 'plan_to_watch' as const, items: planToWatchItems },
        { title: 'Watching', status: 'watching' as const, items: watchingItems },
        { title: 'Watched', status: 'watched' as const, items: watchedItems },
      ];

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

  useEffect(() => {
    const updateStuckState = () => {
      const top = controlsRef.current?.getBoundingClientRect().top ?? 1;
      const safeTop = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top'),
      );
      const threshold = Number.isFinite(safeTop) ? safeTop : 0;
      setIsControlsStuck(top <= threshold + 0.5);
    };

    updateStuckState();
    window.addEventListener('scroll', updateStuckState, { passive: true });
    window.addEventListener('resize', updateStuckState);
    return () => {
      window.removeEventListener('scroll', updateStuckState);
      window.removeEventListener('resize', updateStuckState);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
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

      <div ref={controlsRef} className="sticky top-[var(--safe-area-top)] z-30 -mx-4 border-y border-border-subtle bg-surface/95 p-3 shadow-lg backdrop-blur md:static md:mx-0 md:rounded-lg md:border md:bg-surface-raised md:p-4 md:shadow-[0_18px_60px_rgb(0_0_0_/_0.18)]">
        <div className={`flex gap-2 md:flex-col md:gap-3 md:pr-0 xl:flex-row xl:items-center ${isControlsStuck ? 'pr-14' : 'pr-0'}`}>
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            aria-expanded={showMobileFilters}
            aria-label="Toggle library filters"
            className={`inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-lg border transition md:hidden ${
              showMobileFilters || statusFilters.length > 0
                ? 'border-accent/45 bg-accent/15 text-accent'
                : 'border-border-subtle bg-surface-raised text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
            }`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M7 12h10" />
              <path d="M10 17h4" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={`Search your ${tab} or find new ones...`}
            />
          </div>
          <div className="hidden md:block">
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              coverSize={settings.coverSize}
              onCoverSizeChange={(size) => updateSettings({ coverSize: size })}
            />
          </div>
        </div>
        <div className={`${showMobileFilters ? 'flex' : 'hidden'} mt-3 flex-col gap-3 md:flex md:flex-row md:items-center md:justify-between`}>
          <div className="md:hidden">
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
          <p className="text-xs font-medium text-text-muted">
            {isSearching ? `Searching TMDB for "${debouncedSearch}"` : `${filteredItems.length} ${tab} shown`}
          </p>
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
              {librarySections.map((section) => (
                <LibraryCollection
                  key={section.status}
                  title={section.title}
                  items={section.items}
                  viewMode={viewMode}
                  coverSize={settings.coverSize}
                  collapsed={Boolean(collapsedSections[`${tab}-${section.status}`])}
                  onToggleCollapse={() => setCollapsedSections((prev) => ({
                    ...prev,
                    [`${tab}-${section.status}`]: !prev[`${tab}-${section.status}`],
                  }))}
                />
              ))}
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
