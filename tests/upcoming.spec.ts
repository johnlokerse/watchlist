import { test, expect } from '@playwright/test';
import { setupTMDBMocks, seriesDetail1396 } from './helpers/mock-tmdb';
import { seedMovie, seedSeries, clearLibrary } from './helpers/seed';

test.beforeEach(async ({ request }) => {
  await clearLibrary(request);
});

test.describe('Upcoming Page', () => {
  test('shows "Upcoming" heading', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible();
  });

  test('Movies/Series segmented control is visible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await expect(page.getByRole('tab', { name: 'Movies' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Series' })).toBeVisible();
  });

  test('empty state shown when no upcoming movies', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await expect(page.getByText('Nothing upcoming yet')).toBeVisible();
    await expect(
      page.getByText('Add unreleased movies to your library and they\'ll appear here.'),
    ).toBeVisible();
  });

  test('upcoming movie with future release date appears', async ({ page, request }) => {
    // Seed a movie with a future release date
    await seedMovie(request, {
      tmdbId: 870028,
      title: 'The Accountant 2',
      releaseDate: '2099-04-23',
      status: 'plan_to_watch',
    });
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await expect(page.getByText('The Accountant 2')).toBeVisible();
  });

  test('planned section shows movies without a release date', async ({ page, request }) => {
    // Seed a movie with no release date and plan_to_watch status
    await seedMovie(request, {
      tmdbId: 999,
      title: 'A Mystery Film',
      releaseDate: null,
      status: 'plan_to_watch',
    });
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await expect(page.getByRole('heading', { name: 'Planned' })).toBeVisible();
    await expect(page.getByText('A Mystery Film')).toBeVisible();
  });

  test('series tab shows empty state when no series in library', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.getByRole('tab', { name: 'Series' }).click();
    await expect(page.getByText('Nothing upcoming yet')).toBeVisible();
  });

  test('watching series with upcoming episode appears on Series tab', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);

    // Override the series detail mock to return a future next_episode_to_air date (LIFO wins)
    const futureFixture = {
      ...seriesDetail1396,
      status: 'Returning Series',
      next_episode_to_air: {
        id: 99999,
        name: 'Future Episode',
        overview: '',
        air_date: '2099-01-01',
        episode_number: 1,
        season_number: 6,
      },
    };
    await page.route('**/api.themoviedb.org/3/tv/1396*', (route) =>
      route.fulfill({ json: futureFixture }),
    );

    await page.goto('/upcoming');
    await page.getByRole('tab', { name: 'Series' }).click();
    await expect(page.getByText('Breaking Bad')).toBeVisible();
  });

  test('ended section shows series with Ended TMDB status', async ({ page, request }) => {
    // Breaking Bad (tmdbId 1396) already has status: "Ended" in the fixture
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);

    await page.goto('/upcoming');
    await page.getByRole('tab', { name: 'Series' }).click();
    await expect(page.getByRole('heading', { name: 'Ended' })).toBeVisible();
    await expect(page.getByText('Breaking Bad')).toBeVisible();
  });
});
