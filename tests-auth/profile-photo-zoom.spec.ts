import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';

test('click or tap opens each whole profile photo; hover leaves photos unchanged', async ({ page, browser }) => {
  test.skip(process.env.TALKINGSTAGE_LOCAL_TEST_ACCOUNT !== '1', 'Run npm run backend:test-account first.');
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Use test account' }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/discover$/, { timeout: 60000 });
  const cast = JSON.parse(readFileSync('.local-services/approved-cast-import.json', 'utf8'));
  const profilePath = `/characters/${cast.characters['char-amara'].id}?gender=woman`;
  await page.goto(profilePath);
  const photos = page.locator('.profile-photo-open'); await expect(photos).toHaveCount(2);
  mkdirSync('docs/reviews/profile-photo-zoom', { recursive: true });
  for (const index of [0, 1]) {
    const photo = photos.nth(index); await photo.hover();
    expect(await photo.locator('img').evaluate(node => getComputedStyle(node).transform)).toBe('none');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const assetPath = (await photo.locator('img').getAttribute('src'))!.split('?')[0];
    await photo.click();
    const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
    await expect(dialog.locator('img')).toHaveAttribute('src', `${assetPath}?w=1280`);
    await expect.poll(() => dialog.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    expect(await dialog.locator('img').evaluate(node => getComputedStyle(node).objectFit)).toBe('contain');
    await expect(dialog.getByRole('button', { name: /Zoom in|Zoom out|Fit photo/ })).toHaveCount(0);
    if (index === 0) await page.screenshot({ path: 'docs/reviews/profile-photo-zoom/click-full-photo-1280.png' });
    await page.keyboard.press('Escape'); await expect(photo).toBeFocused();
  }
  await photos.first().click();
  await page.getByRole('button', { name: 'Next photo', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Photo 2 of 2');
  await page.keyboard.press('ArrowLeft'); await expect(page.getByRole('status')).toHaveText('Photo 1 of 2');
  await page.keyboard.press('Escape');
  const touch = await browser.newContext({ storageState: await page.context().storageState(), viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const mobile = await touch.newPage(); await mobile.goto(`http://localhost:3102${profilePath}`);
    for (const index of [0, 1]) {
      await mobile.locator('.profile-photo-open').nth(index).tap();
      const dialog = mobile.getByRole('dialog'); await expect(dialog).toBeVisible();
      await expect.poll(() => dialog.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (index === 0) await mobile.screenshot({ path: 'docs/reviews/profile-photo-zoom/click-full-photo-390.png' });
      await dialog.getByRole('button', { name: 'Close amara’s photos', exact: true }).tap();
      await expect(dialog).toHaveCount(0);
    }
  } finally { await touch.close(); }
  await page.getByRole('link', { name: 'Back to discovery', exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?gender=woman$/);
});
