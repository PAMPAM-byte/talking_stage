import { test, expect } from '@playwright/test';

test('a background reply appears without navigation and preserves the draft', async ({ page, context }) => {
    let reads = 0;
    let revision = 'preview-0';
    let navigations = 0;
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++; });
    await page.route('**/api/conversations/**/sync', route => { reads++; return route.fulfill({ json: { revision } }); });
    await page.goto('/dev/chat-delivery?scenario=sync');
    const input = page.getByRole('textbox', { name: 'Message Amara' });
    await input.fill('Keep my unfinished thought.');
    await expect.poll(() => reads).toBeGreaterThan(0);
    await context.addCookies([{ name: 'chat-sync-test-snapshot', value: '1', url: 'http://localhost:3103' }]);
    revision = 'preview-1';
    await expect(page.getByText('A reply delivered automatically.', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(input).toHaveValue('Keep my unfinished thought.');
    expect(navigations).toBe(1);
});

test('a temporary sync outage reconnects on focus and catches up', async ({ page, context }) => {
    let failing = true;
    await page.route('**/api/conversations/**/sync', route => failing
        ? route.fulfill({ status: 503, json: {} })
        : route.fulfill({ json: { revision: 'preview-1' } }));
    await page.goto('/dev/chat-delivery?scenario=sync');
    await expect(page.getByText('Connection interrupted. Reconnecting automatically…')).toBeVisible();
    await context.addCookies([{ name: 'chat-sync-test-snapshot', value: '1', url: 'http://localhost:3103' }]);
    failing = false;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByText('A reply delivered automatically.', { exact: true })).toBeVisible();
    await expect(page.getByText('Connection interrupted. Reconnecting automatically…')).toHaveCount(0);
});

test('transient reply status failures do not stop observing or generate duplicates', async ({ page }) => {
    let reads = 0;
    let posts = 0;
    await page.route('**/api/conversations/**/replies/**', route => {
        if (route.request().method() === 'POST') posts++;
        reads++;
        return reads < 3 ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { state: 'completed' } });
    });
    await page.goto('/dev/chat-delivery?scenario=generating');
    await expect(page.locator('.typing-bubble')).toBeVisible();
    await expect.poll(() => reads, { timeout: 15000 }).toBeGreaterThanOrEqual(3);
    await expect(page.locator('.typing-bubble')).toHaveCount(0);
    expect(posts).toBe(0);
});

test('an expired session takes the user to sign-in automatically', async ({ page }) => {
    await page.route('**/api/conversations/**/sync', route => route.fulfill({ status: 401, json: {} }));
    await page.goto('/dev/chat-delivery?scenario=sync');
    await expect(page).toHaveURL(/\/sign-in$/);
});

test('hidden tabs pause sync and focus events never overlap requests', async ({ page }) => {
    await page.clock.install();
    let reads = 0;
    let release: (() => void) | undefined;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/conversations/**/sync', async route => {
        reads++;
        await held;
        await route.fulfill({ json: { revision: 'preview-0' } });
    });
    await page.goto('/dev/chat-delivery?scenario=sync');
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: true }));
    await page.clock.fastForward(20000);
    expect(reads).toBe(0);
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => reads).toBe(1);
    await page.evaluate(() => { for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('focus')); });
    expect(reads).toBe(1);
    release!();
    await page.goto('/dev/chat-delivery?scenario=disabled');
    await page.clock.fastForward(60000);
    expect(reads).toBe(1);
});
