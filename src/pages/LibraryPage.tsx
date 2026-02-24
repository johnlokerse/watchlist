import { useState, useMemo } from 'react';
import { useWatchedItems } from '../db/hooks';
import { useSearchMovies, useSearchSeries } from '../api/tmdb';
import { useDebounce } from '../hooks/useDebounce';
import type { ContentType, WatchedStatus } from '../db/models';
import type { TMDBMovie, TMDBSeries } from '../api/types';
import SegmentedControl from '../components/ui/SegmentedControl';
import SearchBar from '../components/ui/SearchBar';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import SkeletonCard from '../components/ui/SkeletonCard';

const MOVIE_STATUS_FILTERS = [
  { label: 'Watched', value: 'watched' },
  { label: 'Plan to Watch', value: 'plan_to_watch' },
  { label: 'Dropped', value: 'dropped' },
];

const SERIES_STATUS_FILTERS = [
  { label: 'Watched', value: 'watched' },
  { label: 'Watching', value: 'watching' },
  { label: 'Plan to Watch', value: 'plan_to_watch' },
  { label: 'Dropped', value: 'dropped' },
];

export default function LibraryPage() {
  const [tab, setTab] = useState<'movies' | 'series'>('movies');
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
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
  const droppedItems = useMemo(() => filteredItems.filter((i) => i.status === 'dropped'), [filteredItems]);

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
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={`Search your ${tab} or find new ones...`}
        />
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
            <CardGrid>
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
                  <CardGrid>
                    {planToWatchItems.map((item) => (
                      <Card key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                    ))}
                  </CardGrid>
                </div>
              )}
              {watchingItems.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Watching</h2>
                  <CardGrid>
                    {watchingItems.map((item) => (
                      <Card key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                    ))}
                  </CardGrid>
                </div>
              )}
              {watchedItems.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Watched</h2>
                  <CardGrid compact>
                    {watchedItems.map((item) => (
                      <Card key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                    ))}
                  </CardGrid>
                </div>
              )}
              {droppedItems.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Dropped</h2>
                  <CardGrid>
                    {droppedItems.map((item) => (
                      <Card key={item.id} id={item.tmdbId} title={item.title} posterPath={item.posterPath} type={item.contentType} />
                    ))}
                  </CardGrid>
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
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : tmdbResults.length === 0 ? (
            <p className="text-text-muted py-8 text-center">No results found for "{debouncedSearch}"</p>
          ) : (
            <CardGrid>
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
