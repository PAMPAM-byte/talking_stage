import { expect, test } from '@playwright/test';

test('an account outage during refresh retains the open chat and draft, then catches up', async ({ page, context }) => {
    let revision = 'preview-0';
    let reads = 0;
    let posts = 0;
    page.on('request', request => { if (request.method() === 'POST') posts++; });
    await page.route('**/api/conversations/**/sync', route => {
        reads++;
        return route.fulfill({ json: { revision } });
    });
    await page.goto('/dev/chat-delivery?scenario=auth-recovery');
    const input = page.getByRole('textbox', { name: 'Message Amara' });
    await input.fill('Keep this unfinished message.');
    await expect.poll(() => reads).toBeGreaterThan(0);
    await context.addCookies([{ name: 'chat-auth-test-unavailable', value: '1', url: 'http://localhost:3103' }]);
    revision = 'preview-1';
    await expect(page.locator('[data-test-account="unavailable"]')).toHaveCount(1);
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('Keep this unfinished message.');
    await expect(page.getByText(/confirmed a payment|could not check your account/i)).toHaveCount(0);
    await expect(page.locator('.chat-load-recovery')).toHaveCount(0);
    await context.addCookies([
        { name: 'chat-auth-test-unavailable', value: '0', url: 'http://localhost:3103' },
        { name: 'chat-sync-test-snapshot', value: '1', url: 'http://localhost:3103' },
    ]);
    await expect(page.getByText('A reply delivered automatically.', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(input).toHaveValue('Keep this unfinished message.');
    expect(posts).toBe(0);
});

test('initial account failure shows no private chat and automatically recovers after access is checked', async ({ page, context }) => {
    await context.addCookies([{ name: 'chat-auth-test-unavailable', value: '1', url: 'http://localhost:3103' }]);
    await page.route('**/api/conversations/**/sync', route => route.fulfill({ json: { revision: 'preview-0' } }));
    await page.goto('/dev/chat-delivery?scenario=auth-recovery');
    await expect(page.getByRole('heading', { name: 'This conversation could not load.' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Message Amara' })).toHaveCount(0);
    await expect(page.getByText(/confirmed a payment/i)).toHaveCount(0);
    await context.addCookies([{ name: 'chat-auth-test-unavailable', value: '0', url: 'http://localhost:3103' }]);
    await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.chat-load-recovery')).toHaveCount(0);
});
