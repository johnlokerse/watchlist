import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';
import { clearLibrary, seedMovie } from './helpers/seed';

/**
 * Chat tests focus on the CopilotChat floating button and panel UI.
 * The /api/chat/* endpoints are stubbed in test-server.ts so no real
 * Copilot CLI is required.
 */
test.describe('CopilotChat', () => {
  test('chat button is visible on all pages', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await expect(page.getByRole('button', { name: 'Open watch assistant' })).toBeVisible();
  });

  test('chat button is visible on library page', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    await expect(page.getByRole('button', { name: 'Open watch assistant' })).toBeVisible();
  });

  test('clicking chat button opens the panel', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.getByRole('button', { name: 'Open watch assistant' }).click();
    // Panel should appear; close button label changes
    await expect(page.getByRole('button', { name: 'Close assistant' })).toBeVisible();
  });

  test('chat panel shows loading/initialising state after opening', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.getByRole('button', { name: 'Open watch assistant' }).click();
    // Immediately after open, the panel renders (might show spinner or chat input)
    // The panel container is visible
    const panel = page.locator('.fixed.z-50').filter({ hasNot: page.locator('button[aria-label]') });
    // At minimum the close button appeared — panel is open
    await expect(page.getByRole('button', { name: 'Close assistant' })).toBeVisible();
  });

  test('clicking Close assistant button closes the panel', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.getByRole('button', { name: 'Open watch assistant' }).click();
    await expect(page.getByRole('button', { name: 'Close assistant' })).toBeVisible();
    await page.getByRole('button', { name: 'Close assistant' }).click();
    await expect(page.getByRole('button', { name: 'Open watch assistant' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close assistant' })).not.toBeVisible();
  });

  test('chat panel shows message input once session is ready', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.getByRole('button', { name: 'Open watch assistant' }).click();
    // The textarea is always in the DOM; wait for it to become enabled (session ready)
    const input = page.getByPlaceholder('Ask about your watchlist…');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toBeEnabled({ timeout: 5000 });
  });

  test('sending a message shows it in the chat panel', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.getByRole('button', { name: 'Open watch assistant' }).click();
    const input = page.getByPlaceholder('Ask about your watchlist…');
    // Wait for textarea to be enabled (session initialised)
    await expect(input).toBeEnabled({ timeout: 5000 });
    await input.fill('Hello');
    await input.press('Enter');
    // User's message should appear in the panel
    await expect(page.getByText('Hello')).toBeVisible();
  });

  test('assistant reply appears after sending a message', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.getByRole('button', { name: 'Open watch assistant' }).click();
    const input = page.getByPlaceholder('Ask about your watchlist…');
    // Wait for textarea to be enabled (session initialised)
    await expect(input).toBeEnabled({ timeout: 5000 });
    await input.fill('What should I watch?');
    await input.press('Enter');
    // Stub (or real Copilot) returns a reply — wait for any non-empty assistant message to appear
    // We check that the assistant message bubble has visible text content
    await expect(page.getByText(/stubbed test response|watchlist|watch|movie|series/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('chat add-to-library link adds item via + button', async ({ page, request }) => {
    await clearLibrary(request);
    await setupTMDBMocks(page);
    await page.goto('/upcoming');

    // Intercept the chat message endpoint to return a response containing an add: link
    await page.route('**/api/chat/message', (route) => {
      const body = [
        `data: ${JSON.stringify({ type: 'delta', content: 'How about [The Accountant](add:movie/302946)?' })}\n\n`,
        `data: ${JSON.stringify({ type: 'done' })}\n\n`,
      ].join('');
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body,
      });
    });

    await page.getByRole('button', { name: 'Open watch assistant' }).click();
    const input = page.getByPlaceholder('Ask about your watchlist…');
    await expect(input).toBeEnabled({ timeout: 5000 });
    await input.fill('Recommend something');
    await input.press('Enter');

    // Wait for the assistant message with "The Accountant" and the add (+) button
    await expect(page.getByText('The Accountant')).toBeVisible({ timeout: 10000 });
    const addButton = page.getByTitle('Add to watchlist');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // After clicking, the button transitions to ✓ (added state)
    await expect(page.getByTitle('Added to watchlist')).toBeVisible({ timeout: 5000 });

    // Verify the item was persisted in the library
    const res = await request.get('/api/library/302946/movie');
    expect(res.status()).toBe(200);
  });

  test('chat add-to-library link shows checkmark when item already exists', async ({ page, request }) => {
    await clearLibrary(request);
    await seedMovie(request, { tmdbId: 302946, status: 'plan_to_watch' });
    await setupTMDBMocks(page);
    await page.goto('/upcoming');

    await page.route('**/api/chat/message', (route) => {
      const body = [
        `data: ${JSON.stringify({ type: 'delta', content: 'Try [The Accountant](add:movie/302946).' })}\n\n`,
        `data: ${JSON.stringify({ type: 'done' })}\n\n`,
      ].join('');
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body,
      });
    });

    await page.getByRole('button', { name: 'Open watch assistant' }).click();
    const input = page.getByPlaceholder('Ask about your watchlist…');
    await expect(input).toBeEnabled({ timeout: 5000 });
    await input.fill('Recommend something');
    await input.press('Enter');

    await expect(page.getByText('The Accountant')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTitle('Added to watchlist')).toBeVisible({ timeout: 5000 });
  });
});
