import { expect, test } from '@playwright/test';

test('chat fills the viewport after sending, scrolling and resizing', async ({ page }) => {
  await page.goto('/dev/chat-delivery?scenario=disabled');
  const input = page.getByRole('textbox', { name: 'Message Amara' });
  await input.fill('A message that fills the conversation.\n'.repeat(40));
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Saved', { exact: true })).toBeVisible();

  for (const size of [{ width: 1858, height: 980 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 390, height: 460 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await expect.poll(() => page.locator('.chat-shell__composer').evaluate(element => Math.round(element.getBoundingClientRect().bottom))).toBe(size.height);
    await page.evaluate(() => {
      window.scrollTo(0, 10000);
      const messages = document.querySelector('.chat-shell__messages')!;
      messages.scrollTop = messages.scrollHeight;
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.chat-shell__header')).toBeInViewport();
    await expect(input).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Send message' })).toBeInViewport();
  }
  await page.screenshot({ path: 'test-results/chat-viewport-1440.png' });
});

test('chat follows the visible viewport when a mobile keyboard reduces its height', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/chat-delivery?scenario=disabled');
  const input = page.getByRole('textbox', { name: 'Message Amara' });
  await input.fill('A draft that survives opening and closing the keyboard.');
  await input.focus();
  for (const height of [420, 844]) {
    await page.evaluate(value => {
      Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value });
      window.visualViewport!.dispatchEvent(new Event('resize'));
    }, height);
    await expect.poll(() => page.locator('.chat-shell__composer').evaluate(element => Math.round(element.getBoundingClientRect().bottom))).toBe(height);
    await expect(input).toHaveValue('A draft that survives opening and closing the keyboard.');
    await expect(page.locator('.chat-shell__header')).toBeInViewport();
  }
});
