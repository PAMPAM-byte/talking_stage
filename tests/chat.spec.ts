import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
}
async function openChat(page: Page, name = 'Amara') {
  await page.goto(`/characters/char-${name.toLowerCase()}`);
  await page.getByRole('button', { name: 'Shoot your shot' }).click();
  await expect(page.getByRole('heading', { name: `Your conversation with ${name}` })).toBeVisible();
  await expect(page.getByRole('textbox', { name: `Message ${name}` })).toBeVisible();
}
async function scenario(page: Page, value: string) {
  const details = page.locator('.chat-review-controls').filter({ hasText: 'Chat review controls' });
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await page.getByLabel('Chat scenario').selectOption(value);
}
async function send(page: Page, text: string, name = 'Amara') {
  await page.getByRole('textbox', { name: `Message ${name}` }).fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();
}

test('scripted replies, multiline composer, owned photos, viewer, and safe refresh', async ({ page }) => {
  await signIn(page); await openChat(page);
  await expect(page.getByText('You have my attention.', { exact: false })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Message Amara' });
  await input.fill('Custom private wording'); await input.press('Shift+Enter');
  await expect(input).toHaveValue('Custom private wording\n');
  await input.press('Enter');
  await expect(page.locator('.message-turn--user')).toHaveCount(1);
  await expect(page.getByText('Saved in preview', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message' })).not.toHaveAttribute('aria-busy', 'true');
  const stored = await page.evaluate(() => Object.values(sessionStorage).join(' '));
  expect(stored).not.toContain('Custom private wording');
  await send(page, 'Show me a character photo.');
  await expect(page.getByRole('button', { name: 'View Amara’s character photo' })).toBeVisible();
  await expect(page.locator('.chat-photo img')).toHaveAttribute('src', /char-amara-gallery/);
  await page.getByRole('button', { name: 'View Amara’s character photo' }).click();
  await expect(page.getByRole('dialog', { name: 'Amara’s character photo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'View Amara’s character photo' })).toBeFocused();
  await page.reload();
  await expect(page.getByText('Preview message (text not stored).', { exact: true })).toBeVisible();
  await expect(page.locator('.chat-photo figcaption strong')).toHaveText('AI-generated character photo');
  await expect(page.locator('.message-turn--user')).toHaveCount(2);
});

test('failed delivery and failed reply retry without duplicating the user message', async ({ page }) => {
  await signIn(page); await openChat(page); await scenario(page, 'offline');
  await send(page, 'That sounds like a good day. Tell me more.');
  await expect(page.getByText('Not saved', { exact: true })).toBeVisible();
  await expect(page.locator('.message-turn--user')).toHaveCount(1);
  await scenario(page, 'reply_failed');
  await page.getByRole('button', { name: 'Retry delivery' }).click();
  await expect(page.getByRole('button', { name: 'Retry reply' })).toBeVisible();
  await expect(page.locator('.message-turn--user')).toHaveCount(1);
  await scenario(page, 'ready');
  await page.getByRole('button', { name: 'Retry reply' }).click();
  await expect(page.locator('.message-turn--character')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Retry reply' })).toHaveCount(0);
  await expect(page.locator('.message-turn--user')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.message-turn--user')).toHaveCount(1);
  await expect(page.locator('.message-turn--character')).toHaveCount(2);
});

test('limits preserve drafts, interrupted reply recovers, and photos pause independently', async ({ page }) => {
  await signIn(page); await openChat(page); await scenario(page, 'rate_limit');
  await send(page, 'A draft to keep');
  await expect(page.locator('.chat-composer [role="alert"]')).toContainText('wait a moment');
  await expect(page.getByRole('textbox', { name: 'Message Amara' })).toHaveValue('A draft to keep');
  await expect(page.locator('.message-turn--user')).toHaveCount(0);
  await scenario(page, 'usage_limit'); await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.chat-composer [role="alert"]')).toContainText('allowance');
  await scenario(page, 'chat_paused');
  await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeDisabled();
  await scenario(page, 'interrupted'); await send(page, 'What have you been enjoying lately?');
  await expect(page.getByText('Reply interrupted.', { exact: false })).toBeVisible();
  await page.reload(); await scenario(page, 'ready');
  await page.getByRole('button', { name: 'Retry reply' }).click();
  await expect(page.locator('.message-turn--character')).toHaveCount(2);
  await scenario(page, 'photos_paused'); await send(page, 'Show me a character photo.');
  await expect(page.getByLabel('Conversation messages').getByText('Character photos are paused for now. We can keep talking.', { exact: true })).toBeVisible();
  await expect(page.locator('.chat-photo')).toHaveCount(0);
});

test('archive, restore, delete, and list failures keep management clear', async ({ page }) => {
  await signIn(page); await page.goto('/messages');
  await expect(page.getByRole('heading', { name: 'Your first conversation starts here' })).toBeVisible();
  await openChat(page); await send(page, 'What have you been enjoying lately?');
  await expect(page.getByRole('button', { name: 'Send message' })).not.toHaveAttribute('aria-busy', 'true');
  await page.getByRole('button', { name: 'Conversation options' }).click();
  await page.getByRole('button', { name: 'Archive conversation', exact: true }).last().click();
  await expect(page).toHaveURL(/\/messages$/);
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await expect(page.locator('.conversation-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Manage conversation with Amara' }).click();
  await page.getByRole('button', { name: 'Restore conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await page.getByRole('button', { name: 'Manage conversation with Amara' }).click();
  await page.getByRole('button', { name: 'Delete conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Keep conversation' }).click();
  await expect(page.locator('.conversation-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Manage conversation with Amara' }).click();
  await page.getByRole('button', { name: 'Delete conversation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete conversation', exact: true }).click();
  await expect(page.locator('.conversation-row')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.conversation-row')).toHaveCount(0);
  await page.getByText('Messages review controls', { exact: true }).click();
  await page.getByLabel('Messages scenario').selectOption('error');
  await expect(page.locator('.message-list [role="alert"]')).toContainText('Messages couldn’t be loaded');
  await page.getByLabel('Messages scenario').selectOption('ready');
  await expect(page.getByRole('heading', { name: 'Your first conversation starts here' })).toBeVisible();
});

test('unread comes from a background reply and clears when opened; broken photo can reload', async ({ page }) => {
  await signIn(page); await openChat(page); await send(page, 'Show me a character photo.');
  await expect(page.getByText('Saved in preview', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /^Back to .+’s profile$/ }).click();
  await expect(page).toHaveURL(/\/characters\/char-/);
  await page.goto('/messages');
  await expect(page.locator('.shell--user .message-list').getByText('1 unread', { exact: true })).toBeVisible();
  await page.locator('.shell--user .conversation-row__link').click();
  await expect(page.getByRole('button', { name: 'View Amara’s character photo' })).toBeVisible();
  await scenario(page, 'ready'); await page.getByRole('button', { name: 'Toggle broken photo' }).click();
  await expect(page.getByRole('button', { name: 'Reload photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle broken photo' }).click();
  await page.getByRole('button', { name: 'Reload photo' }).click();
  await expect(page.locator('.chat-photo img')).toBeVisible();
  await page.getByRole('link', { name: /^Back to .+’s profile$/ }).click();
  await expect(page).toHaveURL(/\/characters\/char-/);
  await page.goto('/messages');
  await expect(page.locator('.shell--user .message-list').getByText('1 unread', { exact: true })).toHaveCount(0);
});

test('chat fits all review widths, long messages, compact height and screenshots', async ({ page }) => {
  await signIn(page); await openChat(page, 'Chidi');
  await send(page, 'Show me a character photo.', 'Chidi');
  await expect(page.locator('.chat-photo img')).toBeVisible();
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('textbox', { name: 'Message Chidi' }).fill('A long line '.repeat(50));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Send message' })).toBeInViewport();
    if ([390, 1440].includes(width)) {
      await page.getByRole('textbox', { name: 'Message Chidi' }).fill('What story would you recommend?');
      await page.locator('.chat-shell__messages').evaluate(main => { main.scrollTop = main.scrollHeight; });
      await page.screenshot({ path: `docs/reviews/stage-4/chat-${width}.png` });
    }
  }
  await page.setViewportSize({ width: 390, height: 460 });
  await expect(page.getByRole('button', { name: 'Send message' })).toBeInViewport();
  await page.getByRole('link', { name: /^Back to .+’s profile$/ }).click();
  await expect(page).toHaveURL(/\/characters\/char-/);
  await page.goto('/messages');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.shell--user .conversation-row')).toHaveCount(1);
  await page.screenshot({ path: 'docs/reviews/stage-4/messages-390.png', fullPage: true });
});
