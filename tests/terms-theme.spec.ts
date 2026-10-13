import { test, expect } from '@playwright/test';

test('public and account pages share the landing identity and fit all widths', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/terms', '/privacy', '/support', '/payment-information', '/sign-in', '/onboarding/age', '/recover']) {
      await page.goto(route);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand').trim())).toBe('#cf2445');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    if ([390, 1440].includes(width)) {
      await page.goto('/terms');
      await page.screenshot({ path: `docs/reviews/terms-red-${width}.png`, fullPage: true });
    }
  }
});

test('terms navigation, disclosures and related policy links work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/terms');
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of service' })).toBeVisible();
  await expect(page.getByText('Draft for product review', { exact: true })).toBeVisible();
  await expect(page.locator('.policy-content > section')).toHaveCount(8);
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Voluntary payments' }).click();
  await expect(page).toHaveURL(/#terms-section-6$/);
  await expect(page.locator('#terms-section-6')).toBeInViewport();
  await page.getByRole('link', { name: 'Read Payment information' }).click();
  await expect(page).toHaveURL(/\/payment-information$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Payment information' })).toBeVisible();
});

test('discovery, profiles, chat, settings and administration use the shared red theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/discover');
    await expect(page.locator('.shell__navigation [aria-current="page"]')).toHaveCSS('background-color', 'rgb(207, 36, 69)');
    await expect(page.locator('.shell__header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('.deck-action--meet')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(page.locator('.deck-action--meet')).toHaveCSS('background-color', 'rgb(207, 36, 69)');
    await page.screenshot({ path: `docs/reviews/discovery-red-${width}.png`, fullPage: true });
    for (const route of ['/characters/char-amara', '/messages', '/settings', '/settings/preferences']) {
      await page.goto(route);
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.goto('/discover');
  await page.getByRole('button', { name: /^Meet / }).click();
  await expect(page).toHaveURL(/\/messages\/preview-/);
  await expect(page.locator('.chat-shell')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/admin/access');
  await page.getByLabel('Preview role').selectOption('admin');
  await page.getByRole('button', { name: 'Open selected preview' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.shell--admin .shell__nav-item[aria-current="page"]')).toHaveCSS('color', 'rgb(207, 36, 69)');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
