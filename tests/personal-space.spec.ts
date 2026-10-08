import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/sign-in'); await page.getByLabel('Email address').fill('demo@talkingstage.example');
  await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click(); await expect(page).toHaveURL(/\/discover$/);
}
async function chat(page: Page) {
  await page.goto('/characters/char-amara'); await page.getByRole('button', { name: /Shoot your shot|Resume conversation/ }).click();
  await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeVisible();
}
async function saveScenario(page: Page, value: string) {
  const d = page.locator('dialog[open] .discovery-qa').count().then(n => n ? page.locator('dialog[open] .discovery-qa') : page.locator('.space-page > .discovery-qa').filter({ hasText: 'Personal-space review controls' }));
  const control = await d;
  if ((await control.getAttribute('open')) === null) await control.locator('summary').click();
  await control.getByLabel('Save scenario').selectOption(value);
}
async function gift(page: Page) {
  await page.getByRole('button', { name: 'Conversation options' }).click();
  await page.getByRole('button', { name: 'Send a voluntary gift' }).click();
  await page.getByLabel('Amount in NGN').fill('2500.50'); await page.getByRole('button', { name: 'Review amount' }).click();
}
async function memory(page: Page) {
  await page.goto('/settings/memories/char-amara'); await page.getByRole('switch', { name: 'Enable memory for Amara' }).click();
  await expect(page.getByRole('switch', { name: 'Enable memory for Amara' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Save a sample fact' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save a sample fact' }).click(); await page.getByRole('button', { name: 'Save sample memory' }).click();
  await expect(page.getByRole('button', { name: 'Inspect memory' })).toBeVisible();
}

test('preferences preserve failed changes and update discovery after save and refresh', async ({ page }) => {
  await login(page); await page.goto('/settings/preferences'); await page.getByLabel('Preferred name').fill('Ada');
  await page.getByRole('button', { name: 'Men', exact: true }).click(); await page.getByLabel('Conversation language').selectOption('english_pidgin');
  await saveScenario(page, 'offline'); await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Preferences not saved', { exact: true })).toBeVisible(); await expect(page.getByLabel('Preferred name')).toHaveValue('Ada');
  await saveScenario(page, 'ready'); await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Preferences saved', { exact: true })).toBeVisible(); await page.reload();
  await expect(page.getByLabel('Preferred name')).toHaveValue('Ada'); await expect(page.getByLabel('Conversation language')).toHaveValue('english_pidgin');
  await page.goto('/discover'); await expect(page.locator('.character-card')).toHaveCount(4);
});

test('memory is scoped, sensitive consent is explicit, and disabled facts remain deletable', async ({ page }) => {
  await login(page); await memory(page);
  await page.getByRole('button', { name: 'Inspect memory' }).click(); await expect(page.getByRole('dialog', { name: 'Memory details' })).toContainText('Explicit consent'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Review sensitive-memory consent' }).click(); await expect(page.getByRole('button', { name: 'Save sample memory' })).toBeDisabled();
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Save sample memory' }).click(); await expect(page.getByRole('button', { name: 'Inspect memory' })).toHaveCount(2);
  await page.getByRole('switch', { name: 'Enable memory for Amara' }).click(); await expect(page.getByText('Memory disabled', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete memory', exact: true }).first().click(); await page.getByRole('dialog').getByRole('button', { name: 'Delete memory', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inspect memory' })).toHaveCount(1); await page.reload(); await expect(page.getByRole('button', { name: 'Inspect memory' })).toHaveCount(1);
  await page.goto('/settings/memories/char-chidi'); await expect(page.getByRole('heading', { name: 'No saved facts here' })).toBeVisible();
});

test('amount confirmation, failure retry, checkout and all statuses never imply real money', async ({ page }) => {
  await login(page); await chat(page);
  await page.getByRole('button', { name: 'Conversation options' }).click(); await page.getByRole('button', { name: 'Send a voluntary gift' }).click();
  await page.getByRole('button', { name: 'Review amount' }).click(); await expect(page.getByText('Gift not created', { exact: true })).toBeVisible();
  await page.getByLabel('Amount in NGN').fill('2500.50'); await page.getByRole('button', { name: 'Review amount' }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toContainText('TalkingStage’s operator'); await expect(dialog).toContainText('NGN');
  await saveScenario(page, 'offline'); await dialog.getByRole('button', { name: /^Confirm ₦/ }).click(); await expect(dialog.getByText('Gift not created', { exact: true })).toBeVisible();
  await saveScenario(page, 'ready'); await dialog.getByRole('button', { name: /^Confirm ₦/ }).click();
  await expect(dialog.getByText('Awaiting checkout', { exact: true })).toBeVisible(); await dialog.getByRole('link', { name: 'View payment details' }).click();
  await expect(page).toHaveURL(/\/payments\/payment-/); await page.getByRole('button', { name: 'Simulate checkout' }).click(); await expect(page.locator('.space-page .payment-card')).toContainText('Pending verification');
  await saveScenario(page, 'offline'); await page.getByRole('button', { name: 'Check simulated status' }).click(); await expect(page.getByText('Payment action unavailable', { exact: true })).toBeVisible();
  await expect(page.locator('.space-page .payment-card')).toContainText('Pending verification');
  await page.getByText('Payment review controls', { exact: true }).click();
  for (const [status, label] of Object.entries({ paid: 'Paid', failed: 'Failed', cancelled: 'Cancelled', expired: 'Expired', refunded: 'Refunded', disputed: 'Disputed', awaiting_checkout: 'Awaiting checkout', pending: 'Pending verification' })) {
    await page.getByLabel('Simulated payment outcome').selectOption(status); await expect(page.locator('.space-page .payment-card')).toContainText(label);
  }
  const rows = await page.evaluate(() => JSON.parse(sessionStorage.getItem('talkingstage:mock-personal-space:v1')!).payments);
  expect(rows).toHaveLength(1); expect(rows[0].amountMinor).toBe(250050); expect(rows[0].checkoutUrl).toBeNull();
  await page.getByLabel('Simulated payment outcome').selectOption('failed'); await page.getByRole('button', { name: 'Review a new attempt' }).click();
  await expect(page.getByLabel('Amount in NGN')).toHaveValue(''); await page.getByLabel('Amount in NGN').fill('3000'); await page.getByRole('button', { name: 'Review amount' }).click();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('talkingstage:mock-personal-space:v1')!).payments.length)).toBe(1);
  await page.getByRole('dialog').getByRole('button', { name: /^Confirm ₦/ }).click(); await expect(page.getByRole('dialog')).toContainText('Simulated checkout created');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('talkingstage:mock-personal-space:v1')!).payments.length)).toBe(2);
  await page.goto('/settings/payments'); await page.getByLabel('Payment status').selectOption('paid'); await expect(page.getByRole('heading', { name: 'No payments here' })).toBeVisible();
});

test('reset and delete keep memories by default, optional clearing removes facts, payments remain', async ({ page }) => {
  await login(page); await memory(page); await chat(page); await gift(page); await page.getByRole('dialog').getByRole('button', { name: /^Confirm ₦/ }).click(); await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Conversation options' }).click(); await page.getByRole('button', { name: 'Reset conversation', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Also clear this character’s saved memories' })).not.toBeChecked(); await page.getByRole('dialog').getByRole('button', { name: 'Reset conversation', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.message-turn--character')).toHaveCount(1);
  await page.goto('/settings/memories/char-amara'); await expect(page.getByRole('button', { name: 'Inspect memory' })).toHaveCount(1); await chat(page);
  await page.getByRole('button', { name: 'Conversation options' }).click(); await page.getByRole('button', { name: 'Delete conversation', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Also clear this character’s saved memories' }).check(); await page.getByRole('dialog').getByRole('button', { name: 'Delete conversation', exact: true }).click(); await expect(page).toHaveURL(/\/messages$/);
  await page.goto('/settings/memories/char-amara'); await expect(page.getByRole('heading', { name: 'No saved facts here' })).toBeVisible();
  await page.goto('/settings/payments'); await expect(page.locator('.payment-history-row')).toHaveCount(1);
});

test('muted and early conversations have no request; decline is graceful and never repeated', async ({ page }) => {
  await login(page); await chat(page); await expect(page.getByRole('button', { name: 'Choose amount' })).toHaveCount(0);
  await page.getByText('Request policy review controls', { exact: true }).click(); await expect(page.getByRole('button', { name: 'Load request sample' })).toBeDisabled();
  await page.goto('/settings/requests'); await page.getByRole('switch').check(); await page.getByRole('button', { name: 'Save request setting' }).click(); await expect(page.getByText('Request setting saved', { exact: true })).toBeVisible();
  await chat(page); await page.getByText('Request policy review controls', { exact: true }).click(); await expect(page.getByRole('button', { name: 'Load request sample' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Use eligible familiar-conversation sample' }).check(); await page.getByRole('button', { name: 'Load request sample' }).click();
  await page.getByRole('button', { name: 'Not now', exact: true }).click(); await expect(page.getByText('That’s fine. We can carry on with our conversation.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load request sample' }).click(); await expect(page.getByText('Declined requests are not repeated.', { exact: false })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeEnabled();
  await page.goto('/characters/char-tunde'); await page.getByRole('button', { name: 'Shoot your shot' }).click(); await expect(page.getByRole('textbox', { name: 'Message Tunde' })).toBeVisible();
  await page.getByText('Request policy review controls', { exact: true }).click(); await page.getByRole('checkbox', { name: 'Use eligible familiar-conversation sample' }).check(); await page.getByRole('button', { name: 'Load request sample' }).click();
  await page.getByRole('button', { name: 'Ignore request' }).click(); await expect(page.getByRole('button', { name: 'Choose amount' })).toHaveCount(0);
  await page.goto('/settings/requests'); await page.getByRole('switch').uncheck(); await page.getByRole('button', { name: 'Save request setting' }).click(); await expect(page.getByText('Monetary requests muted.', { exact: true })).toBeVisible();
  await chat(page); await expect(page.getByRole('button', { name: 'Choose amount' })).toHaveCount(0); await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeEnabled();
});

test('reports preserve input on failure, redact persistence, and support message and photo contexts', async ({ page }) => {
  await login(page); await chat(page); await page.getByRole('button', { name: 'Report message', exact: true }).first().click();
  await page.getByRole('button', { name: 'Send report' }).click(); await expect(page.getByText('Report not saved', { exact: true })).toBeVisible();
  await page.getByLabel('Report reason').selectOption('Safety concern'); await page.getByLabel('Additional details (optional)').fill('Private report wording');
  await saveScenario(page, 'offline'); await page.getByRole('button', { name: 'Send report' }).click(); await expect(page.getByLabel('Additional details (optional)')).toHaveValue('Private report wording');
  await saveScenario(page, 'ready'); await page.getByRole('button', { name: 'Send report' }).click(); await expect(page.getByRole('dialog')).toContainText('No report has been sent'); await page.getByRole('button', { name: 'Done', exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('talkingstage:mock-personal-space:v1'))).not.toContain('Private report wording');
  await page.goto('/characters/char-amara'); await page.getByRole('button', { name: /View photos/ }).click(); await page.getByRole('button', { name: 'Report this photo' }).click();
  await expect(page.getByRole('dialog')).toContainText('Selected photo'); await page.getByLabel('Report reason').selectOption('Photo concern'); await page.getByRole('button', { name: 'Send report' }).click(); await expect(page.getByText('Report recorded', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click(); await page.getByRole('button', { name: 'Report character', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Selected character'); await page.getByLabel('Report reason').selectOption('Other'); await page.getByRole('button', { name: 'Send report' }).click(); await expect(page.getByText('Report recorded', { exact: true })).toBeVisible();
});

test('payment history paginates and excludes records owned by another synthetic actor', async ({ page }) => {
  await login(page); await chat(page); await gift(page); await page.getByRole('dialog').getByRole('button', { name: /^Confirm ₦/ }).click(); await expect(page.getByRole('dialog')).toContainText('Simulated checkout created');
  await page.evaluate(() => {
    const key = 'talkingstage:mock-personal-space:v1'; const s = JSON.parse(sessionStorage.getItem(key)!); const p = s.payments[0];
    s.payments = Array.from({ length: 7 }, (_, i) => ({ ...p, id: `pagination-${i}`, reference: `SIM-PAGE${i}`, status: i % 2 ? 'paid' : 'pending' }));
    s.payments.push({ ...p, id: 'foreign-record', userId: 'different-synthetic-actor' }); sessionStorage.setItem(key, JSON.stringify(s));
  });
  await page.goto('/settings/payments'); await expect(page.locator('.payment-history-row')).toHaveCount(5); await page.getByRole('button', { name: 'Load more payments' }).click(); await expect(page.locator('.payment-history-row')).toHaveCount(7);
  await page.getByLabel('Payment status').selectOption('paid'); await expect(page.locator('.payment-history-row')).toHaveCount(3); await expect(page.locator('a[href="/payments/foreign-record"]')).toHaveCount(0);
});

test('account deletion validates confirmation, preserves data on failure, then clears and blocks access', async ({ page }) => {
  await login(page); await memory(page); await page.goto('/settings/account'); await saveScenario(page, 'offline'); await page.getByRole('button', { name: 'Review account deletion' }).click();
  await expect(page.getByRole('button', { name: 'Delete demo account' })).toBeDisabled(); await page.getByLabel('Type DELETE to confirm').fill('DELETE'); await page.getByRole('button', { name: 'Delete demo account' }).click();
  await expect(page.getByText('Account not deleted', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Keep account' }).click(); await saveScenario(page, 'ready');
  await page.getByRole('button', { name: 'Review account deletion' }).click(); await page.getByRole('button', { name: 'Delete demo account' }).click(); await expect(page).toHaveURL(/\/account-deleted$/);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('talkingstage:mock-')))).toEqual([]);
  await page.goto('/settings'); await expect(page).toHaveURL(/\/sign-in$/);
});

test('settings and receipts fit mobile through desktop and produce review captures', async ({ page }) => {
  await login(page);
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto('/settings'); await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `docs/reviews/stage-5/settings-${width}.png`, fullPage: true });
  }
  await chat(page); await gift(page);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); if ([390, 1440].includes(width)) await page.screenshot({ path: `docs/reviews/stage-5/confirmation-${width}.png` }); }
});
