import { expect, test, type Page } from '@playwright/test';
import cast from '../lib/mock/public-cast.json';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.locator('.character-card')).toHaveCount(cast.length);
}

test('filters apply together, cancel without changing results, reset and handle failures', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Women', exact: true }).click();
  await expect(page.locator('.character-card')).toHaveCount(cast.filter(c => c.gender === 'woman').length);
  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByLabel('Personality', { exact: true }).selectOption('reserved');
  await page.getByLabel('Interest', { exact: true }).selectOption('books');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.locator('.character-card')).toHaveCount(1);
  await expect(page.locator('.character-card h2')).toHaveText('Zainab, 30');
  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByLabel('Interest', { exact: true }).selectOption('football');
  await page.keyboard.press('Escape');
  await expect(page.locator('.character-card')).toHaveCount(1);
  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByLabel('Interest', { exact: true }).selectOption('football');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('heading', { name: 'No characters fit these filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).last().click();
  await expect(page.locator('.character-card')).toHaveCount(cast.length);
  await page.getByText('Developer review scenarios', { exact: true }).click();
  await page.getByLabel('Discovery scenario').selectOption('offline');
  await expect(page.getByRole('status').filter({ hasText: 'Discovery unavailable' }).or(page.getByRole('alert'))).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Discovery scenario').selectOption('ready');
  await expect(page.locator('.character-card')).toHaveCount(cast.length);
});

test('selected gender survives visiting and refreshing a preview profile', async ({ page }) => {
  await signIn(page);
  for (const [label, gender] of [['Women', 'woman'], ['Men', 'man'], ['Everyone', 'all']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('.character-card')).toHaveCount(cast.filter(c => gender === 'all' || c.gender === gender).length);
    await page.locator('.character-card').first().getByRole('link', { name: /^Meet / }).click();
    await expect(page).toHaveURL(new RegExp(`/characters/[^?]+\\?gender=${gender}`));
    await page.reload();
    await page.getByRole('link', { name: 'Back to discovery', exact: true }).click();
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.character-card')).toHaveCount(cast.filter(c => gender === 'all' || c.gender === gender).length);
  }
});

test('gallery stays with its character, keyboard works, and starting resumes one conversation', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Meet Amara', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Amara, 28' })).toBeVisible();
  await page.getByRole('button', { name: /View photos/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Next photo' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Photo 2 of 2');
  await expect(dialog.locator('img')).toHaveAttribute('src', new RegExp(cast.find(c => c.id === 'char-amara')!.galleryAssetIds[0]));
  await expect.poll(() => dialog.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('status')).toHaveText('Photo 1 of 2');
  await expect(dialog.locator('img')).toHaveAttribute('src', /char-amara-portrait/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /View photos/ })).toBeFocused();
  await page.getByRole('button', { name: 'Shoot your shot' }).click();
  await expect(page).toHaveURL(/\/messages\/preview-char-amara$/);
  await expect(page.getByRole('heading', { name: 'Your conversation with Amara' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your conversation with Amara' })).toBeVisible();
  await page.getByRole('link', { name: 'View Amara’s profile' }).click();
  await page.getByRole('button', { name: 'Resume conversation' }).click();
  await expect(page).toHaveURL(/\/messages\/preview-char-amara$/);
  const rows = await page.evaluate(() => JSON.parse(sessionStorage.getItem('talkingstage:mock-conversations:v1') ?? '[]'));
  expect(rows).toHaveLength(1);
  await page.goto('/discover');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/characters/char-amara');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('missing, deactivated, paused and broken assets have useful recovery', async ({ page }) => {
  await signIn(page);
  await page.goto('/characters/no-such-character');
  await expect(page.getByRole('heading', { name: 'Profile not found' })).toBeVisible();
  await page.goto('/characters/char-amara');
  await expect(page.getByRole('heading', { name: 'Amara, 28' })).toBeVisible();
  await page.getByText('Developer review scenarios', { exact: true }).click();
  await page.getByLabel('Discovery scenario').selectOption('deactivated');
  await expect(page.getByRole('heading', { name: 'Character unavailable' })).toBeVisible();
  await page.getByLabel('Discovery scenario').selectOption('paused');
  await expect(page.getByRole('button', { name: 'Shoot your shot' })).toBeDisabled();
  await page.getByLabel('Discovery scenario').selectOption('ready');
  await page.getByRole('button', { name: 'Toggle failed photo preview' }).click();
  await expect(page.getByText('Photo couldn’t be loaded.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle failed photo preview' }).click();
  await expect(page.locator('.profile-gallery__main img')).toBeVisible();
});

test('discovery and profiles fit all review widths and capture screens', async ({ page }) => {
  await signIn(page);
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/discover', '/characters/char-amara']) {
      await page.goto(route);
      await expect(page.locator(route === '/discover' ? '.character-card' : '.profile-title').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if ([390, 1440].includes(width)) {
        // Full-page evidence must load pictures outside the visible viewport too.
        await page.locator('img').evaluateAll(async (images) => {
          await Promise.all(images.map(async (node) => {
            const image = node as HTMLImageElement;
            image.loading = 'eager';
            await image.decode();
            if (!image.naturalWidth) throw new Error(`Character image failed: ${image.src}`);
          }));
        });
        await page.screenshot({ path: `docs/reviews/stage-3/${route === '/discover' ? 'discover' : 'profile'}-${width}.png`, fullPage: true });
      }
    }
  }
});
