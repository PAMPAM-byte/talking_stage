import { test, expect } from '@playwright/test';

test('landing is complete, photos load, and all screen sizes fit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A little banter.A little chemistry.');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('.tsl-site')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.tsl-heroPortrait').first()).toHaveCSS('position', 'relative');
  await expect(page.getByRole('link', { name: 'Find your conversation', exact: true })).toHaveCSS('background-color', 'rgb(207, 36, 69)');
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const heading = page.getByRole('heading', { level: 1 });
    expect((await heading.boundingBox())!.width).toBeLessThanOrEqual(width);
    if ([390, 1440].includes(width)) {
      await page.locator('main img').evaluateAll(async images => {
        await Promise.all(images.map(async image => { const photo = image as HTMLImageElement; photo.loading = 'eager'; await photo.decode(); }));
      });
      await page.screenshot({ path: `docs/reviews/landing-red-${width}.png`, fullPage: true });
    }
  }
  await expect(page.locator('#how-it-works')).toBeVisible();
  await expect(page.locator('#personalities article')).toHaveCount(4);
  await expect(page.locator('#questions details')).toHaveCount(6);
  expect(errors).toEqual([]);
});

test('section navigation, keyboard FAQs and entry links work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByRole('link', { name: 'See how it works' }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  const faq = page.locator('#questions details').first();
  await faq.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(faq).toHaveAttribute('open', '');
  await expect(faq.locator('p')).toContainText('fictional adult AI characters');
  await page.keyboard.press('Enter'); await expect(faq).not.toHaveAttribute('open', '');
  await page.getByRole('link', { name: 'Find your conversation', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/age$/);
  await expect(page.getByRole('checkbox', { name: 'I am 18 or older' })).not.toBeChecked();
});

test('failed hero photography has a readable retry action', async ({ page }) => {
  await page.route('**/_next/image?*', async route => {
    if (route.request().url().includes('char-zuri-gallery-v2')) await route.abort();
    else await route.continue();
  });
  await page.goto('/');
  const retry = page.getByRole('button', { name: 'Reload Zuri’s photo' });
  await expect(retry).toBeVisible();
  await page.unroute('**/_next/image?*');
  await retry.click();
  await expect(page.getByRole('img', { name: /Zuri, a fictional adult AI character, enjoying/ })).toBeVisible();
});

test('scroll reveals and parallax respect live reduced-motion changes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const visual = page.locator('.tsl-heroVisual');
  await expect.poll(() => visual.evaluate(element => (element as HTMLElement).style.getPropertyValue('--tsl-depth'))).not.toBe('');
  const before = await visual.evaluate(element => (element as HTMLElement).style.getPropertyValue('--tsl-depth'));
  await page.evaluate(() => window.scrollTo({ top: 250, behavior: 'instant' }));
  await expect.poll(() => visual.evaluate(element => (element as HTMLElement).style.getPropertyValue('--tsl-depth'))).not.toBe(before);
  const card = page.locator('.tsl-personality').first();
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => card.evaluate(element => element.getAnimations().length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => visual.evaluate(element => (element as HTMLElement).style.getPropertyValue('--tsl-depth'))).toBe('');
  await expect.poll(() => card.evaluate(element => element.getAnimations().length)).toBe(0);
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  await expect(card).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('landing content and FAQs remain usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.tsl-personality').first()).toHaveCSS('opacity', '1');
  const faq = page.locator('#questions details').first();
  await faq.locator('summary').click();
  await expect(faq).toHaveAttribute('open', '');
  await context.close();
});
