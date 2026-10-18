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

  test('Back button returns to the Series library when opened from series overview', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series');
    await page.goto('/series/1396');
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL('/series');
    await expect(page.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true');
  });

  test('shows Overview, Episodes, Cast & Crew, and Where to Watch tabs', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Episodes' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cast & Crew' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Where to Watch' })).toBeVisible();
  });

  test('Overview tab is active by default', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  test('shows release timeline on overview', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByText('Release timeline')).toBeVisible();
    await expect(page.getByText('Series Premiere')).toBeVisible();
  });

  test('shows genre, seasons, and rating facts from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByText(/Drama/).first()).toBeVisible();
    await expect(page.getByText(/Seasons/).first()).toBeVisible();
    await expect(page.getByText(/★/).first()).toBeVisible();
  });

  test('shows "Add to Library" when not in library', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('button', { name: 'Add to Library' })).toBeVisible();
  });

  test('Add to Library button adds series and shows status selector', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'Add to Library' }).click();
    await page.getByRole('menuitem', { name: 'Watching' }).click();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'More actions' })).toBeVisible();
  });

  test('shows status selector and More actions button for seeded series', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'More actions' })).toBeVisible();
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

  test('shows Progress section with Season and Episode steppers', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByText('Progress:')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Season' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Episode' })).toBeVisible();
  });

  test('shows Your Rating section for library item', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByText('Your Rating')).toBeVisible();
  });

  test('shows Notes input for library item', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await expect(page.getByPlaceholder('Add personal notes...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('Remove from Library removes series from library', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Remove from Library' }).click();
    await expect(page.getByRole('button', { name: 'Add to Library' })).toBeVisible();
  });

  test('Episodes tab renders episode list from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('tab', { name: 'Episodes' }).click();
    await expect(page.getByRole('tab', { name: 'Episodes' })).toHaveAttribute('aria-selected', 'true');
    // Season 1 episodes from fixture should render
    await expect(page.getByText(/Pilot|Episode 1/i).first()).toBeVisible();
  });

  test('Cast & Crew tab is accessible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('tab', { name: 'Cast & Crew' }).click();
    await expect(page.getByRole('tab', { name: 'Cast & Crew' })).toHaveAttribute('aria-selected', 'true');
  });

  test('Where to Watch tab is accessible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('tab', { name: 'Where to Watch' }).click();
    await expect(page.getByRole('tab', { name: 'Where to Watch' })).toHaveAttribute('aria-selected', 'true');
  });

  test('Where to Watch fetches deep links only after opening the tab', async ({ page, request }) => {
    await request.put('/api/settings', {
      data: {
        country: 'NL',
        streamingAvailabilityApiKey: 'test-streaming-key',
      },
    });

    let watchLinkRequests = 0;
    await page.route('**/api/watch-links/series/1396**', (route) => {
      watchLinkRequests += 1;
      route.fulfill({
        json: {
          configured: true,
          cached: false,
          links: [
            {
              serviceId: 'netflix',
              serviceName: 'Netflix',
              tmdbProviderIds: [8],
              type: 'subscription',
              link: 'https://www.netflix.com/title/70143836',
            },
          ],
        },
      });
    });

    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    expect(watchLinkRequests).toBe(0);

    await page.getByRole('tab', { name: 'Where to Watch' }).click();
    await expect.poll(() => watchLinkRequests).toBe(1);

    await expect(page.getByRole('link', { name: 'Open Netflix from Stream' })).toHaveAttribute(
      'href',
      'https://www.netflix.com/title/70143836',
    );
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
    // A rating of 8 (out of 10) is shown as 4 stars
    await page.getByRole('radiogroup', { name: 'Rating' }).getByRole('radio', { name: '4 stars' }).click();
    await expect.poll(async () => {
      const item = await (await request.get('/api/library/1396/series')).json() as { userRating: number };
      return item.userRating;
    }).toBe(8);
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
    await page.goto('/series');
    await page.goto('/series/1396');
    await expect(page.getByPlaceholder('Add personal notes...')).toHaveValue('Remember this one');
  });

  test('updating season progress stepper persists via API', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    // Watching series open on Episodes; stay on Overview so no unmocked season is fetched.
    await page.getByRole('tab', { name: 'Overview' }).click();
    const increaseSeason = page.getByRole('button', { name: 'Increase season' });
    const currentSeason = async () => {
      const progress = await (await request.get('/api/progress/1396')).json() as { currentSeason: number } | null;
      return progress?.currentSeason;
    };
    await increaseSeason.click();
    await expect.poll(currentSeason).toBe(2);
    await increaseSeason.click();
    await expect.poll(currentSeason).toBe(3);
  });

  test('toggling an episode marks it watched and updates counter', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('tab', { name: 'Episodes' }).click();
    // Counter starts at 0/7
    const counter = page.getByText(/^\d+\/\d+ watched$/);
    await expect(counter).toContainText('0/7 watched');
    // Toggle the Pilot episode
    await page.locator('[data-episode="1"]').click();
    await expect(counter).toContainText('1/7 watched');
  });

  test('Mark all watched button marks all episodes and updates counter', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('tab', { name: 'Episodes' }).click();
    await page.getByRole('button', { name: /Mark all watched/i }).click();
    const counter = page.getByText(/^\d+\/\d+ watched$/);
    await expect(counter).toContainText('7/7 watched');
  });

  test('Unmark all button resets episode counter to 0', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series/1396');
    await page.getByRole('tab', { name: 'Episodes' }).click();
    // Mark all first, then unmark
    await page.getByRole('button', { name: /Mark all watched/i }).click();
    await page.getByRole('button', { name: /Unmark all/i }).click();
    const counter = page.getByText(/^\d+\/\d+ watched$/);
    await expect(counter).toContainText('0/7 watched');
  });
});
