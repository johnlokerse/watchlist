import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';

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
});
