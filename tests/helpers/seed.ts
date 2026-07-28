import type { APIRequestContext } from '@playwright/test';

/**
 * Refuse to touch a backend that is not the Playwright test server.
 *
 * `reuseExistingServer` means a stray `npm run dev` on port 3001 would otherwise
 * receive the destructive calls below and wipe the developer's real library.
 */
async function assertTestServer(request: APIRequestContext): Promise<void> {
  const res = await request.get('/api/test/marker').catch(() => null);
  if (res?.ok()) return;
  throw new Error(
    'Refusing to run against a non-test backend on port 3001. ' +
      'Stop `npm run dev` before running Playwright — see AGENTS.md.',
  );
}

export interface SeedMovieOptions {
  tmdbId?: number;
  title?: string;
  posterPath?: string;
  releaseDate?: string | null;
  status?: 'watched' | 'plan_to_watch' | 'dropped';
  userRating?: number | null;
  genreIds?: number[];
}

export interface SeedSeriesOptions {
  tmdbId?: number;
  title?: string;
  posterPath?: string;
  releaseDate?: string | null;
  status?: 'watching' | 'watched' | 'plan_to_watch' | 'dropped';
  userRating?: number | null;
  genreIds?: number[];
}

/** Seed a movie into the test library via the REST API. Returns the DB id. */
export async function seedMovie(
  request: APIRequestContext,
  opts: SeedMovieOptions = {},
): Promise<number> {
  const {
    tmdbId = 302946,
    title = 'The Accountant',
    posterPath = '/fceheXB5fC4WrLVuWJ6OZv9FXYr.jpg',
    releaseDate = '2016-10-13',
    status = 'watched',
    userRating = null,
    genreIds = [28, 53, 80],
  } = opts;

  const res = await request.post('/api/library', {
    data: {
      tmdbId,
      contentType: 'movie',
      title,
      posterPath,
      releaseDate,
      status,
      userRating,
      notes: '',
      genreIds,
    },
  });
  const body = await res.json() as { id: number };
  return body.id;
}

/** Seed a series into the test library via the REST API. Returns the DB id. */
export async function seedSeries(
  request: APIRequestContext,
  opts: SeedSeriesOptions = {},
): Promise<number> {
  const {
    tmdbId = 1396,
    title = 'Breaking Bad',
    posterPath = '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    releaseDate = '2008-01-20',
    status = 'watching',
    userRating = null,
    genreIds = [18, 80],
  } = opts;

  const res = await request.post('/api/library', {
    data: {
      tmdbId,
      contentType: 'series',
      title,
      posterPath,
      releaseDate,
      status,
      userRating,
      notes: '',
      genreIds,
    },
  });
  const body = await res.json() as { id: number };
  return body.id;
}

/** Clear the entire test library. Call in beforeEach for mutation tests. */
export async function clearLibrary(request: APIRequestContext): Promise<void> {
  await assertTestServer(request);
  await request.post('/api/library/clear');
}

/** Record the season/episode baseline the new-season check compares against. */
export async function seedSeriesProgress(
  request: APIRequestContext,
  opts: {
    watchedItemId: number;
    tmdbId?: number;
    currentSeason?: number;
    currentEpisode?: number;
    totalSeasons: number;
    totalEpisodes: number;
  },
): Promise<void> {
  const { watchedItemId, tmdbId = 1396, currentSeason = 1, currentEpisode = 0, totalSeasons, totalEpisodes } = opts;
  await request.put('/api/progress', {
    data: { watchedItemId, tmdbId, currentSeason, currentEpisode, totalSeasons, totalEpisodes },
  });
}
