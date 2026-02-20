import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';

test.describe('Navigation', () => {
  test('redirects / to /upcoming', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/');
    await expect(page).toHaveURL('/upcoming');
  });

  test('desktop nav renders all four links', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    const nav = page.locator('header nav');
    await expect(nav.getByRole('link', { name: 'Upcoming' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Library' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Discover' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('brand text is visible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await expect(page.locator('header').getByText('Watchlist')).toBeVisible();
  });

  test('navigating to /library shows Library page', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.locator('header nav').getByRole('link', { name: 'Library' }).click();
    await expect(page).toHaveURL('/library');
    await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible();
  });

  test('navigating to /discover shows Discover page', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.locator('header nav').getByRole('link', { name: 'Discover' }).click();
    await expect(page).toHaveURL('/discover');
  });

  test('navigating to /settings shows Settings page', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming');
    await page.locator('header nav').getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
  });

  test('active nav link has accent styling', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library');
    const libraryLink = page.locator('header nav').getByRole('link', { name: 'Library' });
    // Active link should have bg-accent/15 class applied
    await expect(libraryLink).toHaveClass(/text-accent/);
  });
});
