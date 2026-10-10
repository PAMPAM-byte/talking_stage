import { expect, test, type Page } from '@playwright/test';
import cast from '../lib/mock/public-cast.json';

async function operator(page: Page, role = 'admin') {
  await page.goto('/admin/access'); await page.getByLabel('Preview role').selectOption(role);
  await page.getByRole('button', { name: 'Open selected preview' }).click(); await expect(page).toHaveURL(/\/admin$/);
  if (role === 'admin') await expect(page.getByRole('heading', { name: 'Ready for review' })).toBeVisible();
}
async function customer(page: Page) {
  await page.goto('/sign-in'); await page.getByLabel('Email address').fill('demo@talkingstage.example'); await page.getByLabel('Password', { exact: true }).fill('TalkingStage123!');
  await page.getByRole('button', { name: 'Sign in to preview' }).click(); await expect(page).toHaveURL(/\/discover$/);
}
async function scenario(page: Page, value: string, label = 'Action scenario') {
  const controls = page.locator('.admin-review-controls:visible'); if ((await controls.getAttribute('open')) === null) await controls.locator('summary').click();
  await controls.getByLabel(label).selectOption(value);
}
async function approveAndPublish(page: Page, kind: string) {
  await page.goto('/admin/assets'); await page.getByLabel('Asset character').selectOption('char-amara');
  const card = page.locator('.admin-assets-grid > .card').filter({ hasText: `Amara · ${kind}` }); await card.getByRole('button', { name: 'Review asset' }).click();
  await page.getByRole('dialog').getByRole('checkbox').check(); await page.getByRole('dialog').getByRole('button', { name: 'Approve asset' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await card.getByRole('button', { name: 'Review asset' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish asset', exact: true }).click();
  await page.getByRole('dialog', { name: 'Publish approved asset?' }).getByRole('button', { name: 'Confirm asset publication' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function configure(page: Page) {
  await page.getByRole('button', { name: 'Review configuration changes' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm configuration' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('admin mock access distinguishes signed out, non-admin and expired; read failures recover', async ({ page }) => {
  await page.goto('/admin/characters/char-amara'); await expect(page.getByRole('heading', { name: 'Administration access required' })).toBeVisible();
  await expect(page.getByLabel('Character instructions')).toHaveCount(0);
  await operator(page, 'user'); await expect(page.getByRole('heading', { name: 'Administration unavailable for this role' })).toBeVisible();
  await operator(page, 'expired'); await expect(page.getByRole('heading', { name: 'Preview session expired' })).toBeVisible();
  await operator(page); await scenario(page, 'offline', 'Load scenario'); await expect(page.getByText('Workspace unavailable', { exact: true })).toBeVisible();
  await scenario(page, 'ready', 'Load scenario'); await expect(page.getByRole('heading', { name: 'Ready for review' })).toBeVisible();
  await page.getByRole('button', { name: 'Exit preview' }).click(); await expect(page.getByRole('heading', { name: 'Administration access required' })).toBeVisible();
});

test('create/edit/profile preview, failed save and version conflict retain fields and private direction', async ({ page }) => {
  await operator(page); await page.goto('/admin/characters/new'); await page.getByRole('button', { name: 'Save character draft' }).click();
  await expect(page.getByText('Action not completed', { exact: true }).filter({ visible: true })).toBeVisible();
  for (const [label, value] of Object.entries({ 'Character name': 'Draft Nneka', 'Fictional Nigerian location': 'Lagos', Occupation: 'Architect', 'Discovery bio': 'A fictional architect with a love of city walks.', 'Full biography': 'I enjoy thoughtful conversation and beautiful buildings.', 'Conversation clue': 'Which building would you redesign?', 'Interests (comma separated)': 'architecture, music', 'Personality tags (comma separated)': 'thoughtful, playful', 'Appearance and continuity': 'Clearly adult Nigerian woman, consistent fictional identity.', 'Language and voice': 'Thoughtful English with optional Pidgin.' })) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('Adult age').fill('17'); await page.getByRole('button', { name: 'Save character draft' }).click(); await expect(page.getByText('Action not completed', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByLabel('Adult age').fill('29'); await scenario(page, 'offline'); await page.getByRole('button', { name: 'Save character draft' }).click();
  await expect(page.getByLabel('Character name')).toHaveValue('Draft Nneka'); await page.getByRole('button', { name: 'Preview profile' }).click(); await expect(page.getByRole('dialog')).toContainText('Draft Nneka, 29'); await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Preview profile' })).toBeFocused();
  await scenario(page, 'ready'); await page.getByRole('button', { name: 'Save character draft' }).click(); await expect(page).toHaveURL(/\/admin\/characters\/char-/); await page.reload(); await expect(page.getByLabel('Character name')).toHaveValue('Draft Nneka');
  await expect(page.getByText('Instruction version 1', { exact: true })).toBeVisible();
  const instructions = page.getByLabel('Character instructions'); await instructions.fill('Private instruction sentinel. Fictional adult, non-explicit; honour refusal and mute.');
  await scenario(page, 'conflict'); await page.getByRole('button', { name: 'Save character draft' }).click(); await expect(instructions).toHaveValue('Private instruction sentinel. Fictional adult, non-explicit; honour refusal and mute.');
  await page.getByRole('button', { name: 'Reload current version, keep edits' }).click(); await scenario(page, 'ready'); await page.getByRole('button', { name: 'Save character draft' }).click(); await expect(page.getByText('Instruction version 2', { exact: true })).toBeVisible();
  const storage = await page.evaluate(() => ({ admin: sessionStorage.getItem('talkingstage:mock-admin-data:v1'), public: sessionStorage.getItem('talkingstage:mock-operator-public:v1') }));
  expect(storage.admin).not.toContain('Private instruction sentinel'); expect(storage.public ?? '').not.toContain('Private instruction sentinel');
  await customer(page); await expect(page.locator('.character-card')).toHaveCount(cast.length); await expect(page.getByText('Draft Nneka', { exact: true })).toHaveCount(0);
});

test('publication requires adult scope and owned approved assets; publication and deactivation reach discovery', async ({ page }) => {
  await operator(page); await page.goto('/admin/characters/char-amara'); await page.getByRole('button', { name: 'Publish character', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm publication' }).click(); await expect(page.getByRole('dialog')).toContainText('reviewed portrait and gallery assets'); await page.keyboard.press('Escape');
  await page.getByLabel('Discovery bio').fill('Public profile updated in the operator preview.'); await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Save character draft' }).click(); await expect(page.getByText('Preview updated', { exact: true }).filter({ visible: true })).toBeVisible();
  await approveAndPublish(page, 'portrait'); await approveAndPublish(page, 'gallery');
  await page.goto('/admin/characters/char-amara'); await page.getByRole('button', { name: 'Publish character', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm publication' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await customer(page); await expect(page.getByText('Public profile updated in the operator preview.', { exact: true })).toBeVisible();
  const publicStorage = await page.evaluate(() => sessionStorage.getItem('talkingstage:mock-operator-public:v1')); expect(publicStorage).not.toContain('instructions'); expect(publicStorage).not.toContain('appearanceContinuity');
  await page.goto('/admin/characters/char-amara'); await page.getByRole('button', { name: 'Deactivate character', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm deactivation' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/discover'); await expect(page.locator('.character-card')).toHaveCount(7); await page.goto('/characters/char-amara'); await expect(page.getByRole('heading', { name: 'Profile not found' })).toBeVisible();
});

test('asset review requires attestation/rejection reason and uploads stay local and pending', async ({ page }) => {
  await operator(page); await page.goto('/admin/assets'); await page.getByLabel('Asset character').selectOption('char-amara');
  await page.locator('.admin-assets-grid > .card').filter({ hasText: 'Amara · gallery' }).getByRole('button', { name: 'Review asset' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Approve asset' })).toBeDisabled(); await expect(page.getByRole('dialog').getByRole('button', { name: 'Publish asset', exact: true })).toBeDisabled();
  await page.getByLabel('Rejection reason').fill('Synthetic identity-continuity concern.'); await page.getByRole('dialog').getByRole('button', { name: 'Reject asset' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.admin-assets-grid')).toContainText('Synthetic identity-continuity concern.');
  await page.getByRole('button', { name: 'Register asset preview' }).click(); await page.getByLabel('Owned character asset slot').selectOption(cast.find(c => c.id === 'char-amara')!.galleryAssetIds[0]);
  await page.getByLabel('Choose a local image').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('synthetic') }); await expect(page.getByText('Image not selected', { exact: true })).toBeVisible();
  await page.getByLabel('Choose a local image').setInputFiles('public/images/characters/char-amara-gallery.webp'); await page.getByLabel('Image description').fill('Synthetic local character gallery preview'); await page.getByRole('button', { name: 'Register preview', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  const stored = await page.evaluate(() => sessionStorage.getItem('talkingstage:mock-admin-data:v1')); expect(stored).not.toContain('blob:');
  await page.reload(); await page.getByLabel('Asset character').selectOption('char-amara'); const card = page.locator('.admin-assets-grid > .card').filter({ hasText: 'Amara · gallery' }); await expect(card).toContainText('No image'); await expect(card).toContainText('pending');
});

test('customer reports enter scoped admin review; resolution retry preserves notes and is audited', async ({ page }) => {
  await customer(page); await page.goto('/characters/char-amara'); await page.getByRole('button', { name: 'Report character' }).click(); await page.getByLabel('Report reason').selectOption('Safety concern'); await page.getByRole('button', { name: 'Send report' }).click(); await expect(page.getByText('Report recorded', { exact: true })).toBeVisible();
  await operator(page); await page.goto('/admin/reports'); await expect(page.locator('.admin-record-list > a')).toHaveCount(4); await page.locator('.admin-record-list > a').filter({ hasText: 'character · char-amara' }).click();
  await expect(page.getByRole('heading', { name: 'Review report' })).toBeVisible(); await expect(page.locator('.report-context')).toContainText('Amara, 28');
  await page.getByRole('button', { name: 'Start review' }).click(); await expect(page.getByText('in review', { exact: true })).toBeVisible();
  await page.getByLabel('Resolution notes').fill('Synthetic reviewed resolution note.'); await scenario(page, 'offline'); await page.getByRole('button', { name: 'Resolve report' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm resolution' }).click(); await expect(page.getByRole('dialog')).toContainText('Action not completed');
  await page.keyboard.press('Escape'); await expect(page.getByLabel('Resolution notes')).toHaveValue('Synthetic reviewed resolution note.'); await scenario(page, 'ready'); await page.getByRole('button', { name: 'Resolve report' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm resolution' }).click(); await expect(page.getByText('Report resolved', { exact: true })).toBeVisible();
  await page.goto('/admin/audit'); await expect(page.locator('.admin-record-list')).toContainText('report · reviewed'); await expect(page.locator('.admin-record-list')).toContainText('reports · context_viewed'); await expect(page.locator('.admin-record-list')).not.toContainText('Synthetic reviewed resolution note.');
});

test('ledger distinguishes all statuses/events; reconciliation retries leave pending status unchanged', async ({ page }) => {
  await operator(page); await page.goto('/admin/payments'); await expect(page.locator('.admin-record-list > a')).toHaveCount(8);
  await page.getByLabel('Ledger status').selectOption('refunded'); await expect(page.locator('.admin-record-list > a')).toHaveCount(1); await expect(page.locator('.admin-record-list')).toContainText('Refunded');
  await page.getByLabel('Ledger status').selectOption('pending'); await page.locator('.admin-record-list > a').click(); await expect(page.getByRole('heading', { name: 'Payment intent review' })).toBeVisible();
  await expect(page.getByText('Verification: pending', { exact: false })).toBeVisible(); await expect(page.getByRole('button', { name: /mark.*paid/i })).toHaveCount(0);
  await scenario(page, 'offline'); await page.getByRole('button', { name: 'Request reconciliation review' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm reconciliation request' }).click(); await expect(page.getByRole('dialog')).toContainText('Action not completed'); await page.keyboard.press('Escape');
  await scenario(page, 'ready'); await page.getByRole('button', { name: 'Request reconciliation review' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm reconciliation request' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Request reconciliation review' })).toBeDisabled(); await expect(page.getByText('Pending verification', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('button', { name: 'Request reconciliation review' })).toBeDisabled(); await expect(page.getByText('Pending verification', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('independent global and character pauses preserve history and failed configuration preserves edits', async ({ page }) => {
  await operator(page); await customer(page); await page.goto('/characters/char-amara'); await page.getByRole('button', { name: 'Shoot your shot' }).click(); await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeVisible();
  await page.goto('/admin/operations'); await page.getByRole('switch', { name: 'Allow payments', exact: true }).uncheck(); await page.getByRole('switch', { name: 'Allow photo sharing', exact: true }).uncheck(); await page.getByLabel('Capability scope').selectOption('char-chidi'); await page.getByRole('switch', { name: 'Allow chat', exact: true }).uncheck();
  await scenario(page, 'conflict'); await page.getByRole('button', { name: 'Review configuration changes' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm configuration' }).click(); await expect(page.getByRole('dialog')).toContainText('changed'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reload configuration version, keep edits' }).click(); await scenario(page, 'ready'); await configure(page);
  await page.goto('/messages/preview-char-amara'); await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeEnabled(); await expect(page.getByText('Payments paused', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Message Amara' }).fill('Show me a character photo.'); await page.getByRole('button', { name: 'Send message' }).click(); await expect(page.getByLabel('Conversation messages').getByText('Character photos are paused for now. We can keep talking.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Conversation options' }).click(); await expect(page.getByRole('button', { name: 'Send a voluntary gift' })).toBeDisabled(); await page.keyboard.press('Escape');
  await page.goto('/characters/char-chidi'); await expect(page.getByRole('button', { name: 'Shoot your shot' })).toBeDisabled();
  await page.goto('/admin/operations'); await page.getByRole('switch', { name: 'Allow chat', exact: true }).uncheck(); await configure(page); await page.goto('/messages/preview-char-amara'); await expect(page.getByRole('textbox', { name: 'Message Amara' })).toBeDisabled(); await expect(page.getByText('Saved in preview', { exact: true })).toBeVisible();
});

test('admin layouts, analytics, audit empty state and representative screenshots fit all review widths', async ({ page }) => {
  await operator(page);
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto('/admin'); await expect(page.getByRole('heading', { name: 'Ready for review' })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([390, 1440].includes(width)) { await page.locator('img').evaluateAll(async imgs => { await Promise.all(imgs.map(img => (img as HTMLImageElement).decode().catch(() => {}))); }); await page.screenshot({ path: `docs/reviews/stage-6/overview-${width}.png`, fullPage: true }); }
    await page.goto('/admin/payments'); await expect(page.getByRole('heading', { name: 'Payment ledger', exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/admin/assets'); await page.getByLabel('Asset character').selectOption('char-amara'); await page.screenshot({ path: 'docs/reviews/stage-6/assets-390.png', fullPage: true });
  await page.goto('/admin/characters/char-amara'); await expect(page.getByLabel('Character instructions')).toBeVisible(); await page.screenshot({ path: 'docs/reviews/stage-6/character-390.png', fullPage: true });
  await page.goto('/admin/analytics'); await page.getByLabel('Metric period').selectOption('30'); await expect(page.getByText('1920', { exact: true })).toBeVisible(); await scenario(page, 'empty', 'Load scenario'); await expect(page.getByRole('heading', { name: 'No metrics in this period' })).toBeVisible();
  await page.goto('/admin/audit'); await page.getByLabel('Audit outcome').selectOption('failed'); await expect(page.getByRole('heading', { name: 'No audit records in this view' })).toBeVisible();
});
