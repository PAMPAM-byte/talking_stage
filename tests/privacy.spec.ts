import { test, expect } from '@playwright/test';

test('privacy is readable and responsive with clear draft scope', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy & your data' })).toBeVisible();
  await expect(page.locator('.privacy-highlights > div')).toHaveCount(3);
  await expect(page.locator('.policy-content > section')).toHaveCount(8);
  // Live pages (15 Nov 2026): no draft banner or preview-era statements.
  await expect(page.getByText('Draft for product review', { exact: true })).toHaveCount(0);
  await expect(page.locator('.policy-page')).not.toContainText(/local preview|simulated|before public launch|still require/i);
  await expect(page.locator('#privacy-section-5')).toContainText('Anthropic');
  await expect(page.locator('#privacy-section-8')).toContainText('support@talkingstage.buzz');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `docs/reviews/privacy-red-${width}.png`, fullPage: true });
  }
});

test('privacy section navigation and practical control links work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/privacy');
  const link = page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Your controls and deleting your account' });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#privacy-section-6$/);
  await expect(page.locator('#privacy-section-6')).toBeFocused();
  await expect(page.getByRole('link', { name: 'Review memory controls' })).toHaveAttribute('href', '/settings/memories');
  await expect(page.getByRole('link', { name: 'Review account deletion' })).toHaveAttribute('href', '/settings/account');
  await page.getByRole('link', { name: 'Read Payment information' }).click();
  await expect(page).toHaveURL(/\/payment-information$/);
  await page.goto('/terms');
  await page.getByRole('link', { name: 'Read Privacy', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy & your data' })).toBeVisible();
});
