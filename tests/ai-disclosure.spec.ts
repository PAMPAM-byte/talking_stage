import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
}
async function openChat(page: Page) {
  await page.goto('/characters/char-amara');
  await page.getByRole('button', { name: 'Shoot your shot' }).click();
  await expect(page.getByRole('heading', { name: 'Your conversation with Amara' })).toBeVisible();
}
const start = 'You’re chatting with Amara, a fictional AI character.';

for (const width of [320, 1440]) {
  test(`AI character label and photo viewer disclosure at ${width}px, no opening line`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await signIn(page); await openChat(page);
    const label = page.locator('.chat-shell__header').getByText('AI character', { exact: true });
    await expect(label).toBeVisible();
    // The founder removed the opening "You're chatting with" line on 30 Oct.
    await expect(page.getByText(start, { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole('textbox', { name: 'Message Amara' }).fill('Show me a character photo.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.getByRole('button', { name: 'View Amara’s character photo' }).click();
    const viewer = page.getByRole('dialog', { name: 'Amara’s character photo' });
    await expect(viewer).toHaveAccessibleDescription('AI-generated photo of a fictional adult character.');
    await expect(viewer.getByText('AI-generated photo of a fictional adult character.')).toBeVisible();
    await page.keyboard.press('Escape');

  });
}

test('AI reminder appears after three hours of visible use', async ({ page }) => {
  await page.clock.install();
  await signIn(page); await openChat(page);
  const reminder = page.getByText('Reminder: you’re chatting with Amara, a fictional AI character.', { exact: true });
  await page.clock.runFor('02:58:00');
  await expect(reminder).toHaveCount(0);
  await page.clock.runFor('00:03:00');
  await expect(reminder).toBeVisible();
  await expect(page.getByRole('log').getByText('Reminder:', { exact: false })).toHaveCount(0);
});
