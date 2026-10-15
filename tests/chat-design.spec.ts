import { test, expect } from '@playwright/test';
test('chat keeps sending and composer visibility across screen sizes', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await page.goto('/characters/char-amara');
  await page.getByRole('button', { name: 'Shoot your shot' }).click();
  const input = page.getByRole('textbox', { name: 'Message Amara' });
  await input.fill('Hello, tell me about your favourite music.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.message-turn--user')).toHaveCount(1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await input.fill('A little curiosity.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Send message' })).toBeInViewport();
    if ([390, 1440].includes(width)) await page.screenshot({ path: `docs/reviews/chat-refresh-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 460 });
  await expect(page.getByRole('button', { name: 'Send message' })).toBeInViewport();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await page.goto('/messages');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(1);
  await page.locator('.shell--user .conversation-row__link').first().click();
  await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
});
