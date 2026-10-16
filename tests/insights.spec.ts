import { test, expect, type APIRequestContext } from '@playwright/test';
import { clearLibrary, seedMovie, seedSeries } from './helpers/seed';
import { setupTMDBMocks } from './helpers/mock-tmdb';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthsAgo(n: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - n, 15, 12);
}

function monthLabel(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * The Accountant: first watched two months ago, rewatched today.
 * Breaking Bad: two episodes ticked today.
 * Inception: marked watched without any date.
 */
async function seedActivity(request: APIRequestContext) {
  await seedMovie(request, { status: 'plan_to_watch' });
  await request.post('/api/watch-log', {
    data: { tmdbId: 302946, contentType: 'movie', watchedAt: monthsAgo(2).toISOString() },
  });
  await request.post('/api/watch-log', {
    data: { tmdbId: 302946, contentType: 'movie', watchedAt: new Date().toISOString() },
  });

  await seedSeries(request);
  await request.post('/api/episodes/toggle', { data: { tmdbId: 1396, season: 1, episode: 1 } });
  await request.post('/api/episodes/toggle', { data: { tmdbId: 1396, season: 1, episode: 2 } });

  await seedMovie(request, { tmdbId: 27205, title: 'Inception', status: 'watched' });
}

test.describe('Insights', () => {
  test.beforeEach(async ({ page, request }) => {
    await clearLibrary(request);
    await setupTMDBMocks(page);
  });

  test('sidebar link opens the insights page', async ({ page }) => {
    await page.goto('/movies');
    await page.locator('header nav').getByRole('link', { name: 'Insights' }).click();
    await expect(page).toHaveURL('/insights');
    await expect(page.getByRole('heading', { name: 'Insights', exact: true })).toBeVisible();
  });

  test('shows an empty state without watch history', async ({ page }) => {
    await page.goto('/insights');
    await expect(page.getByText('No watch history yet')).toBeVisible();
  });

  test('summarises movies, series and episodes in range', async ({ page, request }) => {
    await seedActivity(request);
    await page.goto('/insights');

    await expect(page.getByTestId('stat-movies')).toContainText('2');
    await expect(page.getByTestId('stat-series')).toContainText('1');
    await expect(page.getByTestId('stat-episodes')).toContainText('2');
    await expect(page.getByTestId('insights-footnote')).toContainText('Includes 1 rewatch');
    await expect(page.getByTestId('insights-footnote')).toContainText('1 watched title has no watch date');

    // Defaults to the current month, the latest period with activity.
    const details = page.getByTestId('period-details');
    await expect(details.getByRole('heading')).toHaveText(monthLabel(new Date()));
    await expect(details.getByRole('link', { name: /The Accountant/ })).toContainText('Movie · Rewatch');
    await expect(details.getByRole('link', { name: /Breaking Bad/ })).toContainText('Series · 2 episodes');
    await expect(details.getByRole('link', { name: /Breaking Bad/ })).toContainText('S1 E1–2');
    await expect(details.getByRole('link', { name: /Breaking Bad/ })).toHaveAttribute('href', '/series/1396');
  });

  test('hovering the chart shows the titles watched in that period', async ({ page, request }) => {
    await seedActivity(request);
    await page.goto('/insights');

    const hitArea = page.getByTestId('chart-hit-area');
    const box = await hitArea.boundingBox();
    if (!box) throw new Error('chart hit area not rendered');
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);

    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(monthLabel(new Date()));
    await expect(tooltip).toContainText('The Accountant');
    await expect(tooltip).toContainText('Breaking Bad');
    await expect(tooltip).toContainText(/Episodes\s*2/);
    await expect(tooltip).toContainText('2 episodes');

    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  test('series without dated episodes are left off the chart', async ({ page, request }) => {
    await seedActivity(request);
    // Completed by hand: a watch-log entry but no dated episodes.
    await seedSeries(request, { tmdbId: 1438, title: 'The Wire', status: 'watched' });
    await request.post('/api/watch-log', {
      data: { tmdbId: 1438, contentType: 'series', watchedAt: new Date().toISOString() },
    });
    await page.goto('/insights');

    await expect(page.getByTestId('stat-series')).toContainText('1');
    await expect(page.getByTestId('period-details').getByRole('link', { name: /The Wire/ })).toHaveCount(0);
    await expect(page.getByTestId('insights-footnote')).toContainText('2 watched titles have no watch date');
  });

  test('arrow keys move the selected period', async ({ page, request }) => {
    await seedActivity(request);
    await page.goto('/insights');

    await page.getByRole('img', { name: /Movies and series watched over time/ }).focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');

    const details = page.getByTestId('period-details');
    await expect(details.getByRole('heading')).toHaveText(monthLabel(monthsAgo(2)));
    await expect(details.getByRole('link', { name: /The Accountant/ })).toContainText('Movie');
    await expect(details.getByRole('link', { name: /Breaking Bad/ })).toHaveCount(0);
  });

  test('grouping and range are kept in the URL', async ({ page, request }) => {
    await seedActivity(request);
    await page.goto('/insights');

    await page.getByRole('tab', { name: 'Day', exact: true }).click();
    await page.getByRole('tab', { name: '30 days' }).click();
    await expect(page).toHaveURL(/by=day/);
    await expect(page).toHaveURL(/range=30d/);
    // The two-month-old first watch falls outside the last 30 days.
    await expect(page.getByTestId('stat-movies')).toContainText('1');

    await page.reload();
    await expect(page.getByRole('tab', { name: 'Day', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  test('episodes record when they were watched, and keep it when the season is marked', async ({ request }) => {
    await seedSeries(request);
    await request.post('/api/episodes/toggle', { data: { tmdbId: 1396, season: 1, episode: 1 } });
    const before = await (await request.get('/api/episodes/1396/1')).json() as { episode: number; watchedAt: string | null }[];
    expect(before[0].watchedAt).toBeTruthy();

    await request.post('/api/episodes/season', { data: { tmdbId: 1396, season: 1, episodes: [1, 2] } });
    const after = await (await request.get('/api/episodes/1396/1')).json() as { episode: number; watchedAt: string | null }[];
    expect(after.find((e) => e.episode === 1)?.watchedAt).toBe(before[0].watchedAt);
    expect(after.find((e) => e.episode === 2)?.watchedAt).toBeTruthy();
  });
});
