import type { APIRequestContext } from '@playwright/test';

export interface SeedMovieOptions {
  tmdbId?: number;
  title?: string;
  posterPath?: string;
  releaseDate?: string | null;
  status?: 'watched' | 'plan_to_watch' | 'dropped';
  userRating?: number | null;
}

export interface SeedSeriesOptions {
  tmdbId?: number;
  title?: string;
  posterPath?: string;
  status?: 'watching' | 'watched' | 'plan_to_watch' | 'dropped';
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
      genreIds: [28, 53, 80],
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
    status = 'watching',
  } = opts;

  const res = await request.post('/api/library', {
    data: {
      tmdbId,
      contentType: 'series',
      title,
      posterPath,
      releaseDate: '2008-01-20',
      status,
      userRating: null,
      notes: '',
      genreIds: [18, 80],
    },
  });
  const body = await res.json() as { id: number };
  return body.id;
}

/** Clear the entire test library. Call in beforeEach for mutation tests. */
export async function clearLibrary(request: APIRequestContext): Promise<void> {
  await request.post('/api/library/clear');
}
