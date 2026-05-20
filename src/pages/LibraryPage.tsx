import { useState, useMemo } from 'react';
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

function LibraryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}

function LibraryInspector({ item, count }: { item: WatchedItem; count: number }) {
  const poster = posterUrl(item.posterPath, 'w185');

  return (
    <aside className="app-panel sticky top-24 hidden self-start p-4 xl:block">
      <div className="flex items-start gap-3">
        <div className="aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-overlay">
          {poster ? (
            <img src={poster} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-text-muted">N/A</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="section-title mb-1">Selected record</p>
          <h2 className="line-clamp-3 text-lg font-bold leading-tight text-text-primary">{item.title}</h2>
          <p className="mt-2 text-sm text-text-secondary">{item.contentType === 'movie' ? 'Movie' : 'Series'}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <LibraryMetric label="Status" value={STATUS_LABELS[item.status]} />
        <LibraryMetric label="Release" value={itemReleaseLabel(item)} />
        <LibraryMetric label="Rating" value={item.userRating ? `${item.userRating}/10` : 'Not rated'} />
        <LibraryMetric label="Records" value={String(count)} />
      </div>

      {item.notes && (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-overlay p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Notes</p>
          <p className="mt-1 line-clamp-4 text-sm text-text-secondary">{item.notes}</p>
        </div>
      )}

      <Link
        to={itemHref(item)}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover"
      >
        Open Details
      </Link>
    </aside>
  );
}

function LibraryTable({
  items,
  selectedKey,
  onSelect,
}: {
  items: WatchedItem[];
  selectedKey: string | null;
  onSelect: (item: WatchedItem) => void;
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
          const selected = selectedKey === itemKey(item);
          const poster = posterUrl(item.posterPath, 'w92');

          return (
            <div
              key={itemKey(item)}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(item);
                }
              }}
              className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-3 transition md:grid-cols-[minmax(0,1.7fr)_130px_130px_110px] md:items-center md:px-4 ${
                selected ? 'bg-accent/12' : 'hover:bg-surface-overlay'
              }`}
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
  selectedKey,
  onSelect,
  collapsed,
  onToggleCollapse,
}: {
  title: string;
  items: WatchedItem[];
  viewMode: ViewMode;
  coverSize: CoverSize;
  selectedKey: string | null;
  onSelect: (item: WatchedItem) => void;
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
        <LibraryTable items={items} selectedKey={selectedKey} onSelect={onSelect} />
      )}
        </>
      )}
    </div>
  );
}

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
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
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
  const selectedItem = useMemo(
    () => filteredItems.find((item) => itemKey(item) === selectedItemKey) ?? filteredItems[0],
    [filteredItems, selectedItemKey],
  );

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
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-8">
                <LibraryCollection
                  title="Plan to Watch"
                  items={planToWatchItems}
                  viewMode={viewMode}
                  coverSize={settings.coverSize}
                  selectedKey={selectedItem ? itemKey(selectedItem) : null}
                  onSelect={(item) => setSelectedItemKey(itemKey(item))}
                  collapsed={Boolean(collapsedSections[`${tab}-plan_to_watch`])}
                  onToggleCollapse={() => setCollapsedSections((prev) => ({
                    ...prev,
                    [`${tab}-plan_to_watch`]: !prev[`${tab}-plan_to_watch`],
                  }))}
                />
                <LibraryCollection
                  title="Watching"
                  items={watchingItems}
                  viewMode={viewMode}
                  coverSize={settings.coverSize}
                  selectedKey={selectedItem ? itemKey(selectedItem) : null}
                  onSelect={(item) => setSelectedItemKey(itemKey(item))}
                  collapsed={Boolean(collapsedSections[`${tab}-watching`])}
                  onToggleCollapse={() => setCollapsedSections((prev) => ({
                    ...prev,
                    [`${tab}-watching`]: !prev[`${tab}-watching`],
                  }))}
                />
                <LibraryCollection
                  title="Watched"
                  items={watchedItems}
                  viewMode={viewMode}
                  coverSize={settings.coverSize}
                  selectedKey={selectedItem ? itemKey(selectedItem) : null}
                  onSelect={(item) => setSelectedItemKey(itemKey(item))}
                  collapsed={Boolean(collapsedSections[`${tab}-watched`])}
                  onToggleCollapse={() => setCollapsedSections((prev) => ({
                    ...prev,
                    [`${tab}-watched`]: !prev[`${tab}-watched`],
                  }))}
                />
              </div>
              {selectedItem && <LibraryInspector item={selectedItem} count={filteredItems.length} />}
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
