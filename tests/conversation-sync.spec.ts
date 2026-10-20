import { test, expect } from '@playwright/test';

test('a slow conversation refresh finishes without being replaced by later polls', async ({ page, context }) => {
    await page.clock.install();
    let reads = 0;
    let refreshes = 0;
    let release: (() => void) | undefined;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/dev/chat-delivery?**', async route => {
        if (route.request().headers()['rsc'] === '1') { refreshes++; await held; }
        await route.continue();
    });
    await page.route('**/api/conversations/**/sync', route => {
        reads++;
        return route.fulfill({ json: { revision: 'preview-1' } });
    });
    await page.goto('/dev/chat-delivery?scenario=sync');
    const input = page.getByRole('textbox', { name: 'Message Amara' });
    await input.fill('Keep this while the render finishes.');
    await context.addCookies([{ name: 'chat-sync-test-snapshot', value: '1', url: 'http://localhost:3103' }]);
    await page.clock.fastForward(1100);
    await expect.poll(() => refreshes).toBe(1);
    for (let i = 0; i < 2; i++) {
        const before = reads;
        await page.clock.fastForward(6000);
        await expect.poll(() => reads).toBeGreaterThan(before);
    }
    expect(refreshes).toBe(1);
    release!();
    await expect(page.getByText('A reply delivered automatically.', { exact: true })).toBeVisible();
    await expect(input).toHaveValue('Keep this while the render finishes.');
});

test('an unchanged refresh does not acknowledge a reply that has not rendered', async ({ page, context }) => {
    let revision = 'preview-0';
    let refreshes = 0;
    let posts = 0;
    page.on('request', request => {
        if (request.method() === 'POST') posts++;
        if (request.url().includes('/dev/chat-delivery') && request.headers()['rsc'] === '1') refreshes++;
    });
    await page.route('**/api/conversations/**/sync', route => route.fulfill({ json: { revision } }));
    await page.goto('/dev/chat-delivery?scenario=sync');
    const input = page.getByRole('textbox', { name: 'Message Amara' });
    await input.fill('Preserve this draft while catching up.');
    // Metadata announces a new revision, but the first render still has the old
    // snapshot. This models a stale or interrupted server refresh independently
    // of provider generation. The next poll must try to display it again.
    const staleRefresh = page.waitForResponse(response =>
        response.url().includes('/dev/chat-delivery') && response.request().headers()['rsc'] === '1');
    revision = 'preview-1';
    await (await staleRefresh).finished();
    await expect(page.getByText('A reply delivered automatically.', { exact: true })).toHaveCount(0);
    await context.addCookies([{ name: 'chat-sync-test-snapshot', value: '1', url: 'http://localhost:3103' }]);
    await expect(page.getByText('A reply delivered automatically.', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(input).toHaveValue('Preserve this draft while catching up.');
    expect(refreshes).toBeGreaterThanOrEqual(2);
    expect(posts).toBe(0);
});

test('repeated stale renders back off while keeping the open draft and checking for updates', async ({ page }) => {
    await page.clock.install();
    let reads = 0;
    let refreshes = 0;
    let posts = 0;
    page.on('request', request => {
        if (request.method() === 'POST') posts++;
        if (request.url().includes('/dev/chat-delivery') && request.headers()['rsc'] === '1') refreshes++;
    });
    // Metadata is newer, but every server render still returns preview-0.
    await page.route('**/api/conversations/**/sync', route => {
        reads++;
        return route.fulfill({ json: { revision: 'preview-1' } });
    });
    await page.goto('/dev/chat-delivery?scenario=sync');
    const input = page.getByRole('textbox', { name: 'Message Amara' });
    await input.fill('Keep this while the server catches up.');
    await page.clock.fastForward(1100);
    await expect.poll(() => refreshes).toBe(1);
    for (let i = 0; i < 6; i++) {
        const before = reads;
        await page.clock.fastForward(6000);
        await expect.poll(() => reads).toBeGreaterThan(before);
        // Allow a started RSC request to finish before advancing the next poll.
        await expect(input).toHaveValue('Keep this while the server catches up.');
    }
    expect(refreshes).toBeGreaterThan(1);
    expect(refreshes).toBeLessThanOrEqual(4);
    expect(reads).toBeGreaterThan(refreshes);
    expect(posts).toBe(0);
});

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
    let reads = 0;
    await page.route('**/api/conversations/**/sync', route => {
        reads++;
        return failing ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { revision: 'preview-1' } });
    });
    await page.goto('/dev/chat-delivery?scenario=sync');
    await expect.poll(() => reads).toBeGreaterThan(0);
    await expect(page.locator('.chat-delivery-notice')).toHaveCount(0);
    await context.addCookies([{ name: 'chat-sync-test-snapshot', value: '1', url: 'http://localhost:3103' }]);
    failing = false;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByText('A reply delivered automatically.', { exact: true })).toBeVisible();
    await expect(page.getByText('Connection interrupted. Reconnecting automatically…')).toHaveCount(0);
});

test('background server and network failures recover silently without user action', async ({ page, context }) => {
    let reads = 0;
    let posts = 0;
    page.on('request', request => { if (request.method() === 'POST') posts++; });
    await page.route('**/api/conversations/**/sync', route => {
        reads++;
        if (reads === 1) return route.fulfill({ status: 503, json: {} });
        if (reads === 2) return route.abort('failed');
        return route.fulfill({ json: { revision: 'preview-1' } });
    });
    await page.goto('/dev/chat-delivery?scenario=sync');
    const input = page.getByRole('textbox', { name: 'Message Amara' });
    await input.fill('This draft stays while sync recovers.');
    await expect.poll(() => reads).toBeGreaterThan(0);
    await expect(page.locator('.chat-delivery-notice')).toHaveCount(0);
    await context.addCookies([{ name: 'chat-sync-test-snapshot', value: '1', url: 'http://localhost:3103' }]);
    await expect(page.getByText('A reply delivered automatically.', { exact: true })).toBeVisible({ timeout: 20000 });
    expect(reads).toBeGreaterThanOrEqual(3);
    await expect(input).toHaveValue('This draft stays while sync recovers.');
    await expect(page.locator('.chat-delivery-notice')).toHaveCount(0);
    expect(posts).toBe(0);
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
