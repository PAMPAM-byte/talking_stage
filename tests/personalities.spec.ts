import { test, expect } from '@playwright/test';
test('personalities preview fits all widths and discloses fictional AI identity', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/personalities');
  await expect(page.locator('.personalities-cards article')).toHaveCount(4);
  await expect(page.locator('.personalities-disclosure')).toContainText('AI-generated photos');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) {
      await page.locator('main img').evaluateAll(async elements => { await Promise.all(elements.map(async element => { const image = element as HTMLImageElement; image.loading = 'eager'; await image.decode(); })); });
      await page.screenshot({ path: `docs/reviews/personalities-${width}.png`, fullPage: true });
    }
  }
});
test('landing entry, keyboard biographies and adult entry work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore the personalities' }).click();
  await expect(page).toHaveURL(/\/personalities$/);
  const details = page.locator('.personalities-cards details').first();
  await details.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(details).toContainText('Fictional setting');
  await page.getByRole('link', { name: 'Find your conversation', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/age$/);
});
