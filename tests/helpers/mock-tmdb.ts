import type { Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures', 'tmdb');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'));
}

const trendingMovies = loadFixture('trending-movies.json');
const trendingSeries = loadFixture('trending-series.json');
const anticipatedMovies = loadFixture('anticipated-movies.json');
const anticipatedSeries = loadFixture('anticipated-series.json');
const searchMovies = loadFixture('search-movies.json');
const searchSeries = loadFixture('search-series.json');
const movieDetail302946 = loadFixture('movie-detail-302946.json');
const seriesDetail1396 = loadFixture('series-detail-1396.json');
const season1396S1 = loadFixture('season-1396-1.json');

async function routeTMDB(page: Page, pathGlob: string, json: unknown): Promise<void> {
  await page.route(`**/api.themoviedb.org/3/${pathGlob}`, (route) => route.fulfill({ json }));
  await page.route(`**/api/tmdb/${pathGlob}`, (route) => route.fulfill({ json }));
}

/**
 * Sets up page.route() intercepts for all TMDB API calls.
 * Call this before page.goto() in tests that trigger TMDB fetches.
 *
 * Playwright routes are matched LIFO (last registered wins), so we register
 * the catch-all first and the specific routes last so the specific ones win.
 */
export async function setupTMDBMocks(page: Page): Promise<void> {
  // Catch-all (registered first = lowest priority)
  await page.route('**/api.themoviedb.org/**', (route) =>
    route.fulfill({ json: { results: [], page: 1, total_pages: 1, total_results: 0 } }),
  );
  await page.route('**/api/tmdb/**', (route) =>
    route.fulfill({ json: { results: [], page: 1, total_pages: 1, total_results: 0 } }),
  );

  // Genres
  await routeTMDB(page, 'genre/**', { genres: [] });

  // Trending
  await routeTMDB(page, 'trending/movie/**', trendingMovies);
  await routeTMDB(page, 'trending/tv/**', trendingSeries);

  // Discover (anticipated)
  await routeTMDB(page, 'discover/movie*', anticipatedMovies);
  await routeTMDB(page, 'discover/tv*', anticipatedSeries);

  // Search
  await routeTMDB(page, 'search/movie*', searchMovies);
  await routeTMDB(page, 'search/tv*', searchSeries);

  // Movie detail — catch-all for any movie first, specific ID last
  await routeTMDB(page, 'movie/**', movieDetail302946);
  await routeTMDB(page, 'movie/302946*', movieDetail302946);

  // Series detail — season first (most specific path), then series, then catch-all
  await routeTMDB(page, 'tv/**', seriesDetail1396);
  await routeTMDB(page, 'tv/1396*', seriesDetail1396);
  await routeTMDB(page, 'tv/1396/season/1*', season1396S1);
}

/**
 * Returns the movie detail fixture for TMDB ID 302946 (The Accountant).
 */
export { movieDetail302946, seriesDetail1396 };

/**
 * Overrides the series detail route with a copy of the Breaking Bad fixture that
 * has one extra season appended, so new-season detection can be exercised.
 * Registered after setupTMDBMocks so it wins (routes match LIFO).
 */
export async function mockSeriesWithNewSeason(
  page: Page,
  opts: { seasonNumber: number; airDate: string; episodeCount?: number; aired?: boolean; placeholderSeason?: number },
): Promise<void> {
  const { seasonNumber, airDate, episodeCount = 10, aired = false, placeholderSeason } = opts;
  const detail = {
    ...seriesDetail1396,
    status: aired ? 'Returning Series' : 'In Production',
    number_of_seasons: placeholderSeason ?? seasonNumber,
    number_of_episodes: seriesDetail1396.number_of_episodes + episodeCount,
    seasons: [
      ...seriesDetail1396.seasons,
      {
        id: 900000 + seasonNumber,
        name: `Season ${seasonNumber}`,
        season_number: seasonNumber,
        episode_count: episodeCount,
        air_date: airDate,
        poster_path: null,
        overview: '',
      },
      // TMDB often lists the next season as an empty stub with no air date.
      ...(placeholderSeason
        ? [
            {
              id: 900000 + placeholderSeason,
              name: `Season ${placeholderSeason}`,
              season_number: placeholderSeason,
              episode_count: 0,
              air_date: null,
              poster_path: null,
              overview: '',
            },
          ]
        : []),
    ],
    last_episode_to_air: aired
      ? {
          id: 990001,
          name: 'New beginnings',
          air_date: airDate,
          episode_number: 1,
          season_number: seasonNumber,
          overview: '',
          still_path: null,
          runtime: 50,
        }
      : seriesDetail1396.last_episode_to_air,
  };

  await routeTMDB(page, 'tv/1396*', detail);
}
