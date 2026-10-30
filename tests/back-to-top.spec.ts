import { expect, test } from '@playwright/test';
// At the end of a long page there is a button that returns to the top (founder request, 30 Oct).
for (const width of [390, 1440]) test(`back to top appears at the end of a long page and scrolls up at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/faqs');
  const button = page.getByRole('button', { name: 'Back to top' });
  await expect(button).toBeHidden();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(button).toBeVisible();
  await page.screenshot({ path: `.local-services/back-to-top-${width}.png` });
  await button.click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(button).toBeHidden();
});
test('back to top stays clear of the phone navigation on Discover', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  const button = page.getByRole('button', { name: 'Back to top' });
  // Cards load after sign-in, so keep scrolling to the end until the page has its full height.
  await expect(async () => {
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect(button).toBeVisible({ timeout: 1000 });
  }).toPass();
  const nav = await page.getByRole('navigation', { name: 'Main navigation' }).boundingBox();
  const box = await button.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y);
});
