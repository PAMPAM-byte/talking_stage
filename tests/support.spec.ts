import { test, expect } from '@playwright/test';
test('support topics, guidance and contact scope fit all screen sizes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/support');
  await expect(page.getByRole('heading', { level: 1, name: 'Help & support' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Help topics' }).locator('a')).toHaveCount(4);
  await expect(page.locator('.support-faq details')).toHaveCount(5);
  await expect(page.locator('.support-contact')).toContainText('does not submit a support request');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `docs/reviews/support-red-${width}.png`, fullPage: true });
  }
});
test('support topic links, keyboard FAQs and recovery navigation work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/support');
  const topic = page.getByRole('navigation', { name: 'Help topics' }).getByRole('link', { name: /Payments & requests/ });
  await topic.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#help-payments')).toBeFocused();
  await expect(page).toHaveURL(/#help-payments$/);
  const faq = page.locator('.support-faq details').last();
  await faq.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(faq).toHaveAttribute('open', '');
  await expect(faq.locator('p')).toContainText('have not been supplied yet');
  await page.keyboard.press('Enter'); await expect(faq).not.toHaveAttribute('open', '');
  await page.getByRole('link', { name: 'Review account recovery', exact: true }).click();
  await expect(page).toHaveURL(/\/recover$/);
});
