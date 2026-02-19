import { defineTool } from '@github/copilot-sdk';
import { z } from 'zod';

const TMDB_TOKEN = process.env.VITE_TMDB_API_TOKEN;
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);
  return res.json();
}

function pickMovieFields(item: Record<string, unknown>) {
  return {
    id: item.id,
    title: item.title ?? item.name,
    overview: item.overview,
    release_date: item.release_date ?? item.first_air_date,
    vote_average: item.vote_average,
    genres: (item.genres as Array<{ name: string }> | undefined)?.map((g) => g.name),
    genre_ids: item.genre_ids,
  };
}

export const tmdbTools = [
  defineTool('searchTMDB', {
    description: 'Search for movies or TV series on TMDB by name. Use this to find TMDB IDs.',
    parameters: z.object({
      query: z.string().describe('Title or keywords to search for'),
      type: z.enum(['movie', 'tv']).describe('movie for films, tv for series'),
    }),
    handler: async ({ query, type }) => {
      const path = type === 'movie' ? '/search/movie' : '/search/tv';
      const data = await tmdbFetch(path, { query, page: '1' });
      return (data.results as Record<string, unknown>[]).slice(0, 6).map(pickMovieFields);
    },
  }),

  defineTool('getTMDBDetails', {
    description: 'Get full details (genres, cast, overview, runtime) for a movie or TV series by TMDB ID.',
    parameters: z.object({
      id: z.number().describe('TMDB ID'),
      type: z.enum(['movie', 'tv']).describe('movie or tv'),
    }),
    handler: async ({ id, type }) => {
      const path = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
      const data = await tmdbFetch(path, { append_to_response: 'credits' });
      return {
        ...pickMovieFields(data),
        runtime: data.runtime ?? data.episode_run_time?.[0],
        status: data.status,
        tagline: data.tagline,
        cast: (data.credits?.cast as Array<{ name: string; character: string }> | undefined)
          ?.slice(0, 5)
          .map((c) => `${c.name} as ${c.character}`),
      };
    },
  }),

  defineTool('getSimilar', {
    description: 'Get movies or series similar to a given title (by TMDB ID). Good for franchise/sequel exploration.',
    parameters: z.object({
      id: z.number().describe('TMDB ID'),
      type: z.enum(['movie', 'tv']).describe('movie or tv'),
    }),
    handler: async ({ id, type }) => {
      const path = type === 'movie' ? `/movie/${id}/similar` : `/tv/${id}/similar`;
      const data = await tmdbFetch(path, { page: '1' });
      return (data.results as Record<string, unknown>[]).slice(0, 8).map(pickMovieFields);
    },
  }),

  defineTool('getRecommendations', {
    description: 'Get TMDB recommendations based on a movie or series. Returns personalized suggestions.',
    parameters: z.object({
      id: z.number().describe('TMDB ID'),
      type: z.enum(['movie', 'tv']).describe('movie or tv'),
    }),
    handler: async ({ id, type }) => {
      const path = type === 'movie' ? `/movie/${id}/recommendations` : `/tv/${id}/recommendations`;
      const data = await tmdbFetch(path, { page: '1' });
      return (data.results as Record<string, unknown>[]).slice(0, 8).map(pickMovieFields);
    },
  }),

  defineTool('searchPerson', {
    description: 'Search for an actor, director, or other person by name on TMDB. Returns their TMDB person ID and known-for titles.',
    parameters: z.object({
      name: z.string().describe('Full or partial name of the person'),
    }),
    handler: async ({ name }) => {
      const data = await tmdbFetch('/search/person', { query: name, page: '1' });
      return (data.results as Record<string, unknown>[]).slice(0, 3).map((p) => ({
        id: p.id,
        name: p.name,
        known_for_department: p.known_for_department,
        known_for: (p.known_for as Record<string, unknown>[] | undefined)
          ?.slice(0, 3)
          .map((k) => k.title ?? k.name),
      }));
    },
  }),

  defineTool('getPersonCredits', {
    description: 'Get the movie and/or TV credits for a person by their TMDB person ID. Use this to list filmography for an actor or director.',
    parameters: z.object({
      personId: z.number().describe('TMDB person ID'),
      type: z.enum(['movie', 'tv', 'both']).describe('movie, tv, or both'),
    }),
    handler: async ({ personId, type }) => {
      const results: Record<string, unknown>[] = [];

      if (type === 'movie' || type === 'both') {
        const data = await tmdbFetch(`/person/${personId}/movie_credits`);
        const credits = (data.cast as Record<string, unknown>[])
          .filter((c) => c.release_date)
          .sort((a, b) => String(b.release_date).localeCompare(String(a.release_date)));
        results.push(...credits.slice(0, 15).map((c) => ({
          ...pickMovieFields(c),
          character: c.character,
          media_type: 'movie',
        })));
      }

      if (type === 'tv' || type === 'both') {
        const data = await tmdbFetch(`/person/${personId}/tv_credits`);
        const credits = (data.cast as Record<string, unknown>[])
          .filter((c) => c.first_air_date)
          .sort((a, b) => String(b.first_air_date).localeCompare(String(a.first_air_date)));
        results.push(...credits.slice(0, 15).map((c) => ({
          ...pickMovieFields(c),
          character: c.character,
          media_type: 'tv',
        })));
      }

      return results
        .sort((a, b) => String(b.release_date ?? '').localeCompare(String(a.release_date ?? '')))
        .slice(0, 20);
    },
  }),
];
