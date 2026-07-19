import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';

test.describe('Navigation', () => {
  test('redirects / to /movies', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/');
    await expect(page).toHaveURL('/movies');
  });

  test('desktop nav renders all four links', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies');
    const nav = page.locator('header nav');
    await expect(nav.getByRole('link', { name: 'Movies' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Series' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Discover' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('brand text is visible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies');
    await expect(page.locator('header').getByText('Watchlist')).toBeVisible();
  });

  test('navigating to Series shows the series library', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies');
    await page.locator('header nav').getByRole('link', { name: 'Series' }).click();
    await expect(page).toHaveURL('/series');
    await expect(page.getByRole('heading', { name: 'Series', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true');
  });

  test('navigating to /discover shows Discover page', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies');
    await page.locator('header nav').getByRole('link', { name: 'Discover' }).click();
    await expect(page).toHaveURL('/discover');
  });

  test('navigating to /settings shows Settings page', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies');
    await page.locator('header nav').getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
  });

  test('active nav link has accent styling', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/movies?view=upcoming');
    const moviesLink = page.locator('header nav').getByRole('link', { name: 'Movies' });
    await expect(moviesLink).toHaveClass(/text-accent/);
  });

  test('legacy library URLs redirect to the matching media library', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/library?tab=series');
    await expect(page).toHaveURL('/series');
  });

  test('legacy upcoming URLs redirect to the matching media upcoming view', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/upcoming?tab=series');
    await expect(page).toHaveURL('/series?view=upcoming');
  });
});
