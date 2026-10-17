import { test, expect } from '@playwright/test';
test('personalities preview fits all widths and discloses fictional AI identity', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/personalities');
  await expect(page.locator('.personalities-cards article')).toHaveCount(12);
  await expect(page.getByRole('status')).toHaveText('Showing 12 of 50 personalities');
  await expect(page.locator('.personalities-disclosure')).toContainText('AI-generated photos');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) {
      await page.locator('main img').evaluateAll(async elements => { await Promise.all(elements.map(async element => { const image = element as HTMLImageElement; image.loading = 'eager'; await image.decode(); })); });
      await page.locator('#introductions').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `docs/reviews/cast-50/catalogue-${width}.png` });
    }
  }
});

test('all 50 profiles load progressively and search, gender and empty states work', async ({ page }) => {
  await page.goto('/personalities');
  for (const count of [24, 36, 48, 50]) {
    await page.getByRole('button', { name: 'Show more personalities' }).click();
    await expect(page.locator('.personalities-cards article')).toHaveCount(count);
  }
  await expect(page.getByRole('button', { name: 'Show more personalities' })).toHaveCount(0);
  await page.locator('.personalities-cards img').evaluateAll(async nodes => {
    await Promise.all(nodes.map(async node => { const image = node as HTMLImageElement; image.loading = 'eager'; await image.decode(); }));
  });
  await page.getByLabel('Find a personality').fill('Bisola');
  await expect(page.locator('.personalities-cards article')).toHaveCount(1);
  await expect(page.locator('.personalities-cards h3')).toContainText('Bisola');
  await page.getByRole('combobox', { name: 'Show', exact: true }).selectOption('man');
  await expect(page.getByRole('heading', { name: 'No personalities found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('status')).toHaveText('Showing 12 of 50 personalities');
  await page.getByRole('combobox', { name: 'Show', exact: true }).selectOption('woman');
  await expect(page.getByRole('status')).toHaveText('Showing 12 of 26 personalities');
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
