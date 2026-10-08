import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click();
  await expect(page).toHaveURL(/\/discover$/);
}
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function labelledControls(page: Page) {
  const missing = await page.locator('input:not([type="hidden"]), select, textarea, button').evaluateAll(elements => elements.filter(element => {
    const control = element as HTMLInputElement;
    if (!control.checkVisibility() || control.closest('nextjs-portal')) return false;
    const references = control.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(' ');
    return !(control.getAttribute('aria-label') || references || control.labels?.length || (control.tagName === 'BUTTON' && control.textContent?.trim()));
  }).map(element => element.outerHTML));
  expect(missing).toEqual([]);
  await expect(page.locator('main:visible')).toHaveCount(1);
}

test('landing through chat, gift failure, history and admin reconciliation is one coherent journey', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page).toHaveURL(/#main-content$/);
  await signIn(page); await labelledControls(page);
  await page.goto('/characters/char-amara'); await page.getByRole('button', { name: 'Shoot your shot' }).click();
  await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeVisible();
  const log = page.getByRole('log', { name: 'Conversation messages' }); await expect(log).toHaveAttribute('aria-live', 'polite');
  await page.getByRole('textbox', { name: 'Message Amara' }).fill('That sounds like a good day. Tell me more.');
  await page.getByRole('button', { name: 'Send message' }).click(); await expect(log.getByText('Saved in preview', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Conversation options' }).click(); await page.getByRole('button', { name: 'Send a voluntary gift' }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Close choose an amount/ }).focus();
  // Native modal tab cycling can yield to browser chrome; background controls must stay inert.
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog[open]'))).toBe(true); }
  await page.getByLabel('Amount in NGN').fill('2500.50'); await page.getByRole('button', { name: 'Review amount' }).click();
  await expect(dialog).toContainText('TalkingStage’s operator');
  await dialog.locator('summary').click(); await dialog.getByLabel('Save scenario').selectOption('offline');
  await page.getByRole('button', { name: 'Confirm ₦2,500.50', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('Gift not created');
  await page.screenshot({ path: 'docs/reviews/stage-7/gift-failure-390.png' });
  await dialog.getByLabel('Save scenario').selectOption('ready'); await page.getByRole('button', { name: 'Confirm ₦2,500.50', exact: true }).click();
  await expect(dialog).toContainText('Simulated checkout created'); await dialog.getByRole('link', { name: 'View payment details' }).click();
  await page.getByRole('button', { name: 'Simulate checkout' }).click(); await expect(page.getByText('Simulated · Pending verification', { exact: true })).toBeVisible();
  await page.goto('/settings/payments'); await expect(page.locator('.payment-history-row')).toHaveCount(1);
  await page.goto('/admin/access'); await page.getByRole('button', { name: 'Open selected preview' }).click();
  await page.goto('/admin/payments'); await page.getByLabel('Ledger status').selectOption('pending');
  await page.locator('.admin-record-list > a').filter({ hasText: 'SIM-' }).filter({ hasNotText: 'SIM-LEDGER' }).click();
  await page.getByRole('button', { name: 'Request reconciliation review' }).click();
  await expect(page.getByRole('dialog', { name: 'Request reconciliation review?' })).toBeVisible();
  await page.screenshot({ path: 'docs/reviews/stage-7/reconciliation-390.png' });
  await page.getByRole('button', { name: 'Confirm reconciliation request' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Request reconciliation review', exact: true })).toBeDisabled();
  await expect(page.getByText('Pending verification', { exact: true }).filter({ visible: true })).toBeVisible(); await fits(page);
});

test('landscape, enlarged layout, labels and focused composer remain usable', async ({ page }) => {
  test.setTimeout(120000);
  await signIn(page);
  await page.goto('/settings/preferences');
  const longName = 'N'.repeat(60); await page.getByLabel('Preferred name').fill(longName);
  await page.getByRole('button', { name: 'Save preferences' }).click(); await expect(page.getByText('Preferences saved', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Preferred name')).toHaveValue(longName);
  for (const route of ['/discover', '/characters/char-amara', '/settings', '/settings/preferences', '/settings/memories/char-amara', '/settings/account']) {
    await page.setViewportSize({ width: 844, height: 390 }); await page.goto(route); await expect(page.locator('h1:visible')).toHaveCount(1); await fits(page); await labelledControls(page);
  }
  // 1280 CSS px at 200% browser zoom yields an effective 640 px layout.
  await page.setViewportSize({ width: 640, height: 450 });
  await page.goto('/settings/preferences'); await fits(page); await labelledControls(page);
  await page.goto('/characters/char-amara'); await page.getByRole('button', { name: 'Shoot your shot' }).click();
  await page.setViewportSize({ width: 390, height: 360 }); const composer = page.getByRole('textbox', { name: 'Message Amara' }); await composer.focus();
  await expect(composer).toBeFocused(); await expect(composer).toBeInViewport(); await expect(page.getByRole('button', { name: 'Send message' })).toBeInViewport(); await fits(page);
  await page.screenshot({ path: 'docs/reviews/stage-7/chat-compact-390.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.getByRole('button', { name: 'Conversation options' }).click();
  expect(await page.getByRole('dialog').evaluate(element => parseFloat(getComputedStyle(element).animationDuration))).toBeLessThan(.001);
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Conversation options' })).toBeFocused();
  await page.goto('/admin/access'); await page.getByRole('button', { name: 'Open selected preview' }).click();
  for (const route of ['/admin/characters/char-amara', '/admin/reports/sample-report-pressure', '/admin/operations']) { await page.setViewportSize({ width: 640, height: 450 }); await page.goto(route); await expect(page.locator('h1:visible')).toHaveCount(1); await fits(page); await labelledControls(page); }
});

test('semantic foreground and control tokens retain measured contrast on their surfaces', async ({ page }) => {
  await page.goto('/');
  const ratios = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    function luminance(token: string) { const value = css.getPropertyValue(token).trim().slice(1); const hex = value.length === 3 ? [...value].map(c => c + c).join('') : value; const rgb = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; }
    return [['--ink', '--canvas', 4.5], ['--text-secondary', '--canvas', 4.5], ['--text-secondary', '--surface', 4.5], ['--surface', '--brand', 4.5], ['--brand', '--brand-soft', 4.5], ['--success', '--success-soft', 4.5], ['--warning', '--warning-soft', 4.5], ['--danger', '--danger-soft', 4.5], ['--border-control', '--surface', 3], ['--focus', '--canvas', 3]].map(([a, b, threshold]) => { const x = luminance(String(a)); const y = luminance(String(b)); return { pair: `${a}/${b}`, ratio: (Math.max(x, y) + .05) / (Math.min(x, y) + .05), threshold: Number(threshold) }; });
  });
  for (const result of ratios) expect(result.ratio, result.pair).toBeGreaterThanOrEqual(result.threshold);
});
