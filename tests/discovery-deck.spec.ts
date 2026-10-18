import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page.locator('.discovery-deck__card')).toHaveCount(1);
}

test('the full cast is one continuous deck beyond the old twelve-card boundary', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);
  await page.getByRole('button', { name: 'Everyone', exact: true }).click();
  const discoveryUrl = page.url();
  await expect(page.locator('.discovery-deck')).toHaveAttribute('data-selection-size', '50');
  await expect(page.getByRole('link', { name: /Next page|Previous page|Keep discovering/ })).toHaveCount(0);
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    seen.add(await page.locator('.discovery-deck__card').getByRole('heading').innerText());
    await expect(page.locator('.discovery-deck__meta')).toContainText(`${i + 1} of 50`);
    await page.getByRole('button', { name: /^Pass / }).click();
  }
  expect(seen.size).toBe(50);
  await expect(page.getByRole('heading', { name: 'You’re all caught up' })).toBeVisible();
  await expect(page).toHaveURL(discoveryUrl);
  await page.getByRole('button', { name: 'Undo last pass', exact: true }).click();
  await expect(page.locator('.discovery-deck__meta')).toContainText('50 of 50');
});

test('one profile, pass, undo, refresh continuity, meet and end-of-deck recovery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const card = page.locator('.discovery-deck__card');
  const original = await card.getByRole('heading').innerText();
  await page.getByRole('button', { name: /^Pass / }).click();
  await expect(card.getByRole('heading')).not.toHaveText(original);
  const next = await card.getByRole('heading').innerText();
  await page.reload();
  await expect(card.getByRole('heading')).toHaveText(next);
  await page.getByRole('button', { name: /^Meet / }).click();
  await expect(page).toHaveURL(/\/messages\/preview-/);
  const conversationUrl = page.url();
  await page.goto('/discover');
  await expect(card.getByRole('heading')).toHaveText(next);
  await page.getByRole('button', { name: /^Meet / }).click();
  await expect(page).toHaveURL(conversationUrl);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('talkingstage:mock-conversations:v1') ?? '[]').length)).toBe(1);
  await page.goto('/discover');
  await page.getByRole('button', { name: 'Undo last pass', exact: true }).click();
  await expect(card.getByRole('heading')).toHaveText(original);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let i = 0; i < 50 && await card.count(); i++) await page.getByRole('button', { name: /^Pass / }).click();
  await expect(page.getByRole('heading', { name: 'You’re all caught up' })).toBeVisible();
  await page.getByRole('button', { name: 'Browse again' }).click();
  await expect(card.getByRole('heading')).toHaveText(original);
});

test('Meet preserves the card when chat is paused and can retry when available', async ({ page }) => {
  await signIn(page);
  await page.getByText('Developer review scenarios', { exact: true }).click();
  await page.getByLabel('Discovery scenario').selectOption('paused');
  await page.getByRole('button', { name: /^Meet / }).click();
  await expect(page.locator('.discovery-deck').getByRole('alert')).toContainText('Conversation couldn’t open');
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.locator('.discovery-deck__card')).toHaveCount(1);
  await page.getByLabel('Discovery scenario').selectOption('ready');
  await page.getByRole('button', { name: /^Meet / }).click();
  await expect(page).toHaveURL(/\/messages\/preview-/);
});

test('drag threshold, cancel, horizontal swipe, keyboard and right swipe', async ({ page }) => {
  await signIn(page);
  const card = page.locator('.discovery-deck__card');
  const original = await card.getByRole('heading').innerText();
  const box = (await card.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 3;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 25, y); await page.mouse.up();
  await expect(card.getByRole('heading')).toHaveText(original);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 140, y, { steps: 8 });
  await expect(page.locator('.discovery-deck__verdict')).toHaveText('Pass');
  await card.dispatchEvent('pointercancel'); await page.mouse.up();
  await expect(card.getByRole('heading')).toHaveText(original);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 140, y, { steps: 8 }); await page.mouse.up();
  await expect(card.getByRole('heading')).not.toHaveText(original);
  await page.getByRole('button', { name: 'Undo last pass' }).click();
  await card.focus(); await page.keyboard.press('ArrowLeft');
  await expect(card.getByRole('heading')).not.toHaveText(original);
  await expect.poll(() => card.evaluate(node => getComputedStyle(node).transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');
  const current = (await card.boundingBox())!;
  const rightX = current.x + current.width / 2, rightY = current.y + current.height / 3;
  await page.mouse.move(rightX, rightY); await page.mouse.down(); await page.mouse.move(rightX + 150, rightY, { steps: 8 });
  await expect(page.locator('.discovery-deck__verdict')).toHaveText('Meet');
  await page.mouse.up();
  await expect(page).toHaveURL(/\/messages\/preview-/);
});

test('single-card layout fits mobile and desktop and actions avoid navigation', async ({ page }) => {
  await signIn(page);
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.discovery-deck__card')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: /^Meet / }).scrollIntoViewIfNeeded();
    const actions = (await page.locator('.discovery-deck__actions').boundingBox())!;
    const nav = (await page.getByRole('navigation', { name: 'Main navigation' }).boundingBox())!;
    if (width < 900) expect(actions.y + actions.height, `Actions clear navigation at ${width}px`).toBeLessThanOrEqual(nav.y);
    if ([390, 1440].includes(width)) {
      await page.locator('.discovery-deck__photo img').evaluate(image => (image as HTMLImageElement).decode());
      await page.screenshot({ path: `test-results/continuous-discovery-${width}.png`, fullPage: true });
    }
  }
});

test('touch swipe passes while vertical touch scrolling preserves the character', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await signIn(page);
    const card = page.locator('.discovery-deck__card');
    const original = await card.getByRole('heading').innerText();
    const session = await context.newCDPSession(page);
    async function gesture(dx: number, dy: number) {
      const box = (await card.boundingBox())!;
      const x = box.x + box.width / 2, y = box.y + box.height / 3;
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 8, y: y + dy * step / 8 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await gesture(0, 120);
    await expect(card.getByRole('heading')).toHaveText(original);
    await gesture(-140, 0);
    await expect(card.getByRole('heading')).not.toHaveText(original);
    await expect(page.locator('.discovery-deck__card')).toHaveCount(1);
  } finally { await context.close(); }
});
