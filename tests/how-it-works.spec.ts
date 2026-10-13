import { test, expect } from '@playwright/test';
test('how it works explains the journey and fits all screen sizes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/how-it-works');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('.how-step')).toHaveCount(3);
  await expect(page.locator('#step-discover')).toContainText('Meet opens chat directly');
  await expect(page.locator('.how-preference-preview')).toContainText('Illustrative onboarding preview');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) {
      await page.locator('.how-character-photo img').evaluate(async element => { const image = element as HTMLImageElement; image.loading = 'eager'; await image.decode(); });
      await page.screenshot({ path: `docs/reviews/how-it-works-${width}.png`, fullPage: true });
    }
  }
});
test('landing entry, section navigation, keyboard FAQ and onboarding work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: 'Read the full guide' }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await page.getByRole('navigation', { name: 'Your journey' }).getByRole('link', { name: '02 Find your spark' }).click();
  await expect(page.locator('#step-discover')).toBeFocused();
  const faq = page.locator('.how-faq details').first();
  await faq.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(faq).toHaveAttribute('open', '');
  await expect(faq.locator('p')).toContainText('no mutual human matching');
  await page.getByRole('link', { name: 'Start with hello', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/age$/);
});
