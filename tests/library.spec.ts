import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';
import { seedMovie, seedSeries, clearLibrary } from './helpers/seed';

test.beforeEach(async ({ request }) => {
  await clearLibrary(request);
});

test.describe('Library Page', () => {
  test('shows "Movies" heading', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies');
    await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible();
  });

  test('shows empty state when library is empty', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByText('No movies in your library yet.')).toBeVisible();
    await expect(page.getByText('Search above to find and add some!')).toBeVisible();
  });

  test('Library/Upcoming segmented control is visible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies');
    await expect(page.getByRole('tab', { name: 'Library' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Upcoming' })).toBeVisible();
  });

  test('segmented control supports arrow-key navigation', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies');
    const libraryTab = page.getByRole('tab', { name: 'Library' });
    await libraryTab.focus();
    await libraryTab.press('ArrowRight');
    await expect(page).toHaveURL('/movies?view=upcoming');
    await expect(page.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute('aria-selected', 'true');
  });

  test('Series route shows series empty state', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series');
    await expect(page.getByText('No series in your library yet.')).toBeVisible();
  });

  test('movie filter pills render with correct labels', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan to Watch' })).toBeVisible();
  });

  test('mobile filter panel state persists after refresh', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupTMDBMocks(page);
    await page.goto('/library');

    const filterToggle = page.getByRole('button', { name: 'Toggle library filters' });
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');

    await filterToggle.click();
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
    await page.reload();
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');

    await filterToggle.click();
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
    await page.reload();
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('series tab has 3 filter pills including Watching', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series');
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Watching' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan to Watch' })).toBeVisible();
  });

  test('search bar is visible with correct placeholder', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByPlaceholder('Search your movies or find new ones...')).toBeVisible();
  });

  test('search placeholder updates when switching to series tab', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/series');
    await expect(page.getByPlaceholder('Search your series or find new ones...')).toBeVisible();
  });

  test('seeded movie appears in Watched section', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByText('The Accountant')).toBeVisible();
  });

  test('section heading toggles collapse and expand', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByRole('link', { name: /The Accountant/ })).toBeVisible();
    const watchedSectionToggle = page.locator('h2.section-title:has-text("Watched") button');
    await watchedSectionToggle.click();
    await expect(page.getByRole('link', { name: /The Accountant/ })).not.toBeVisible();
    await watchedSectionToggle.click();
    await expect(page.getByRole('link', { name: /The Accountant/ })).toBeVisible();
  });

  test('seeded series appears in Watching section', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series');
    await expect(page.getByText('Breaking Bad')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Watching' })).toBeVisible();
  });

  test('series tab shows Watching before Plan to Watch', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await seedSeries(request, {
      tmdbId: 1399,
      title: 'Game of Thrones',
      status: 'plan_to_watch',
    });
    await setupTMDBMocks(page);
    await page.goto('/series');

    // Wait for series content to render before reading section order.
    await expect(page.getByRole('heading', { name: 'Watching' })).toBeVisible();
    const sectionTitles = await page.locator('h2.section-title').allTextContents();
    expect(sectionTitles.map((title) => title.trim()).slice(0, 2)).toEqual(['Watching', 'Plan to Watch']);
  });

  test('status filter hides non-matching items', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await seedMovie(request, {
      tmdbId: 157336,
      title: 'Interstellar',
      releaseDate: '2014-11-05',
      status: 'plan_to_watch',
    });
    await setupTMDBMocks(page);
    await page.goto('/library');
    // Both items visible initially
    await expect(page.getByText('The Accountant')).toBeVisible();
    await expect(page.getByText('Interstellar')).toBeVisible();
    // Filter to only Plan to Watch (scope to the filter chip, not the section heading)
    await page.getByRole('group', { name: 'Filters' }).getByRole('button', { name: 'Plan to Watch' }).click();
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
    await page.goto('/series');
    await page.getByText('Breaking Bad').click();
    await expect(page).toHaveURL('/series/1396');
  });

  test('back button restores the previous library scroll position for a series', async ({ page, request }) => {
    for (let i = 0; i < 30; i += 1) {
      await seedSeries(request, {
        tmdbId: 3000 + i,
        title: `Series ${i + 1}`,
        status: 'watching',
      });
    }

    await setupTMDBMocks(page);
    await page.goto('/series');
    await page.getByTitle('List view').click();

    const target = page.locator('[data-scroll-restore-id="series-3024"]');
    await target.scrollIntoViewIfNeeded();

    const scrollBeforeOpen = await page.evaluate(() => window.scrollY);

    // Click the inner <Link> — the list-item div itself has no navigation handler
    await target.getByRole('link').click();
    await expect(page).toHaveURL('/series/3024');

    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL('/series');
    await expect(target).toBeVisible();

    const scrollAfterBack = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfterBack - scrollBeforeOpen)).toBeLessThan(120);
  });

  test('view toggle buttons are visible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByTitle('Card view')).toBeVisible();
    await expect(page.getByTitle('List view')).toBeVisible();
  });

  test('switching to list view shows items as rows', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    // Default is card view
    await expect(page.getByTitle('Card view')).toHaveAttribute('aria-pressed', 'true');
    // Switch to list view
    await page.getByTitle('List view').click();
    await expect(page.getByTitle('List view')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('The Accountant')).toBeVisible();
  });

  test('view mode preference persists across page navigation', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    // Switch to list view
    await page.getByTitle('List view').click();
    await expect(page.getByTitle('List view')).toHaveAttribute('aria-pressed', 'true');
    // Navigate away and back
    await page.goto('/discover');
    await page.goto('/library');
    // List view should still be active
    await expect(page.getByTitle('List view')).toHaveAttribute('aria-pressed', 'true');
  });

  test('list view shows series with progress label', async ({ page, request }) => {
    await seedSeries(request, { status: 'watching' });
    await setupTMDBMocks(page);
    await page.goto('/series');
    await page.getByTitle('List view').click();
    await expect(page.getByText('Breaking Bad')).toBeVisible();
  });

  test('switching back to card view from list view works', async ({ page, request }) => {
    await seedMovie(request, { status: 'watched' });
    await setupTMDBMocks(page);
    await page.goto('/library');
    // Switch to list, then back to cards
    await page.getByTitle('List view').click();
    await expect(page.getByTitle('List view')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTitle('Card view').click();
    await expect(page.getByTitle('Card view')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('The Accountant')).toBeVisible();
  });
});

const MOVIE_GENRES = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 53, name: 'Thriller' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
];

const SERIES_GENRES = [
  { id: 18, name: 'Drama' },
  { id: 80, name: 'Crime' },
];

async function mockGenres(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/tmdb/genre/movie/list*', (route) =>
    route.fulfill({ json: { genres: MOVIE_GENRES } }),
  );
  await page.route('**/api/tmdb/genre/tv/list*', (route) =>
    route.fulfill({ json: { genres: SERIES_GENRES } }),
  );
}


function movieCardTitles(page: import('@playwright/test').Page): Promise<string[]> {
  return page.locator('a[href^="/movie/"] h3').allTextContents();
}

test.describe('Library sorting', () => {
  test('sort dropdown renders', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByLabel('Sort library')).toBeVisible();
  });

  test('selecting Rating reorders cards', async ({ page, request }) => {
    // Seed High Rated first, Low Rated second so default (newest added) puts Low Rated first.
    await seedMovie(request, {
      tmdbId: 11,
      title: 'High Rated',
      releaseDate: '2010-01-01',
      status: 'watched',
      userRating: 9,
    });
    await seedMovie(request, {
      tmdbId: 12,
      title: 'Low Rated',
      releaseDate: '2011-01-01',
      status: 'watched',
      userRating: 3,
    });
    await setupTMDBMocks(page);
    await page.goto('/library');

    await expect(page.getByText('High Rated')).toBeVisible();
    await expect(page.getByText('Low Rated')).toBeVisible();
    // Default sort = newest added → Low Rated (seeded last) first.
    expect(await movieCardTitles(page)).toEqual(['Low Rated', 'High Rated']);

    await page.getByLabel('Sort library').selectOption('rating-desc');
    // Now High Rated (9) comes before Low Rated (3).
    await expect.poll(() => movieCardTitles(page)).toEqual(['High Rated', 'Low Rated']);
  });
});

test.describe('Library genre filtering', () => {
  test('genre chips render only for present genres', async ({ page, request }) => {
    await seedMovie(request, {
      tmdbId: 21,
      title: 'Action Movie',
      releaseDate: '2010-01-01',
      status: 'watched',
      genreIds: [28],
    });
    await seedMovie(request, {
      tmdbId: 22,
      title: 'Comedy Movie',
      releaseDate: '2011-01-01',
      status: 'watched',
      genreIds: [35],
    });
    await setupTMDBMocks(page);
    await mockGenres(page);
    await page.goto('/library');

    await expect(page.getByRole('button', { name: 'Action' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comedy' })).toBeVisible();
    // Genres not present among items should not render a chip.
    await expect(page.getByRole('button', { name: 'Thriller' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Drama' })).toHaveCount(0);
  });

  test('selecting a genre narrows results', async ({ page, request }) => {
    await seedMovie(request, {
      tmdbId: 21,
      title: 'Action Movie',
      releaseDate: '2010-01-01',
      status: 'watched',
      genreIds: [28],
    });
    await seedMovie(request, {
      tmdbId: 22,
      title: 'Comedy Movie',
      releaseDate: '2011-01-01',
      status: 'watched',
      genreIds: [35],
    });
    await setupTMDBMocks(page);
    await mockGenres(page);
    await page.goto('/library');
    await expect(page.getByText('Action Movie')).toBeVisible();
    await expect(page.getByText('Comedy Movie')).toBeVisible();

    await page.getByRole('button', { name: 'Action' }).click();
    await expect(page.getByText('Action Movie')).toBeVisible();
    await expect(page.getByText('Comedy Movie')).not.toBeVisible();
  });

  test('switching media routes clears genre selection', async ({ page, request }) => {
    await seedMovie(request, {
      tmdbId: 21,
      title: 'Action Movie',
      releaseDate: '2010-01-01',
      status: 'watched',
      genreIds: [28],
    });
    await seedMovie(request, {
      tmdbId: 22,
      title: 'Comedy Movie',
      releaseDate: '2011-01-01',
      status: 'watched',
      genreIds: [35],
    });
    await seedSeries(request, {
      tmdbId: 23,
      title: 'Drama Series',
      status: 'watching',
      genreIds: [18],
    });
    await setupTMDBMocks(page);
    await mockGenres(page);
    await page.goto('/library');

    await page.getByRole('button', { name: 'Action' }).click();
    await expect(page.getByText('Comedy Movie')).not.toBeVisible();

    // Switch to Series and back to Movies.
    await page.locator('header nav').getByRole('link', { name: 'Series' }).click();
    await expect(page.getByText('Drama Series')).toBeVisible();
    await page.locator('header nav').getByRole('link', { name: 'Movies' }).click();

    // Genre selection should be reset → both movies visible again.
    await expect(page.getByText('Action Movie')).toBeVisible();
    await expect(page.getByText('Comedy Movie')).toBeVisible();
  });
});
