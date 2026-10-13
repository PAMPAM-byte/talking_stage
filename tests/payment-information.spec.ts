import { test, expect } from '@playwright/test';

test('payment information is clear and fits phone, tablet and desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/payment-information');
  await expect(page.getByRole('heading', { level: 1, name: 'Payment information' })).toBeVisible();
  await expect(page.locator('.policy-content > section')).toHaveCount(7);
  await expect(page.locator('.payment-facts')).toContainText('TalkingStage’s operator');
  await expect(page.locator('.payment-facts')).toContainText('Simulated payments only');
  await expect(page.locator('.payment-flow li')).toHaveCount(3);
  await expect(page.getByText('Draft for product review', { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `docs/reviews/payment-information-red-${width}.png`, fullPage: true });
  }
});

test('section navigation and payment control links work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/payment-information');
  const link = page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Understanding payment status' });
  await link.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#payment-information-section-4$/);
  await expect(page.locator('#payment-information-section-4')).toBeFocused();
  await expect(page.getByRole('link', { name: 'Manage monetary requests' })).toHaveAttribute('href', '/settings/requests');
  await expect(page.getByRole('link', { name: 'Review payment history' })).toHaveAttribute('href', '/settings/payments');
  await page.getByRole('link', { name: 'Read Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
});
