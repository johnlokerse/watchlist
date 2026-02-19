const TRAKT_BASE_URL = import.meta.env.DEV ? '/trakt-api' : 'https://api.trakt.tv';

interface TraktIDs {
  trakt: number;
  tmdb?: number;
  imdb?: string;
  tvdb?: number;
}

type TraktSearchResult =
  | { type: 'show'; score: number | null; show: { title: string; year: number; ids: TraktIDs } }
  | { type: 'movie'; score: number | null; movie: { title: string; year: number; ids: TraktIDs } };

async function traktFetch<T>(path: string, clientId: string): Promise<T> {
  const res = await fetch(`${TRAKT_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': clientId,
    },
  });
  if (!res.ok) throw new Error(`Trakt ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function resolveTraktId(
  traktId: number,
  clientId: string,
): Promise<{ tmdbId: number; type: 'movie' | 'series'; title: string } | null> {
  const results = await traktFetch<TraktSearchResult[]>(`/search/trakt/${traktId}`, clientId);
  if (!results.length) return null;
  const result = results[0];
  if (result.type === 'show' && result.show.ids.tmdb) {
    return { tmdbId: result.show.ids.tmdb, type: 'series', title: result.show.title };
  }
  if (result.type === 'movie' && result.movie.ids.tmdb) {
    return { tmdbId: result.movie.ids.tmdb, type: 'movie', title: result.movie.title };
  }
  return null;
}
