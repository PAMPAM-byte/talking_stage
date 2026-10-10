import { expect, test } from '@playwright/test';
import credentials from '../lib/backend/local-test-account.json';
import cast from '../lib/mock/public-cast.json';

test('profile return preserves gender, other filters and pagination even after refreshing', async ({ page }) => {
  test.skip(process.env.TALKINGSTAGE_LOCAL_TEST_ACCOUNT !== '1', 'Run npm run backend:test-account first.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/discover$/, { timeout: 60000 });

  for (const [label, gender] of [['Women', 'woman'], ['Men', 'man'], ['Everyone', 'all']]) {
    await page.getByRole('navigation', { name: 'Character gender' }).getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/discover\\?gender=${gender}$`));
    await expect(page.getByRole('navigation', { name: 'Character gender' }).getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.character-card').first()).toBeVisible();
    const originalUrl = page.url();
    await page.locator('.character-card').first().getByRole('link', { name: /^Meet / }).click();
    await expect(page).toHaveURL(new RegExp(`/characters/[^?]+\\?gender=${gender}`));
    await page.reload();
    await page.getByRole('link', { name: 'Back to discovery', exact: true }).click();
    await expect(page).toHaveURL(originalUrl);
    await expect(page.getByRole('navigation', { name: 'Character gender' }).getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    const names = await page.locator('.character-card .button').allTextContents();
    for (const label of names) {
      const name = label.replace(/^Meet\s+/, '').trim();
      expect(cast.some(character => character.name === name && (gender === 'all' || character.gender === gender))).toBe(true);
    }
  }

  for (const query of ['gender=woman&interest=books', 'gender=all&page=2']) {
    await page.goto(`/discover?${query}`);
    await expect(page.locator('.character-card').first()).toBeVisible();
    const originalUrl = page.url();
    await page.locator('.character-card').first().getByRole('link', { name: /^Meet / }).click();
    await expect(page).toHaveURL(/\/characters\//);
    await page.getByRole('link', { name: 'Back to discovery', exact: true }).click();
    await expect(page).toHaveURL(originalUrl);
    await expect(page.locator('.character-card').first()).toBeVisible();
    await page.locator('.character-card').first().locator('a.character-photo').click();
    await expect(page).toHaveURL(/\/characters\//);
    await page.goBack();
    await expect(page).toHaveURL(originalUrl);
  }
});
