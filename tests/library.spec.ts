import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';
import { seedMovie, seedSeries, clearLibrary } from './helpers/seed';

test.beforeEach(async ({ request }) => {
  await clearLibrary(request);
});

test.describe('Library Page', () => {
  test('shows "Your Library" heading', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible();
  });

  test('shows empty state when library is empty', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByText('No movies in your library yet.')).toBeVisible();
    await expect(page.getByText('Search above to find and add some!')).toBeVisible();
  });

  test('Movies/Series segmented control is visible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByRole('tab', { name: 'Movies' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Series' })).toBeVisible();
  });

  test('switching to Series tab shows series empty state', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByRole('tab', { name: 'Series' }).click();
    await expect(page.getByText('No series in your library yet.')).toBeVisible();
  });

  test('movie filter pills render with correct labels', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan to Watch' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dropped' })).toBeVisible();
  });

  test('series tab has 4 filter pills including Watching', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByRole('tab', { name: 'Series' }).click();
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Watching' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan to Watch' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dropped' })).toBeVisible();
  });

  test('search bar is visible with correct placeholder', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByPlaceholder('Search your movies or find new ones...')).toBeVisible();
  });

  test('search placeholder updates when switching to series tab', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByRole('tab', { name: 'Series' }).click();
    await expect(page.getByPlaceholder('Search your series or find new ones...')).toBeVisible();
  });

  test('seeded movie appears in Watched section', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByText('The Accountant')).toBeVisible();
  });

  test('seeded series appears in Watching section', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByRole('tab', { name: 'Series' }).click();
    await expect(page.getByText('Breaking Bad')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Watching' })).toBeVisible();
  });

  test('status filter hides non-matching items', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await seedMovie(request, {
      tmdbId: 157336,
      title: 'Interstellar',
      releaseDate: '2014-11-05',
      status: 'dropped',
    });
    await setupTMDBMocks(page);
    await page.goto('/library');
    // Both items visible initially
    await expect(page.getByText('The Accountant')).toBeVisible();
    await expect(page.getByText('Interstellar')).toBeVisible();
    // Filter to only Dropped
    await page.getByRole('button', { name: 'Dropped' }).click();
    await expect(page.getByText('Interstellar')).toBeVisible();
    await expect(page.getByText('The Accountant')).not.toBeVisible();
  });

  test('search input filters library items by title', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await seedMovie(request, {
      tmdbId: 157336,
      title: 'Interstellar',
      releaseDate: '2014-11-05',
      status: 'watched',
    });
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByText('The Accountant')).toBeVisible();
    await expect(page.getByText('Interstellar')).toBeVisible();
    // Type a short search — filters local items AND triggers TMDB search
    await page.getByPlaceholder('Search your movies or find new ones...').fill('Accountant');
    // Wait for debounce to fire
    await page.waitForTimeout(400);
    // TMDB search results section appears
    await expect(page.getByText('Search Results')).toBeVisible();
  });

  test('typing 2+ chars shows TMDB Search Results heading', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByPlaceholder('Search your movies or find new ones...').fill('Ac');
    await page.waitForTimeout(400);
    await expect(page.getByText('Search Results')).toBeVisible();
  });

  test('TMDB search results render cards from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByPlaceholder('Search your movies or find new ones...').fill('Accountant');
    await page.waitForTimeout(400);
    // fixture has "The Accountant" as first result
    await expect(page.getByText('The Accountant').first()).toBeVisible();
  });

  test('clear button in SearchBar resets to library view', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    const searchInput = page.getByPlaceholder('Search your movies or find new ones...');
    await searchInput.fill('Accountant');
    await page.waitForTimeout(400);
    await expect(page.getByText('Search Results')).toBeVisible();
    // Click the clear button (✕)
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.getByText('Search Results')).not.toBeVisible();
  });

  test('clicking a movie card navigates to /movie/:id', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByText('The Accountant').click();
    await expect(page).toHaveURL('/movie/302946');
  });

  test('clicking a series card navigates to /series/:id', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByRole('tab', { name: 'Series' }).click();
    await page.getByText('Breaking Bad').click();
    await expect(page).toHaveURL('/series/1396');
  });
});
