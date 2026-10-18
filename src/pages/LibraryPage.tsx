import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { spring } from '../design/motion';
import { ratingLabel } from '../utils/rating';
import ListRow from '../components/ui/ListRow';
import { useWatchedItems, useAllSeriesProgress } from '../db/hooks';
import { useNewSeasonCheck } from '../hooks/useNewSeasonCheck';
import { useSearchMovies, useSearchSeries, useMovieGenres, useSeriesGenres, useAvailableProviders } from '../api/tmdb';
import { useDebounce } from '../hooks/useDebounce';
import { useSettings } from '../hooks/useSettings';
import type { ContentType, SeriesProgress, WatchedItem, WatchedStatus } from '../db/models';
import type { TMDBMovie, TMDBSeries } from '../api/types';
import type { CoverSize } from '../hooks/useSettings';
import ViewToggle from '../components/ui/ViewToggle';
import type { ViewMode } from '../components/ui/ViewToggle';
import SearchBar from '../components/ui/SearchBar';
import FilterBar from '../components/ui/FilterBar';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import type { NewSeasonInfo } from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import SkeletonCard from '../components/ui/SkeletonCard';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatDate, toLocalISODate } from '../utils/date';
import { logoUrl } from '../utils/image';

const LIBRARY_SCROLL_RESTORE_KEY = 'library-scroll-restore';

function getLibraryScrollPath() {
  return `${window.location.pathname}${window.location.search}`;
}

function saveLibraryScrollPosition() {
  try {
    sessionStorage.setItem(
      LIBRARY_SCROLL_RESTORE_KEY,
      JSON.stringify({ path: getLibraryScrollPath(), y: window.scrollY }),
    );
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function restoreLibraryScrollPosition() {
  try {
    const raw = sessionStorage.getItem(LIBRARY_SCROLL_RESTORE_KEY);
    if (!raw) return;

    const value = JSON.parse(raw) as { path?: string; y?: number };
    if (value.path !== getLibraryScrollPath() || typeof value.y !== 'number') return;

    window.scrollTo({ top: value.y, behavior: 'auto' });
    sessionStorage.removeItem(LIBRARY_SCROLL_RESTORE_KEY);
  } catch {
    try {
      sessionStorage.removeItem(LIBRARY_SCROLL_RESTORE_KEY);
    } catch {
      // Ignore when sessionStorage is unavailable.
    }
  }
}

function progressLabelFor(progress: SeriesProgress | undefined) {
  return progress && progress.currentEpisode > 0
    ? `S${progress.currentSeason}E${progress.currentEpisode}`
    : undefined;
}

function newSeasonInfo(progress: SeriesProgress | undefined): NewSeasonInfo | null {
  return progress?.newSeasonNumber && progress.newSeasonState
    ? { number: progress.newSeasonNumber, state: progress.newSeasonState }
    : null;
}

type ProgressMap = Map<number, SeriesProgress> | undefined;

function getLibraryItemRestoreId(contentType: ContentType, tmdbId: number) {
  return `${contentType}-${tmdbId}`;
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

type SortOption = 'added-desc' | 'added-asc' | 'rating-desc' | 'tmdb-rating-desc' | 'release-desc' | 'title-asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'added-desc', label: 'Date added (newest)' },
  { value: 'added-asc', label: 'Date added (oldest)' },
  { value: 'rating-desc', label: 'Your rating (high to low)' },
  { value: 'tmdb-rating-desc', label: 'TMDB rating (high to low)' },
  { value: 'release-desc', label: 'Release date (newest)' },
  { value: 'title-asc', label: 'Title (A to Z)' },
];

function sortItems(items: WatchedItem[], sort: SortOption, tmdbRatings?: Map<string, number>): WatchedItem[] {
  const sorted = [...items];
  switch (sort) {
    case 'added-asc':
      sorted.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
      break;
    case 'rating-desc':
      sorted.sort((a, b) => {
        if (a.userRating == null && b.userRating == null) return 0;
        if (a.userRating == null) return 1;
        if (b.userRating == null) return -1;
        return b.userRating - a.userRating;
      });
      break;
    case 'tmdb-rating-desc':
      sorted.sort((a, b) => {
        const keyA = `${a.contentType}-${a.tmdbId}`;
        const keyB = `${b.contentType}-${b.tmdbId}`;
        const ra = tmdbRatings?.get(keyA) ?? null;
        const rb = tmdbRatings?.get(keyB) ?? null;
        if (ra == null && rb == null) return 0;
        if (ra == null) return 1;
        if (rb == null) return -1;
        return rb - ra;
      });
      break;
    case 'release-desc':
      sorted.sort((a, b) => {
        if (!a.releaseDate && !b.releaseDate) return 0;
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return b.releaseDate.localeCompare(a.releaseDate);
      });
      break;
    case 'title-asc':
      sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      break;
    case 'added-desc':
    default:
      sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      break;
  }
  return sorted;
}

function FilterToggleButton({
  expanded,
  activeCount,
  onClick,
}: {
  expanded: boolean;
  activeCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
      title="Filters"
      className={`press relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
        expanded || activeCount > 0
          ? 'bg-accent/15 text-accent'
          : 'bg-fill text-text-secondary hover:bg-fill-strong hover:text-text-primary'
      }`}
    >
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5h16l-6.2 7.6V19l-3.6-1.8v-4.6L4 5Z" />
      </svg>
      {activeCount > 0 && (
        <span className="t-micro num absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-on-accent shadow-chip">
          {activeCount}
        </span>
      )}
    </button>
  );
}

function itemKey(item: WatchedItem) {
  return `${item.contentType}-${item.tmdbId}`;
}

// Streaming-service filtering only makes sense for items you haven't seen yet — once
// something is watched (or currently being watched), its live availability is irrelevant.
// Skipping these also avoids fetching provider data for them entirely.
function needsStreamingAvailability(item: WatchedItem) {
  return item.status === 'plan_to_watch';
}

function itemReleaseLabel(item: WatchedItem) {
  return item.releaseDate ? formatDate(item.releaseDate) : 'TBA';
}

function SeriesProgressValue({ progress }: { progress: SeriesProgress | undefined }) {
  const label = progressLabelFor(progress);
  const newSeason = newSeasonInfo(progress);

  if (newSeason) {
    return (
      <span className="t-micro shrink-0 rounded-md bg-warning px-1.5 py-1 text-on-warning">
        {newSeason.state === 'airing' ? `New S${newSeason.number}` : `S${newSeason.number} announced`}
      </span>
    );
  }

  return label ? (
    <span className="t-micro num shrink-0 rounded-md bg-accent/15 px-1.5 py-1 text-accent">{label}</span>
  ) : null;
}

function LibraryList({ items, progressByTmdbId, onOpen }: { items: WatchedItem[]; progressByTmdbId: ProgressMap; onOpen: () => void }) {
  return (
    <div className="grouped">
      {items.map((item) => (
        <ListRow
          key={itemKey(item)}
          id={item.tmdbId}
          title={item.title}
          posterPath={item.posterPath}
          type={item.contentType}
          onClick={onOpen}
          scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
          meta={`${itemReleaseLabel(item)} · ${STATUS_LABELS[item.status]}`}
          trailing={
            item.contentType === 'series' ? (
              <SeriesProgressValue progress={progressByTmdbId?.get(item.tmdbId)} />
            ) : item.userRating ? (
              <span className="t-callout num shrink-0 font-semibold text-warning">{ratingLabel(item.userRating)}</span>
            ) : null
          }
        />
      ))}
    </div>
  );
}

function LibraryCollection({
  title,
  items,
  progressByTmdbId,
  viewMode,
  coverSize,
  collapsed,
  onToggleCollapse,
  onOpenItem,
}: {
  title: string;
  items: WatchedItem[];
  progressByTmdbId: ProgressMap;
  viewMode: ViewMode;
  coverSize: CoverSize;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenItem: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            className="press inline-flex min-h-8 items-center gap-1.5 text-left text-inherit transition-colors hover:text-text-primary"
          >
            {title}
            <m.svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              initial={false}
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={spring.default}
            >
              <path d="m6 9 6 6 6-6" />
            </m.svg>
          </button>
        </h2>
        <span className="t-caption num text-text-muted">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <m.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: spring.move, opacity: { duration: 0.18 } }}
            className="-mx-2 -mb-2 overflow-hidden px-2 pb-2"
          >
            <m.div key={`${viewMode}-${coverSize}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              {viewMode === 'cards' ? (
                <CardGrid compact={coverSize === 'xs' || title === 'Watched'} coverSize={coverSize}>
                  {items.map((item) => {
                    const progress = item.contentType === 'series' ? progressByTmdbId?.get(item.tmdbId) : undefined;
                    return (
                      <Card
                        key={itemKey(item)}
                        id={item.tmdbId}
                        title={item.title}
                        posterPath={item.posterPath}
                        type={item.contentType}
                        progressLabel={item.status === 'watching' ? progressLabelFor(progress) : undefined}
                        newSeason={newSeasonInfo(progress)}
                        onClick={onOpenItem}
                        scrollRestoreId={getLibraryItemRestoreId(item.contentType, item.tmdbId)}
                      />
                    );
                  })}
                </CardGrid>
              ) : (
                <LibraryList items={items} progressByTmdbId={progressByTmdbId} onOpen={onOpenItem} />
              )}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

interface LibraryPageProps {
  contentType: ContentType;
}

export default function LibraryPage({ contentType }: LibraryPageProps) {
  const { settings, updateSettings } = useSettings();
  const controlsRef = useRef<HTMLDivElement>(null);
  const tab = contentType === 'movie' ? 'movies' : 'series';
  const [search, setSearch] = useState('');
  // Persisted (not plain useState) so filter selections survive navigating away to a
  // movie/series detail page and back — they only clear when the user deselects them.
  const [statusFilters, setStatusFilters] = useLocalStorage<string[]>('library-status-filters', []);
  const [genreFilters, setGenreFilters] = useLocalStorage<string[]>('library-genre-filters', []);
  const [streamingFilters, setStreamingFilters] = useLocalStorage<string[]>('library-streaming-filters', []);
  const [providerMap, setProviderMap] = useState<Map<string, number[]>>(new Map());
  const [providersLoading, setProvidersLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useLocalStorage('library-mobile-filters-open', false);
  const [showWideFilters, setShowWideFilters] = useState(true);
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  const [isControlsStuck, setIsControlsStuck] = useState(false);
  const [collapsedSections, setCollapsedSections] = useLocalStorage<Record<string, boolean>>('library-collapsed-sections', {});
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('library-view', 'cards');
  const [sort, setSort] = useLocalStorage<SortOption>('library-sort', 'added-desc');
  const [tmdbRatings, setTmdbRatings] = useState<Map<string, number>>(new Map());
  const debouncedSearch = useDebounce(search);

  const items = useWatchedItems(contentType);
  const progressByTmdbId = useAllSeriesProgress();
  useNewSeasonCheck(contentType === 'series');

  // Genre id spaces differ between movies and TV, so reset genre selection on tab switch.
  const [prevContentType, setPrevContentType] = useState(contentType);
  if (contentType !== prevContentType) {
    setPrevContentType(contentType);
    setGenreFilters([]);
  }

  const movieGenres = useMovieGenres();
  const seriesGenres = useSeriesGenres();
  const genreList = contentType === 'movie' ? movieGenres.data : seriesGenres.data;

  // Build chips only from genres actually present among this tab's library items.
  const genreFilterOptions = useMemo(() => {
    if (!items || !genreList) return [];
    const genreMap = new Map(genreList.map((g) => [g.id, g.name]));
    const presentIds = new Set<number>();
    items.forEach((item) => item.genreIds.forEach((id) => presentIds.add(id)));
    return Array.from(presentIds)
      .filter((id) => genreMap.has(id))
      .map((id) => ({ value: String(id), label: genreMap.get(id)! }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items, genreList]);

  // Streaming filter chips are dynamic: only the services the user selected in Settings.
  const { providers: availableProviders } = useAvailableProviders(settings.tmdbApiToken.trim());
  const streamingFilterOptions = useMemo(() => {
    if (settings.streamingServices.length === 0) return [];
    const providerMeta = new Map(availableProviders.map((p) => [p.provider_id, p]));
    return settings.streamingServices
      .map((id) => providerMeta.get(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map((p) => ({ value: String(p.provider_id), label: p.provider_name, icon: logoUrl(p.logo_path, 'w45') }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [settings.streamingServices, availableProviders]);

  // Streaming availability is fetched live from TMDB (not persisted, since it changes
  // over time) and only when a streaming filter is actually in use.
  useEffect(() => {
    setProviderMap(new Map());
  }, [settings.country]);

  useEffect(() => {
    if (streamingFilters.length === 0 || !items || items.length === 0) return;

    const missing = items.filter((i) => needsStreamingAvailability(i) && !providerMap.has(itemKey(i)));
    if (missing.length === 0) return;

    let cancelled = false;
    setProvidersLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/tmdb-watch-providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: missing.map((i) => ({ tmdbId: i.tmdbId, contentType: i.contentType })),
            country: settings.country,
          }),
        });
        if (!res.ok) return;
        const { providers: fetched } = await res.json() as { providers: Record<string, number[]> };
        if (!cancelled) {
          setProviderMap((prev) => {
            const next = new Map(prev);
            Object.entries(fetched).forEach(([key, ids]) => next.set(key, ids));
            return next;
          });
        }
      } catch {
        // Silently ignore — filter simply won't match items whose data failed to load.
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // providerMap is intentionally excluded: this effect only fetches missing keys and
  // must not re-run every time providerMap is updated by itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingFilters.length, items, settings.country]);

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

    if (genreFilters.length > 0) {
      const selected = new Set(genreFilters.map(Number));
      result = result.filter((i) => i.genreIds.some((id) => selected.has(id)));
    }

    if (streamingFilters.length > 0) {
      const selected = new Set(streamingFilters.map(Number));
      result = result.filter((i) => {
        if (!needsStreamingAvailability(i)) return true; // already watched/watching — always shown
        const availableIds = providerMap.get(itemKey(i));
        return availableIds ? availableIds.some((id) => selected.has(id)) : false;
      });
    }

    // Exclude movies shown on the Upcoming page
    if (contentType === 'movie') {
      const today = toLocalISODate();
      result = result.filter((i) => {
        const isUpcoming = i.releaseDate && i.releaseDate >= today;
        const isPlanned = i.status === 'plan_to_watch' && !i.releaseDate;
        return !isUpcoming && !isPlanned;
      });
    }

    return sortItems(result, sort, tmdbRatings);
  }, [items, debouncedSearch, statusFilters, genreFilters, streamingFilters, providerMap, search, contentType, sort, tmdbRatings]);

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
  const searchError = contentType === 'movie' ? movieSearch.isError : seriesSearch.isError;
  const tmdbTokenConfigured = settings.tmdbApiToken.trim().length > 0;

  useEffect(() => {
    if (!items || isSearching || filteredItems.length === 0) return;

    let restoreFrame = 0;
    const renderFrame = requestAnimationFrame(() => {
      restoreFrame = requestAnimationFrame(restoreLibraryScrollPosition);
    });

    return () => {
      cancelAnimationFrame(renderFrame);
      cancelAnimationFrame(restoreFrame);
    };
  }, [items, filteredItems.length, viewMode, tab, isSearching]);

  useEffect(() => {
    const wideQuery = window.matchMedia('(min-width: 768px)');
    const handleWideChange = () => setIsWide(wideQuery.matches);
    handleWideChange();
    wideQuery.addEventListener('change', handleWideChange);

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
      wideQuery.removeEventListener('change', handleWideChange);
      window.removeEventListener('scroll', updateStuckState);
      window.removeEventListener('resize', updateStuckState);
    };
  }, []);

  useEffect(() => {
    if (sort !== 'tmdb-rating-desc' || !items || items.length === 0) return;

    let cancelled = false;

    const fetchRatings = async () => {
      try {
        const payload = {
          items: items.map((item) => ({ tmdbId: item.tmdbId, contentType: item.contentType })),
        };
        const res = await fetch('/api/tmdb-ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
        const { ratings } = await res.json() as { ratings: Record<string, number> };
        if (!cancelled) {
          setTmdbRatings(new Map(Object.entries(ratings)));
        }
      } catch {
        // silently ignore fetch errors
      }
    };

    fetchRatings();
    return () => { cancelled = true; };
  }, [sort, items]);

  const showCurrentFilters = isWide ? showWideFilters : showMobileFilters;
  const toggleCurrentFilters = () => {
    if (isWide) {
      setShowWideFilters((value) => !value);
      return;
    }
    setShowMobileFilters((value) => !value);
  };

  const activeFilterCount = statusFilters.length + genreFilters.length + streamingFilters.length;

  return (
    <div className="space-y-6">
      {/* Sticky toolbar: translucent material on mobile (content scrolls underneath), a panel on desktop. */}
      <div
        ref={controlsRef}
        className={`mobile-safe-sticky-top sticky top-[var(--safe-area-top)] z-30 -mx-4 px-4 py-2.5 md:static md:mx-0 md:p-0 ${
          isControlsStuck ? 'material-chrome hairline-bottom' : ''
        } md:bg-transparent md:shadow-none md:backdrop-blur-none`}
      >
        <div className={`flex gap-2 md:pr-0 ${isControlsStuck ? 'pr-12' : 'pr-0'}`}>
          <FilterToggleButton
            expanded={showCurrentFilters}
            activeCount={activeFilterCount}
            onClick={toggleCurrentFilters}
          />
          <div className="min-w-0 flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={`Search your ${tab} or find new ones...`}
            />
          </div>
        </div>
        <AnimatePresence initial={false}>
          {showCurrentFilters && (
            <m.div
              key="filters"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: spring.move, opacity: { duration: 0.18 } }}
              className="overflow-hidden"
            >
              <div className="max-h-[60svh] overflow-y-auto overscroll-contain pt-3 md:max-h-none">
                <div className="app-panel space-y-4 p-3 md:p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <ViewToggle
                        value={viewMode}
                        onChange={setViewMode}
                        coverSize={settings.coverSize}
                        onCoverSizeChange={(size) => updateSettings({ coverSize: size })}
                      />
                      <Select
                        ariaLabel="Sort library"
                        options={SORT_OPTIONS}
                        value={sort}
                        onChange={(value) => setSort(value as SortOption)}
                      />
                    </div>
                    <p className="t-caption num text-text-muted">
                      {isSearching ? `Searching TMDB for "${debouncedSearch}"` : `${filteredItems.length} ${tab} shown`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="t-label">Status</span>
                    <FilterBar
                      filters={tab === 'movies' ? MOVIE_STATUS_FILTERS : SERIES_STATUS_FILTERS}
                      selected={statusFilters}
                      onChange={setStatusFilters}
                      ariaLabel="Status"
                    />
                  </div>
                  {genreFilterOptions.length > 0 && (
                    <div className="space-y-2">
                      <span className="t-label">Genres</span>
                      <FilterBar
                        filters={genreFilterOptions}
                        selected={genreFilters}
                        onChange={setGenreFilters}
                        ariaLabel="Genres"
                      />
                    </div>
                  )}
                  {streamingFilterOptions.length > 0 && (
                    <div className="space-y-2">
                      <span className="t-label">
                        Streaming
                        {providersLoading && streamingFilters.length > 0 && (
                          <span className="ml-2 normal-case tracking-normal">Checking availability…</span>
                        )}
                      </span>
                      <FilterBar
                        filters={streamingFilterOptions}
                        selected={streamingFilters}
                        onChange={setStreamingFilters}
                        ariaLabel="Streaming services"
                      />
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Library items */}
      {!isSearching && (
        <>
          {!items ? (
            <CardGrid coverSize={settings.coverSize}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-text-secondary">
              <p className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5.5h11.5a2.5 2.5 0 0 1 2.5 2.5v11.5H6.5A2.5 2.5 0 0 1 4 17V5.5Z" />
                  <path d="M7.5 5.5v14M9.5 9h5M9.5 12h5" />
                </svg>
              </p>
              <p className="t-headline text-text-primary">No {tab} in your library yet.</p>
              <p className="t-callout mt-1">Search above to find and add some!</p>
            </div>
          ) : (
            <div className="space-y-9">
              {librarySections.map((section) => (
                <LibraryCollection
                  key={section.status}
                  title={section.title}
                  items={section.items}
                  progressByTmdbId={progressByTmdbId}
                  viewMode={viewMode}
                  coverSize={settings.coverSize}
                  collapsed={Boolean(collapsedSections[`${tab}-${section.status}`])}
                  onToggleCollapse={() => setCollapsedSections((prev) => ({
                    ...prev,
                    [`${tab}-${section.status}`]: !prev[`${tab}-${section.status}`],
                  }))}
                  onOpenItem={saveLibraryScrollPosition}
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
            <span className="t-caption num text-text-muted">{tmdbResults.length} {tmdbResults.length === 1 ? 'match' : 'matches'}</span>
          </div>
          {searchLoading ? (
            <CardGrid coverSize={settings.coverSize}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : searchError ? (
            <div className="rounded-2xl bg-warning/12 p-4 text-[0.875rem] text-text-secondary" role="alert">
              <p className="font-medium text-text-primary">
                {tmdbTokenConfigured ? 'TMDB search failed' : 'TMDB API token required'}
              </p>
              <p className="mt-1">
                {tmdbTokenConfigured
                  ? 'Check that your TMDB API token is valid, then try searching again.'
                  : 'Add your TMDB API token in Settings to search for movies and series.'}
              </p>
              <Link to="/settings" className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline">
                Open Settings
              </Link>
            </div>
          ) : tmdbResults.length === 0 ? (
            <p className="t-callout py-8 text-center text-text-secondary">No results for "{debouncedSearch}"</p>
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
