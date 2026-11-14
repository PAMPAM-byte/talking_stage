import { test, expect } from '@playwright/test';
test('Like hearts appear immediately and clean up', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await page.getByRole('button', { name: /^Like / }).click();
  await expect(page.locator('[data-meet-feedback] span')).toHaveCount(14);
  await expect(page.locator('[data-meet-feedback]')).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('[data-meet-feedback]')).toHaveCount(0, { timeout: 5000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /^Like / }).click();
  await expect(page.locator('[data-meet-feedback]')).toHaveCount(0);
});
