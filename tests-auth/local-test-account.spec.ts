import { test, expect } from '@playwright/test';
import credentials from '../lib/backend/local-test-account.json';

test('local sample credentials replace old details and sign in through normal authentication', async ({ page }) => {
  test.skip(process.env.TALKINGSTAGE_LOCAL_TEST_ACCOUNT !== '1', 'Run npm run backend:test-account first.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('old-details@example.test');
  await page.getByLabel('Password', { exact: true }).fill('old-password');
  await page.getByRole('button', { name: 'Use test account' }).click();
  await expect(page.getByLabel('Email address')).toHaveValue(credentials.email);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(credentials.password);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/discover(?:\?|$)/);
  await expect(page.getByRole('main')).toBeVisible();
});
