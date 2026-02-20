import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { TMDB_BASE_URL, TMDB_API_TOKEN, STALE_TIME_LIST, STALE_TIME_DETAIL } from '../utils/constants';
import type {
  TMDBMovie, TMDBMovieDetail, TMDBSeries, TMDBSeriesDetail,
  TMDBGenre, TMDBPagedResponse, TMDBSeason, TMDBProvider,
} from './types';

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TMDB_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);
  return res.json();
}

// --- Movies ---

export function useUpcomingMovies() {
  return useInfiniteQuery({
    queryKey: ['movies', 'upcoming'],
    queryFn: ({ pageParam = 1 }) =>
      tmdbFetch<TMDBPagedResponse<TMDBMovie>>('/movie/upcoming', {
        page: String(pageParam),
        region: 'NL',
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    staleTime: STALE_TIME_LIST,
  });
}

export function useMovieDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: () =>
      tmdbFetch<TMDBMovieDetail>(`/movie/${id}`, {
        append_to_response: 'credits,watch/providers',
      }),
    enabled: !!id,
    staleTime: STALE_TIME_DETAIL,
  });
}

export function useSearchMovies(query: string) {
  return useInfiniteQuery({
    queryKey: ['search', 'movies', query],
    queryFn: ({ pageParam = 1 }) =>
      tmdbFetch<TMDBPagedResponse<TMDBMovie>>('/search/movie', {
        query,
        page: String(pageParam),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    enabled: query.length > 1,
    staleTime: STALE_TIME_LIST,
  });
}

// --- Series ---

export function useUpcomingSeries() {
  return useInfiniteQuery({
    queryKey: ['series', 'upcoming'],
    queryFn: ({ pageParam = 1 }) =>
      tmdbFetch<TMDBPagedResponse<TMDBSeries>>('/tv/on_the_air', {
        page: String(pageParam),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    staleTime: STALE_TIME_LIST,
  });
}

export function useSeriesDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['series', id],
    queryFn: () =>
      tmdbFetch<TMDBSeriesDetail>(`/tv/${id}`, {
        append_to_response: 'credits,watch/providers,external_ids',
      }),
    enabled: !!id,
    staleTime: STALE_TIME_DETAIL,
  });
}

export function useSearchSeries(query: string) {
  return useInfiniteQuery({
    queryKey: ['search', 'series', query],
    queryFn: ({ pageParam = 1 }) =>
      tmdbFetch<TMDBPagedResponse<TMDBSeries>>('/search/tv', {
        query,
        page: String(pageParam),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    enabled: query.length > 1,
    staleTime: STALE_TIME_LIST,
  });
}

// --- Trending (Discover) ---

export function useTrendingMovies() {
  return useQuery({
    queryKey: ['trending', 'movies'],
    queryFn: () => tmdbFetch<TMDBPagedResponse<TMDBMovie>>('/trending/movie/week'),
    staleTime: STALE_TIME_LIST,
  });
}

export function useTrendingSeries() {
  return useQuery({
    queryKey: ['trending', 'series'],
    queryFn: () => tmdbFetch<TMDBPagedResponse<TMDBSeries>>('/trending/tv/week'),
    staleTime: STALE_TIME_LIST,
  });
}

export function useAnticipatedMovies() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['anticipated', 'movies'],
    queryFn: () =>
      tmdbFetch<TMDBPagedResponse<TMDBMovie>>('/discover/movie', {
        sort_by: 'popularity.desc',
        'primary_release_date.gte': today,
      }),
    staleTime: STALE_TIME_LIST,
  });
}

export function useAnticipatedSeries() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['anticipated', 'series'],
    queryFn: () =>
      tmdbFetch<TMDBPagedResponse<TMDBSeries>>('/discover/tv', {
        sort_by: 'popularity.desc',
        'first_air_date.gte': today,
      }),
    staleTime: STALE_TIME_LIST,
  });
}

// --- Genres ---

export function useMovieGenres() {
  return useQuery({
    queryKey: ['genres', 'movie'],
    queryFn: () =>
      tmdbFetch<{ genres: TMDBGenre[] }>('/genre/movie/list').then((r) => r.genres),
    staleTime: Infinity,
  });
}

export function useSeriesGenres() {
  return useQuery({
    queryKey: ['genres', 'series'],
    queryFn: () =>
      tmdbFetch<{ genres: TMDBGenre[] }>('/genre/tv/list').then((r) => r.genres),
    staleTime: Infinity,
  });
}

export function useSeasonDetail(seriesId: number | undefined, season: number) {
  return useQuery({
    queryKey: ['season', seriesId, season],
    queryFn: () => tmdbFetch<TMDBSeason>(`/tv/${seriesId}/season/${season}`),
    enabled: !!seriesId && season > 0,
    staleTime: STALE_TIME_DETAIL,
  });
}

export function useSeriesDetailBatch(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['series', id],
      queryFn: () => tmdbFetch<TMDBSeriesDetail>(`/tv/${id}`),
      enabled: id > 0,
      staleTime: STALE_TIME_DETAIL,
    })),
  });
}

// --- Watch Providers ---

export function useAvailableProviders(country: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['watch-providers', 'movie', country],
        queryFn: () =>
          tmdbFetch<{ results: TMDBProvider[] }>('/watch/providers/movie', { watch_region: country }),
        staleTime: STALE_TIME_LIST,
        enabled: !!country,
      },
      {
        queryKey: ['watch-providers', 'tv', country],
        queryFn: () =>
          tmdbFetch<{ results: TMDBProvider[] }>('/watch/providers/tv', { watch_region: country }),
        staleTime: STALE_TIME_LIST,
        enabled: !!country,
      },
    ],
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  const providers = useMemo(() => {
    const seen = new Set<number>();
    const merged: TMDBProvider[] = [];
    for (const result of results) {
      for (const p of result.data?.results ?? []) {
        if (!seen.has(p.provider_id)) {
          seen.add(p.provider_id);
          merged.push(p);
        }
      }
    }
    return merged.sort((a, b) => a.display_priority - b.display_priority);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results[0].data, results[1].data]);

  return { providers, isLoading, isError };
}
