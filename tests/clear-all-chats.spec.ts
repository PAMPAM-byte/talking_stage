import { test, expect } from '@playwright/test';

test('clear all chats confirms removal of active and archived preview chats', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  for (const key of ['char-amara', 'char-chidi']) {
    await page.goto(`/characters/${key}`);
    await page.getByRole('button', { name: 'Shoot your shot' }).click();
    await expect(page.getByRole('textbox', { name: /^Message / })).toBeVisible();
  }
  await page.goto('/messages');
  await expect(page.locator('.conversation-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Manage conversation with Chidi' }).click();
  await page.getByRole('button', { name: 'Archive conversation', exact: true }).click();
  await expect(page.locator('.conversation-row')).toHaveCount(1);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: 'Clear all chats', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Clear all chats?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/every active and archived chat/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole('button', { name: 'Keep chats' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.conversation-row')).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Clear all chats', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear all chats', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your first conversation starts here' })).toBeVisible();
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No archived conversations' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.conversation-row')).toHaveCount(0);
});
