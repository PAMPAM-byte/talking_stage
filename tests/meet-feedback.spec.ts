import { test, expect } from '@playwright/test';
test('Meet hearts appear immediately, survive entry, and clean up', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await page.getByRole('button', { name: /^Meet / }).click();
  await expect(page.locator('[data-meet-feedback] span')).toHaveCount(14);
  await expect(page.locator('[data-meet-feedback]')).toHaveCSS('pointer-events', 'none');
  await expect(page).toHaveURL(/\/messages\/preview-/);
  await expect(page.locator('[data-meet-feedback]')).toHaveCount(0);
  await page.goto('/discover');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /^Meet / }).click();
  await expect(page).toHaveURL(/\/messages\/preview-/);
  await expect(page.locator('[data-meet-feedback]')).toHaveCount(0);
});
