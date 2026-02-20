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

  // Genres
  await page.route('**/api.themoviedb.org/3/genre/**', (route) =>
    route.fulfill({ json: { genres: [] } }),
  );

  // Trending
  await page.route('**/api.themoviedb.org/3/trending/movie/**', (route) =>
    route.fulfill({ json: trendingMovies }),
  );
  await page.route('**/api.themoviedb.org/3/trending/tv/**', (route) =>
    route.fulfill({ json: trendingSeries }),
  );

  // Discover (anticipated)
  await page.route('**/api.themoviedb.org/3/discover/movie*', (route) =>
    route.fulfill({ json: anticipatedMovies }),
  );
  await page.route('**/api.themoviedb.org/3/discover/tv*', (route) =>
    route.fulfill({ json: anticipatedSeries }),
  );

  // Search
  await page.route('**/api.themoviedb.org/3/search/movie*', (route) =>
    route.fulfill({ json: searchMovies }),
  );
  await page.route('**/api.themoviedb.org/3/search/tv*', (route) =>
    route.fulfill({ json: searchSeries }),
  );

  // Movie detail — catch-all for any movie first, specific ID last
  await page.route('**/api.themoviedb.org/3/movie/**', (route) =>
    route.fulfill({ json: movieDetail302946 }),
  );
  await page.route('**/api.themoviedb.org/3/movie/302946*', (route) =>
    route.fulfill({ json: movieDetail302946 }),
  );

  // Series detail — season first (most specific path), then series, then catch-all
  await page.route('**/api.themoviedb.org/3/tv/**', (route) =>
    route.fulfill({ json: seriesDetail1396 }),
  );
  await page.route('**/api.themoviedb.org/3/tv/1396*', (route) =>
    route.fulfill({ json: seriesDetail1396 }),
  );
  await page.route('**/api.themoviedb.org/3/tv/1396/season/1*', (route) =>
    route.fulfill({ json: season1396S1 }),
  );
}

/**
 * Returns the movie detail fixture for TMDB ID 302946 (The Accountant).
 */
export { movieDetail302946, seriesDetail1396 };
