import { test, expect } from '@playwright/test';
import { setupTMDBMocks, mockSeriesWithNewSeason } from './helpers/mock-tmdb';
import { seedSeries, seedSeriesProgress, clearLibrary } from './helpers/seed';

const TMDB_ID = 1396;

test.beforeEach(async ({ request }) => {
  await clearLibrary(request);
});

/** Seed Breaking Bad as fully watched with a 5-season baseline. */
async function seedWatchedSeries(request: Parameters<typeof seedSeries>[0]) {
  const id = await seedSeries(request, { tmdbId: TMDB_ID, status: 'watched' });
  await seedSeriesProgress(request, {
    watchedItemId: id,
    tmdbId: TMDB_ID,
    totalSeasons: 5,
    totalEpisodes: 62,
  });
  return id;
}

async function getSeriesStatus(request: Parameters<typeof seedSeries>[0]) {
  const res = await request.get(`/api/library/${TMDB_ID}/series`);
  const body = (await res.json()) as { status: string } | null;
  return body?.status;
}

async function applySeasonCheck(
  request: Parameters<typeof seedSeries>[0],
  opts: { seasonNumber: number; airDate: string; aired?: boolean },
) {
  const { seasonNumber, airDate, aired = false } = opts;
  await request.post('/api/series/season-check', {
    data: {
      checks: [
        {
          tmdbId: TMDB_ID,
          seasons: [
            {
              season: seasonNumber,
              airDate,
              episodeCount: 10,
            },
          ],
          latestSeason: seasonNumber,
          latestSeasonAirDate: airDate,
          numberOfEpisodes: 72,
          lastAiredSeason: aired ? seasonNumber : 5,
          lastAiredEpisode: aired ? 1 : 16,
        },
      ],
    },
  });
}

test.describe('New season detection', () => {
  test('announced season keeps the series watched and shows a badge', async ({ page, request }) => {
    await seedWatchedSeries(request);
    await setupTMDBMocks(page);
    await mockSeriesWithNewSeason(page, { seasonNumber: 6, airDate: '2099-05-01' });

    await page.goto('/series');

    await expect(page.getByTitle('Season 6 announced')).toBeVisible();
    expect(await getSeriesStatus(request)).toBe('watched');
  });

  test('an aired new season moves the series back to watching', async ({ page, request }) => {
    await seedWatchedSeries(request);
    await setupTMDBMocks(page);
    await mockSeriesWithNewSeason(page, { seasonNumber: 6, airDate: '2020-05-01', aired: true });

    await page.goto('/series');

    await expect(page.getByTitle('Season 6 is airing')).toHaveText(/S6 new/i);
    await expect.poll(() => getSeriesStatus(request)).toBe('watching');
  });

  test('watching an episode of the new season clears the badge', async ({ page, request }) => {
    await seedWatchedSeries(request);
    await setupTMDBMocks(page);
    await mockSeriesWithNewSeason(page, { seasonNumber: 6, airDate: '2099-05-01' });

    await page.goto('/series');
    await expect(page.getByTitle('Season 6 announced')).toBeVisible();

    await request.post('/api/episodes/toggle', {
      data: { tmdbId: TMDB_ID, season: 6, episode: 1 },
    });

    await page.reload();
    await expect(page.getByTitle('Season 6 announced')).toHaveCount(0);
  });

  test('no new season leaves a watched series untouched', async ({ page, request }) => {
    await seedWatchedSeries(request);
    await setupTMDBMocks(page);

    await page.goto('/series');
    await expect(page.getByRole('heading', { name: 'Series' })).toBeVisible();

    expect(await getSeriesStatus(request)).toBe('watched');
    await expect(page.getByTitle(/announced|is airing/)).toHaveCount(0);
  });

  // Regression: TMDB lists the next season as an empty stub long before it is
  // real (e.g. Silo S4 while S3 is airing). The stub must not mask the season
  // the user can actually watch.
  test('an empty placeholder season does not mask the season that is airing', async ({ page, request }) => {
    await seedWatchedSeries(request);
    await setupTMDBMocks(page);
    await mockSeriesWithNewSeason(page, {
      seasonNumber: 6,
      airDate: '2020-05-01',
      aired: true,
      placeholderSeason: 7,
    });

    await page.goto('/series');

    await expect(page.getByTitle('Season 6 is airing')).toBeVisible();
    await expect(page.getByTitle(/Season 7/)).toHaveCount(0);
    await expect.poll(() => getSeriesStatus(request)).toBe('watching');
  });

  test('detail opens an announced season after the previous season was watched', async ({ page, request }) => {
    await seedWatchedSeries(request);
    await applySeasonCheck(request, { seasonNumber: 6, airDate: '2099-05-01' });
    await setupTMDBMocks(page);
    await mockSeriesWithNewSeason(page, { seasonNumber: 6, airDate: '2099-05-01' });

    await page.goto(`/series/${TMDB_ID}`);

    await expect(page.getByRole('button', { name: 'Episodes' })).toHaveClass(/border-accent/);
    await expect(page.getByRole('button', { name: 'S6', exact: true })).toHaveClass(/bg-accent/);
  });

  test('an already-watching series ignores a newer airing season', async ({ page, request }) => {
    const id = await seedSeries(request, { tmdbId: TMDB_ID, status: 'watching' });
    await seedSeriesProgress(request, {
      watchedItemId: id,
      tmdbId: TMDB_ID,
      currentSeason: 5,
      currentEpisode: 3,
      totalSeasons: 5,
      totalEpisodes: 62,
    });
    await applySeasonCheck(request, { seasonNumber: 6, airDate: '2020-05-01', aired: true });
    await setupTMDBMocks(page);
    await mockSeriesWithNewSeason(page, { seasonNumber: 6, airDate: '2020-05-01', aired: true });

    await page.goto(`/series/${TMDB_ID}`);

    await expect(page.getByRole('button', { name: 'S5', exact: true })).toHaveClass(/bg-accent/);
    await expect(page.getByRole('button', { name: 'S6', exact: true })).not.toHaveClass(/bg-accent/);
    await expect(page.getByText('Season 6 is airing.')).toHaveCount(0);

    const res = await request.get(`/api/progress/${TMDB_ID}`);
    const progress = await res.json() as { newSeasonState: string | null };
    expect(progress.newSeasonState).toBeNull();
  });
});
