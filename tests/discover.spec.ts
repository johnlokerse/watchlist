import { test, expect } from '@playwright/test';
import { setupTMDBMocks } from './helpers/mock-tmdb';

test.describe('Discover Page', () => {
  test('shows four content sections', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/discover');
    // Two "Shows" headings (Trending + Anticipated)
    await expect(page.getByRole('heading', { name: 'Shows' })).toHaveCount(2);
    // Two "Movies" headings
    await expect(page.getByRole('heading', { name: 'Movies' })).toHaveCount(2);
  });

  test('trending section labels are visible', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/discover');
    await expect(page.getByText('Trending').first()).toBeVisible();
    await expect(page.getByText('Anticipated').first()).toBeVisible();
  });

  test('trending series cards render from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/discover');
    // "Breaking Bad" is first in trending-series fixture
    await expect(page.getByText('Breaking Bad').first()).toBeVisible();
  });

  test('trending movies cards render from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/discover');
    // "The Accountant" is first in trending-movies fixture
    await expect(page.getByText('The Accountant').first()).toBeVisible();
  });

  test('anticipated movies cards render from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/discover');
    // "The Accountant 2" is first in anticipated-movies fixture
    await expect(page.getByText('The Accountant 2').first()).toBeVisible();
  });

  test('anticipated series cards render from fixture', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/discover');
    // "The Last of Us Season 2" is first in anticipated-series fixture
    await expect(page.getByText('The Last of Us Season 2').first()).toBeVisible();
  });

  test('clicking a movie card navigates to /movie/:id', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/discover');
    // Click first trending movie card (The Accountant, id 302946)
    await page.getByText('The Accountant').first().click();
    await expect(page).toHaveURL('/movie/302946');
  });

  test('clicking a series card navigates to /series/:id', async ({ page }) => {
    await setupTMDBMocks(page);
    await page.goto('/discover');
    await page.getByText('Breaking Bad').first().click();
    await expect(page).toHaveURL('/series/1396');
  });
});
