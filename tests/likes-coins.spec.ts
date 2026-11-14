import { test, expect, type Page } from '@playwright/test';

// Likes and coins (founder request, 14 Nov 2026), preview only.
async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page.locator('.discovery-deck__card')).toHaveCount(1);
}
const key = 'talkingstage:likes-coins:v1:mock-account';

test('like, a character likes back, starting a chat uses one coin, carrying on is free', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);
  const name = await page.locator('.discovery-deck__card').getByRole('heading').innerText();
  await page.getByRole('button', { name: /^Like / }).click();
  await expect(page).toHaveURL(/\/discover/);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Likes' }).click();
  await expect(page.getByRole('heading', { name: 'Likes', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: '10 coins. Buy coins' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No one has liked you back yet' })).toBeVisible();
  await page.locator('.likes-page summary').click();
  await page.getByRole('button', { name: 'Run the 30-minute check now' }).click();
  // The first like always gets an answer, so a new person is never left with nothing.
  await expect(page.getByRole('heading', { name: /Liked you back/ })).toBeVisible();
  await expect(page.locator('.match-card')).toContainText(name.split(',')[0]);
  await page.getByRole('button', { name: /^Start a conversation with .+, uses 1 coin$/ }).click();
  await expect(page).toHaveURL(/\/messages\/preview-/);
  await page.goto('/likes');
  await expect(page.getByRole('link', { name: '9 coins. Buy coins' })).toBeVisible();
  await page.getByRole('link', { name: 'Open chat' }).click();
  await expect(page).toHaveURL(/\/messages\/preview-/);
  await page.goto('/likes');
  await expect(page.getByRole('link', { name: '9 coins. Buy coins' })).toBeVisible();
});

test('a character who says no is never announced, and out of coins leads to Buy coins', async ({ page }) => {
  await signIn(page);
  await page.evaluate(k => {
    const now = Date.now();
    sessionStorage.setItem(k, JSON.stringify({ version: 1, coins: 0, ledger: [], firstMatchGiven: true, likes: {
      'char-amara': { likedAt: now - 3_600_000, reviewAt: now - 1_800_000, outcome: 'match', reviewedAt: now - 1_800_000, seen: true },
      'char-zuri': { likedAt: now - 3_600_000, reviewAt: now - 1_800_000, outcome: 'no', reviewedAt: now - 1_800_000 },
    } }));
  }, key);
  await page.goto('/likes');
  await expect(page.locator('.match-card')).toHaveCount(1);
  await expect(page.getByText('Zuri')).toHaveCount(0);
  await expect(page.getByText('You’re out of coins')).toBeVisible();
  await page.getByRole('link', { name: 'Buy coins to start' }).click();
  await expect(page).toHaveURL(/\/coins\?for=char-amara/);
  await page.goto('/characters/char-zuri');
  await expect(page.getByRole('status').filter({ hasText: 'You liked Zuri' })).toBeVisible();
});

test('buying coins: at least 10, ₦50 each, summary and confirmation', async ({ page }) => {
  await signIn(page);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/coins');
    await expect(page.getByRole('heading', { name: 'Buy coins' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.getByRole('button', { name: 'Pay ₦1,000' })).toBeVisible();
  await page.getByRole('radio').first().check();
  await expect(page.getByRole('button', { name: 'Pay ₦500' })).toBeVisible();
  await page.getByRole('radio').last().check();
  await page.getByLabel('How many coins').fill('9');
  await expect(page.getByText('Buy at least 10 coins, in whole numbers.')).toBeVisible();
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.locator('.notice--danger')).toContainText('Buy at least 10 coins');
  await page.getByLabel('How many coins').fill('25');
  await page.getByRole('button', { name: 'Pay ₦1,250' }).click();
  await expect(page.getByRole('heading', { name: '25 coins added' })).toBeVisible();
  await expect(page.getByText('You now have 35 coins.')).toBeVisible();
});
