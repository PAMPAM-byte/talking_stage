import { test, expect } from '@playwright/test';
test('FAQ topics and answers fit all screen sizes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/faqs');
  await expect(page.getByRole('heading', { level: 1, name: 'Frequently asked questions' })).toBeVisible();
  await expect(page.locator('.faq-topic')).toHaveCount(4);
  await expect(page.locator('.faq-topic details')).toHaveCount(16);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `docs/reviews/faqs-${width}.png`, fullPage: true });
  }
});
test('landing entry, topic focus, keyboard expansion and help links work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: 'Browse all FAQs' }).click();
  await expect(page).toHaveURL(/\/faqs$/);
  const topic = page.getByRole('navigation', { name: 'FAQ topics' }).getByRole('link', { name: 'Discovery & conversations' });
  await topic.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#discovery-chat')).toBeFocused();
  const answer = page.locator('#discovery-chat details').nth(1);
  await answer.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(answer).toHaveAttribute('open', '');
  await expect(answer.locator('p')).toContainText('conversation with that character directly');
  await page.keyboard.press('Enter'); await expect(answer).not.toHaveAttribute('open', '');
  await page.getByRole('link', { name: 'Explore Support', exact: true }).click();
  await expect(page).toHaveURL(/\/support$/);
});
