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
    await page.goto('/movies');
    await page.goto('/movie/302946');
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL('/movies');
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

  test('shows release timeline on overview', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await expect(page.getByText('Release timeline')).toBeVisible();
    await expect(page.getByText('Theatrical Release')).toBeVisible();
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
    await page.getByRole('button', { name: 'Watched' }).click();
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

  test('status selector has Watched and Plan to Watch options', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    const select = page.getByRole('combobox');
    await expect(select).toBeVisible();
    await expect(select.getByRole('option', { name: 'Watched' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Plan to Watch' })).toBeAttached();
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

  test('Where to Watch fetches deep links only after opening the tab', async ({ page, request }) => {
    await request.put('/api/settings', {
      data: {
        country: 'NL',
        streamingAvailabilityApiKey: 'test-streaming-key',
      },
    });

    let watchLinkRequests = 0;
    await page.route('**/api/watch-links/movie/302946**', (route) => {
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
              link: 'https://www.netflix.com/title/12345',
            },
            {
              serviceId: 'prime',
              serviceName: 'Prime Video',
              tmdbProviderIds: [119],
              type: 'subscription',
              link: 'https://www.primevideo.com/detail/0ABC',
            },
            {
              serviceId: 'apple',
              serviceName: 'Apple TV',
              tmdbProviderIds: [2, 350],
              type: 'rent',
              link: 'https://tv.apple.com/movie/example',
            },
          ],
        },
      });
    });

    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    expect(watchLinkRequests).toBe(0);

    await page.getByRole('button', { name: 'Where to Watch' }).click();
    await expect.poll(() => watchLinkRequests).toBe(1);

    await expect(page.getByRole('link', { name: 'Open Netflix from Stream' })).toHaveAttribute(
      'href',
      'https://www.netflix.com/title/12345',
    );
    await expect(page.getByRole('link', { name: 'Open Amazon Prime Video from Stream' })).toHaveAttribute(
      'href',
      'https://www.primevideo.com/detail/0ABC',
    );
    await expect(page.getByRole('link', { name: 'Open Apple TV from Rent' })).toHaveAttribute(
      'href',
      'https://tv.apple.com/movie/example',
    );
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

  test('clicking a rating star saves the rating via API', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    // Click the 7-star button in the Rating group
    await page.getByRole('group', { name: 'Rating' }).getByRole('button', { name: '7 stars' }).click();
    // Verify the rating was persisted via the REST API
    const res = await request.get('/api/library/302946/movie');
    const item = await res.json() as { userRating: number };
    expect(item.userRating).toBe(7);
  });

  test('saving notes persists via API', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    const notesInput = page.getByPlaceholder('Add personal notes...');
    await notesInput.fill('Great film');
    await page.getByRole('button', { name: 'Save' }).click();
    // Verify the note was persisted via the REST API
    const res = await request.get('/api/library/302946/movie');
    const item = await res.json() as { notes: string };
    expect(item.notes).toBe('Great film');
  });

  test('saved notes persist after re-navigation', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    const notesInput = page.getByPlaceholder('Add personal notes...');
    await notesInput.fill('Persistent note');
    await page.getByRole('button', { name: 'Save' }).click();
    // Navigate away and back
    await page.goto('/movies');
    await page.goto('/movie/302946');
    await expect(page.getByPlaceholder('Add personal notes...')).toHaveValue('Persistent note');
  });

  test('changing status dropdown updates status via API', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await page.getByRole('combobox').selectOption('plan_to_watch');
    const res = await request.get('/api/library/302946/movie');
    const item = await res.json() as { status: string };
    expect(item.status).toBe('plan_to_watch');
  });

  test('marking a movie watched records a "Watched on" date', async ({ page, request }) => {
    await seedMovie(request, { status: 'plan_to_watch' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await page.getByRole('combobox').selectOption('watched');
    await expect(page.getByText(/Watched on/)).toBeVisible();
    await expect(page.getByLabel('Watched on date')).toBeVisible();
    // The server auto-stamps watchedAt on the transition to watched.
    const item = await (await request.get('/api/library/302946/movie')).json() as { watchedAt: string | null };
    expect(item.watchedAt).not.toBeNull();
  });

  test('logging a rewatch increments the watch count', async ({ page, request }) => {
    await seedMovie(request, { status: 'plan_to_watch' });
    await setupTMDBMocks(page);
    await page.goto('/movie/302946');
    await page.getByRole('combobox').selectOption('watched');
    // Auto-stamp creates the first watch_log entry.
    await expect(page.getByText(/Watched 1×/)).toBeVisible();
    await page.getByRole('button', { name: 'Log rewatch' }).click();
    await page.getByRole('button', { name: 'Save rewatch' }).click();
    await expect(page.getByText(/Watched 2×/)).toBeVisible();
    const log = await (await request.get('/api/library/302946/movie/watch-log')).json() as unknown[];
    expect(log.length).toBe(2);
  });
});
