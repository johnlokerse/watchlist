import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';
import { seedSeries, clearLibrary } from './helpers/seed';

test.beforeEach(async ({ request }) => {
  await clearLibrary(request);
});

test.describe('Series Detail Page', () => {
  test('loads detail page from URL directly', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('heading', { name: 'Breaking Bad' })).toBeVisible();
  });

  test('shows Back button', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('button', { name: /Back/i })).toBeVisible();
  });

  test('Back button navigates to previous page', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.goto('/series/1396');
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL('/library');
  });

  test('shows Overview, Episodes, Cast & Crew, and Where to Watch tabs', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Episodes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cast & Crew' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Where to Watch' })).toBeVisible();
  });

  test('Overview tab is active by default', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('button', { name: 'Overview' })).toHaveClass(/border-accent/);
  });

  test('shows genre, seasons, and rating facts from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByText(/Drama/).first()).toBeVisible();
    await expect(page.getByText(/Seasons/).first()).toBeVisible();
    await expect(page.getByText(/★/).first()).toBeVisible();
  });

  test('shows "+ Add to Library" when not in library', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('button', { name: '+ Add to Library' })).toBeVisible();
  });

  test('Add to Library button adds series and shows status selector', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: '+ Add to Library' }).click();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  test('shows status selector and Remove button for seeded series', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  test('status selector has Watched, Watching, Plan to Watch, Dropped options', async ({
    page,
    request,
  }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    const select = page.getByRole('combobox');
    await expect(select.getByRole('option', { name: 'Watched' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Watching' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Plan to Watch' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Dropped' })).toBeAttached();
  });

  test('shows Progress section with Season and Episode inputs', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByText('Progress:')).toBeVisible();
    // Season/Episode labels are not wired via htmlFor — check by visible text label
    await expect(page.locator('label').filter({ hasText: 'Season' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Episode' })).toBeVisible();
  });

  test('shows Your Rating section for library item', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByText('Your Rating:')).toBeVisible();
  });

  test('shows Notes input for library item', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByPlaceholder('Add personal notes...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('Remove button removes series from library', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('button', { name: '+ Add to Library' })).toBeVisible();
  });

  test('Episodes tab renders episode list from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'Episodes' }).click();
    await expect(page.getByRole('button', { name: 'Episodes' })).toHaveClass(/border-accent/);
    // Season 1 episodes from fixture should render
    await expect(page.getByText(/Pilot|Episode 1/i).first()).toBeVisible();
  });

  test('Cast & Crew tab is accessible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'Cast & Crew' }).click();
    await expect(page.getByRole('button', { name: 'Cast & Crew' })).toHaveClass(/border-accent/);
  });

  test('Where to Watch tab is accessible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'Where to Watch' }).click();
    await expect(page.getByRole('button', { name: 'Where to Watch' })).toHaveClass(/border-accent/);
  });

  test('shows error state for unknown series ID', async ({ page }) => {
    await page.route('**/api.themoviedb.org/**', (route) =>
      route.fulfill({ status: 404, json: { status_message: 'Not found' } }),
    );
    await page.goto('/series/999999');
    await expect(page.getByText('Series not found.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });
});
