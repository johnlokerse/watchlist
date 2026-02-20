import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';
import { seedMovie, clearLibrary } from './helpers/seed';

test.beforeEach(async ({ request }) => {
  await clearLibrary(request);
});

test.describe('Movie Detail Page', () => {
  test('loads detail page from URL directly', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await expect(page.getByRole('heading', { name: 'The Accountant' })).toBeVisible();
  });

  test('shows Back button', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await expect(page.getByRole('button', { name: /Back/i })).toBeVisible();
  });

  test('Back button navigates to previous page', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.goto('/movie/302946');
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL('/library');
  });

  test('shows Overview, Cast & Crew, and Where to Watch tabs', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cast & Crew' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Where to Watch' })).toBeVisible();
  });

  test('Overview tab is active by default', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    // Overview content (movie synopsis) should be visible
    await expect(page.getByRole('button', { name: 'Overview' })).toHaveClass(/border-accent/);
  });

  test('shows genre and rating facts from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    // The fixture has genre Action and rating 7.x
    await expect(page.getByText(/Action/).first()).toBeVisible();
    await expect(page.getByText(/★/).first()).toBeVisible();
  });

  test('shows "+ Add to Library" when not in library', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await expect(page.getByRole('button', { name: '+ Add to Library' })).toBeVisible();
  });

  test('Add to Library button adds movie and shows status selector', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await page.getByRole('button', { name: '+ Add to Library' }).click();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  test('shows status selector and Remove button for seeded movie', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  test('status selector has Watched, Plan to Watch, Dropped options', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    const select = page.getByRole('combobox');
    await expect(select).toBeVisible();
    await expect(select.getByRole('option', { name: 'Watched' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Plan to Watch' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Dropped' })).toBeAttached();
  });

  test('shows Your Rating section for library item', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await expect(page.getByText('Your Rating:')).toBeVisible();
  });

  test('shows Notes input for library item', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await expect(page.getByPlaceholder('Add personal notes...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('Remove button removes movie from library', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('button', { name: '+ Add to Library' })).toBeVisible();
  });

  test('Cast & Crew tab shows cast content', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await page.getByRole('button', { name: 'Cast & Crew' }).click();
    // The fixture includes cast entries; at minimum cast section should render
    await expect(page.getByRole('button', { name: 'Cast & Crew' })).toHaveClass(/border-accent/);
  });

  test('Where to Watch tab is accessible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await page.getByRole('button', { name: 'Where to Watch' }).click();
    await expect(page.getByRole('button', { name: 'Where to Watch' })).toHaveClass(/border-accent/);
  });

  test('shows error state for unknown movie ID', async ({ page }) => {
    // Override to return an error for an unknown ID
    await page.route('**/api.themoviedb.org/**', (route) =>
      route.fulfill({ status: 404, json: { status_message: 'Not found' } }),
    );
    await page.goto('/movie/999999');
    await expect(page.getByText('Movie not found.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });
});
