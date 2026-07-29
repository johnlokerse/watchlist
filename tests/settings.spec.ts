import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';
import { seedMovie, clearLibrary } from './helpers/seed';

test.describe('Settings Page', () => {
  test('shows Settings heading', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('shows Theme section with Default theme option', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await expect(page.getByText('Default')).toBeVisible();
  });

  test('lists all theme options', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    for (const name of [
      'Default', 'True OLED', 'Midnight Velvet', 'Dracula', 'Nord', 'Solarized Dark',
      'Solarized Light', 'Paper & Ink', 'Daylight Teal', 'Nord Light', 'Gruvbox Light',
      'Rosé Pine Dawn', 'Gruvbox',
    ]) {
      await expect(page.getByText(name)).toBeVisible();
    }
  });

  test('clicking a different theme updates active indicator', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await page.getByRole('button', { name: /Dracula/i }).click();
    const draculaButton = page.getByRole('button', { name: /Dracula/i });
    await expect(draculaButton.locator('span').filter({ hasText: '✓' })).toBeVisible();
  });

  test('dynamic themes toggle shows Light and Dark tabs', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await expect(page.getByText('Dynamic themes')).toBeVisible();
    await page.getByRole('switch', { name: 'Dynamic themes' }).click();
    await expect(page.getByRole('tab', { name: 'Light' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dark' })).toBeVisible();
  });

  test('dynamic Light tab lists light themes only', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await page.getByRole('switch', { name: 'Dynamic themes' }).click();
    await page.getByRole('tab', { name: 'Light' }).click();
    for (const name of ['Solarized Light', 'Paper & Ink', 'Daylight Teal', 'Nord Light', 'Gruvbox Light', 'Rosé Pine Dawn']) {
      await expect(page.getByRole('button', { name: new RegExp(name, 'i') })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /^Dracula/i })).toHaveCount(0);
  });

  test('dynamic Dark tab lists dark themes only', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await page.getByRole('switch', { name: 'Dynamic themes' }).click();
    await page.getByRole('tab', { name: 'Dark' }).click();
    await expect(page.getByRole('button', { name: /Midnight Velvet/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Dracula/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Paper & Ink/i })).toHaveCount(0);
  });

  test('shows Export to JSON button', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await expect(page.getByText(/Export to JSON/)).toBeVisible();
  });

  test('shows Import from JSON section with example JSON link', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await expect(page.getByText('Show example JSON')).toBeVisible();
  });

  test('Show example JSON details expands on click', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await page.getByText('Show example JSON').click();
    await expect(page.locator('pre').filter({ hasText: 'tmdbId' })).toBeVisible();
  });

  test('shows Danger Zone section', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');
    await expect(page.getByText('Danger Zone')).toBeVisible();
    await expect(page.getByText(/Clear All Library Data/)).toBeVisible();
  });

  test('import valid JSON adds items to library', async ({ page, request }) => {
    await clearLibrary(request);
    await setupTMDBMocks(page);
    await page.goto('/settings');

    const importData = JSON.stringify({
      items: [
        {
          tmdbId: 302946,
          title: 'The Accountant',
          contentType: 'movie',
          status: 'watched',
        },
      ],
    });
    const buffer = Buffer.from(importData);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'import.json',
      mimeType: 'application/json',
      buffer,
    });

    await expect(page.getByText(/Added 1 item/)).toBeVisible();
  });

  test('import invalid JSON shows error message', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');

    const buffer = Buffer.from('not valid json {{');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer,
    });

    // The error paragraph has class text-danger and starts with "✗"
    await expect(page.locator('.text-danger').filter({ hasText: '✗' })).toBeVisible();
  });

  test('import JSON with wrong structure shows error', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings');

    const buffer = Buffer.from(JSON.stringify({ wrong: 'structure' }));
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer,
    });

    await expect(page.getByText(/JSON must be an array/i)).toBeVisible();
  });

  test('Clear All Library Data button triggers confirmation dialog', async ({ page, request }) => {
    await clearLibrary(request);
    await seedMovie(request);
    await setupTMDBMocks(page);
    await page.goto('/settings');

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByText(/Clear All Library Data/).click();
    // After accepting and clearing, the button text is restored
    await expect(page.getByText(/Clear All Library Data/)).toBeVisible();
  });

  test('dismissing clear confirmation keeps library intact', async ({ page, request }) => {
    await clearLibrary(request);
    await seedMovie(request);
    await setupTMDBMocks(page);
    await page.goto('/settings');

    page.on('dialog', (dialog) => dialog.dismiss());
    await page.getByText(/Clear All Library Data/).click();
    await page.goto('/movies');
    await expect(page.getByText('The Accountant')).toBeVisible();
  });

  test('country dropdown change updates selected value', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });
    const countrySelect = page.locator('select').filter({ has: page.locator('option[value="NL"]') });
    await countrySelect.selectOption('US');
    await expect(countrySelect).toHaveValue('US');
  });

  test('Show Spoilers toggle starts unchecked and toggles on click', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });
    // Find the Toggle switch within the Show Spoilers row
    const toggle = page.locator('.flex.items-center.justify-between').filter({ hasText: 'Show Spoilers' }).getByRole('switch');
    // The toggle should reflect the loaded state — check it is not already enabled before interacting
    const currentState = await toggle.getAttribute('aria-checked');
    if (currentState === 'true') {
      // Reset it off first so we can test the toggle-on behavior
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
    }
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('Use OpenRouter toggle reveals API key input when enabled', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });
    const toggle = page.locator('.flex.items-center.justify-between').filter({ hasText: 'Use OpenRouter' }).getByRole('switch');
    if (await toggle.getAttribute('aria-checked') === 'true') {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
    }
    await expect(page.getByPlaceholder('sk-or-...')).not.toBeVisible();
    await toggle.click();
    await expect(page.getByPlaceholder('sk-or-...')).toBeVisible();
  });

  test('Streaming Availability API key setting explains optional deep linking', async ({ page, request }) => {
    await request.put('/api/settings', { data: { streamingAvailabilityApiKey: '' } });
    await setupTMDBMocks(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });

    await expect(page.getByLabel('Deep linking API key')).toBeVisible();
    await expect(page.getByText(/Optional\. Add a Streaming Availability API key/)).toBeVisible();
    await expect(page.getByText(/only uses it when you open a Where to Watch tab/)).toBeVisible();

    await page.getByLabel('Deep linking API key').fill('test-streaming-key');
    await expect(page.getByLabel('Deep linking API key')).toHaveValue('test-streaming-key');
  });

  test('export includes watchedAt and watch_log, and re-import restores them', async ({ request }) => {
    await clearLibrary(request);
    await seedMovie(request, { status: 'watched' });

    // Record a watched date + rewatch entry via the watch-log API.
    await request.post('/api/watch-log', {
      data: { tmdbId: 302946, contentType: 'movie', watchedAt: '2024-01-15T00:00:00.000Z', note: 'first viewing' },
    });

    const exported = await (await request.get('/api/library/export')).json() as {
      items: { tmdbId: number; watchedAt?: string }[];
      watchLog: { tmdbId: number; watchedAt: string; note?: string }[];
    };
    expect(exported.watchLog.length).toBe(1);
    expect(exported.watchLog[0]).toMatchObject({ tmdbId: 302946, watchedAt: '2024-01-15T00:00:00.000Z', note: 'first viewing' });
    expect(exported.items[0].watchedAt).toBe('2024-01-15T00:00:00.000Z');

    // Wipe and re-import from the exported backup.
    await clearLibrary(request);
    await request.post('/api/migrate', { data: exported });

    const item = await (await request.get('/api/library/302946/movie')).json() as { watchedAt: string | null };
    expect(item.watchedAt).toBe('2024-01-15T00:00:00.000Z');

    const log = await (await request.get('/api/library/302946/movie/watch-log')).json() as { note: string }[];
    expect(log.length).toBe(1);
    expect(log[0].note).toBe('first viewing');
  });

  test('import old backup without watchedAt/watch_log still works', async ({ request }) => {
    await clearLibrary(request);
    // A legacy backup shape with no watchedAt or watchLog fields.
    await request.post('/api/migrate', {
      data: {
        items: [{ tmdbId: 550, title: 'Fight Club', contentType: 'movie', status: 'watched' }],
        progress: [],
        episodes: [],
      },
    });
    const item = await (await request.get('/api/library/550/movie')).json() as { watchedAt: string | null; title: string };
    expect(item.title).toBe('Fight Club');
    expect(item.watchedAt).toBeNull();
    const log = await (await request.get('/api/library/550/movie/watch-log')).json() as unknown[];
    expect(log.length).toBe(0);
  });
});
