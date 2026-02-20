import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';
import { seedMovie, clearLibrary } from './helpers/seed';

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
});
