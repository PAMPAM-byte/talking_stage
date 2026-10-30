import { expect, test, type Page } from '@playwright/test';
// First visit on a device shows how to swipe; it stays dismissed afterwards (new-user feedback, 30 Oct).
async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
}
for (const width of [320, 390, 1440]) test(`swipe guide shows once and Got it dismisses it at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await signIn(page);
  const guide = page.getByRole('note', { name: 'How Discover works' });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Swipe right to Meet');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `.local-services/discover-guide-${width}.png` });
  await guide.getByRole('button', { name: 'Got it' }).click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Pass / })).toBeVisible();
  await expect(guide).toHaveCount(0);
});
test('the first Pass also dismisses the guide, and buttons work through it', async ({ page }) => {
  await signIn(page);
  const guide = page.getByRole('note', { name: 'How Discover works' });
  await expect(guide).toBeVisible();
  await page.getByRole('button', { name: /^Pass / }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByText(/2 of \d+ to discover/)).toBeVisible();
});
