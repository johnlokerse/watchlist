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

  test('Back button returns to Library Series tab when opened from series overview', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await page.getByRole('tab', { name: 'Series' }).click();
    await expect(page).toHaveURL('/library?tab=series');
    await page.goto('/series/1396');
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL('/library?tab=series');
    await expect(page.getByRole('tab', { name: 'Series' })).toHaveAttribute('aria-selected', 'true');
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
    await page.getByRole('button', { name: 'Watching' }).click();
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

  test('status selector has Watched, Watching, and Plan to Watch options', async ({
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

  test('clicking a rating star saves the rating via API', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('group', { name: 'Rating' }).getByRole('button', { name: '8 stars' }).click();
    const res = await request.get('/api/library/1396/series');
    const item = await res.json() as { userRating: number };
    expect(item.userRating).toBe(8);
  });

  test('saving notes persists via API', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    const notesInput = page.getByPlaceholder('Add personal notes...');
    await notesInput.fill('Incredible series');
    await page.getByRole('button', { name: 'Save' }).click();
    const res = await request.get('/api/library/1396/series');
    const item = await res.json() as { notes: string };
    expect(item.notes).toBe('Incredible series');
  });

  test('saved notes persist after re-navigation', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    const notesInput = page.getByPlaceholder('Add personal notes...');
    await notesInput.fill('Remember this one');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.goto('/library');
    await page.goto('/series/1396');
    await expect(page.getByPlaceholder('Add personal notes...')).toHaveValue('Remember this one');
  });

  test('updating season progress input persists via API', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    // Fill the Season number input (first number input in the Progress section)
    const seasonInput = page.locator('label').filter({ hasText: 'Season' }).locator('~ input[type="number"], + input[type="number"]');
    await seasonInput.fill('3');
    // Trigger blur so the onChange fires and the PATCH request is sent
    await seasonInput.blur();
    const res = await request.get('/api/progress/1396');
    const progress = await res.json() as { currentSeason: number } | null;
    expect(progress?.currentSeason).toBe(3);
  });

  test('toggling an episode marks it watched and updates counter', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'Episodes' }).click();
    // Counter starts at 0/7
    const counter = page.locator('span').filter({ hasText: /\d+\/\d+ watched/ });
    await expect(counter).toContainText('0/7 watched');
    // Toggle the Pilot episode
    await page.getByRole('button', { name: /Pilot/i }).click();
    await expect(counter).toContainText('1/7 watched');
  });

  test('Mark all watched button marks all episodes and updates counter', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'Episodes' }).click();
    await page.getByRole('button', { name: /Mark all watched/i }).click();
    const counter = page.locator('span').filter({ hasText: /\d+\/\d+ watched/ });
    await expect(counter).toContainText('7/7 watched');
  });

  test('Unmark all button resets episode counter to 0', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'Episodes' }).click();
    // Mark all first, then unmark
    await page.getByRole('button', { name: /Mark all watched/i }).click();
    await page.getByRole('button', { name: /Unmark all/i }).click();
    const counter = page.locator('span').filter({ hasText: /\d+\/\d+ watched/ });
    await expect(counter).toContainText('0/7 watched');
  });
});
