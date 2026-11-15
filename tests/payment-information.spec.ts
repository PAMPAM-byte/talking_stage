import { test, expect } from '@playwright/test';

test('payment information is clear and fits phone, tablet and desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/payment-information');
  await expect(page.getByRole('heading', { level: 1, name: 'Payment information' })).toBeVisible();
  await expect(page.locator('.policy-content > section')).toHaveCount(7);
  await expect(page.locator('.payment-facts')).toContainText('₦50 each · at least 10');
  await expect(page.locator('.payment-facts')).toContainText('Bachs secure checkout');
  await expect(page.locator('#payment-information-section-6')).toContainText('not refundable');
  await expect(page.locator('.payment-flow li')).toHaveCount(3);
  // Live pages (15 Nov 2026): no draft banner or preview-era statements.
  await expect(page.getByText('Draft for product review', { exact: true })).toHaveCount(0);
  await expect(page.locator('.policy-page')).not.toContainText(/local preview|simulated|before public launch|still require/i);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `docs/reviews/payment-information-red-${width}.png`, fullPage: true });
  }
});

test('section navigation and payment control links work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/payment-information');
  const link = page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Gifts are optional' });
  await link.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#payment-information-section-3$/);
  await expect(page.locator('#payment-information-section-3')).toBeFocused();
  await expect(page.getByRole('link', { name: 'Manage gift requests' })).toHaveAttribute('href', '/settings/requests');
  await expect(page.getByRole('link', { name: 'Review gift payments' })).toHaveAttribute('href', '/settings/payments');
  await page.getByRole('link', { name: 'Read Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
});
