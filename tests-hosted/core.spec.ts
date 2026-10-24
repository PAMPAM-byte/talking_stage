import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

type Session = { user: { id: string }; access_token: string };
type Character = { id: string; name: string; age: number; gender: string };
type Discovery = { total: number; characters: Character[] };
type Asset = { id: string; character_id: string; slot: string; storage_path: string };
const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
async function api<T>(path: string, body?: object, token?: string, service = false, method = 'POST'): Promise<T> {
  const key = service ? secret : publicKey;
  const response = await fetch(endpoint + path, { method, headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Hosted verification HTTP ${response.status} on ${path.split('?')[0]}`);
  return await response.json().catch(() => null) as T;
}

test('hosted registration, gender discovery, 100 photos, chat persistence, isolation and settings', async ({ page, browser }) => {
  const run = randomUUID(), email = `hosted-browser-${run}@example.test`, secondEmail = `hosted-other-${run}@example.test`;
  const password = `Ts!${randomUUID()}Aa9`;
  const actors = new Set<string>();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/onboarding/age');
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    await page.getByRole('checkbox', { name: 'I am 18 or older', exact: true }).check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page).toHaveURL(/\/register$/);
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('checkbox', { name: /I accept the terms/ }).check();
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding\/preferences$/);
    const session = await api<Session>('/auth/v1/token?grant_type=password', { email, password }); actors.add(session.user.id);
    await page.getByLabel('Preferred name').fill('Hosted review');
    await page.getByRole('button', { name: 'Women', exact: true }).click();
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
    await page.getByRole('checkbox', { name: /I understand the characters and their photos/ }).check();
    await page.getByRole('button', { name: 'Explore characters', exact: true }).click();
    await expect(page).toHaveURL(/\/discover(?:\?|$)/);
    for (const [label, gender] of [['Women', 'woman'], ['Men', 'man'], ['Everyone', null]] as const) {
      await page.getByRole('navigation', { name: 'Character gender' }).getByRole('link', { name: label, exact: true }).click();
      const data = await api<Discovery>('/rest/v1/rpc/discover_cast', { p_page: 1, p_gender: gender }, session.access_token);
      if (gender) expect(data.characters.every(character => character.gender === gender)).toBe(true);
      else expect(data.total).toBe(50);
      await expect(page.locator('.discovery-deck')).toHaveAttribute('data-selection-size', String(data.characters.length));
      for (const character of data.characters) {
        await expect(page.locator('.character-card')).toHaveCount(1);
        await expect(page.getByRole('heading', { name: `${character.name}, ${character.age}`, exact: true })).toBeVisible();
        await page.getByRole('button', { name: `Pass ${character.name}`, exact: true }).click();
      }
    }
    const state = JSON.parse(readFileSync('.local-services/hosted-cast/state.json', 'utf8'));
    const assets = await api<Asset[]>('/rest/v1/character_assets?select=id,character_id,slot,storage_path', undefined, session.access_token, false, 'GET');
    expect(assets).toHaveLength(100);
    for (const asset of assets) {
      const response = await page.request.get(`/api/cast-assets/${asset.id}?w=320`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/webp');
      expect((await response.body()).length).toBeGreaterThan(100);
    }
    const anonymous = await browser.newContext();
    try {
      const denied = await anonymous.request.get(`http://localhost:3102/api/cast-assets/${assets[0].id}?w=320`);
      expect([401, 403, 404]).toContain(denied.status());
      const direct = await anonymous.request.get(`${endpoint}/storage/v1/object/public/cast-private/${assets[0].storage_path}`);
      expect(direct.ok()).toBe(false);
    } finally { await anonymous.close(); }
    await page.goto('/discover?gender=woman');
    await page.getByRole('button', { name: 'Browse again', exact: true }).click();
    for (let passed = 0; passed < 12 && !await page.getByRole('heading', { name: 'Amara, 27', exact: true }).count(); passed++) await page.getByRole('button', { name: /^Pass / }).click();
    await expect(page.getByRole('heading', { name: 'Amara, 27', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'View profile', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/characters/${state.characters['char-amara'].id}\\?gender=woman$`));
    await expect(page.locator('.gallery-thumbnails button')).toHaveCount(2);
    for (const number of [1, 2]) {
      await page.getByRole('button', { name: `Show photo ${number} of Amara`, exact: true }).click();
      const photo = page.locator('.profile-photo-open');
      await expect.poll(() => photo.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await photo.press('Enter'); await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape'); await expect(photo).toBeFocused();
    }
    await page.getByRole('link', { name: 'Back to discovery', exact: true }).click();
    await expect(page).toHaveURL(/\/discover\?gender=woman$/);
    await page.getByRole('button', { name: 'Meet Amara', exact: true }).click();
    await expect(page).toHaveURL(/\/messages\/[a-f0-9-]+$/);
    const conversation = new URL(page.url()).pathname.split('/').pop()!;
    const portrait = page.getByRole('img', { name: 'Amara’s character portrait', exact: true });
    await expect.poll(() => portrait.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByLabel('Message Amara', { exact: true }).fill('Synthetic hosted persistence check.');
    await page.getByLabel('Message Amara', { exact: true }).press('Enter');
    await expect(page.locator('.message-bubble')).toHaveText('Synthetic hosted persistence check.');
    await page.reload(); await expect(page.locator('.message-bubble')).toHaveText('Synthetic hosted persistence check.');
    const other = await api<Session>('/auth/v1/signup', { email: secondEmail, password, data: { adult_declaration: '18-plus-v1' } }); actors.add(other.user.id);
    await api('/rest/v1/rpc/save_preferences', { p_name: 'Other hosted review', p_genders: ['man'], p_language: 'english', p_requests: false, p_version: 1 }, other.access_token);
    await api('/rest/v1/rpc/complete_onboarding', { p_version: 2, p_consent: true }, other.access_token);
    const foreign = await fetch(`${endpoint}/rest/v1/rpc/conversation_thread`, { method: 'POST', headers: { apikey: publicKey, Authorization: `Bearer ${other.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: conversation }), signal: AbortSignal.timeout(15000) });
    expect(foreign.ok).toBe(false);
    const messages = await api<unknown[]>(`/rest/v1/messages?conversation_id=eq.${conversation}&select=id`, undefined, other.access_token, false, 'GET'); expect(messages).toEqual([]);
    await page.goto('/settings/preferences'); await page.getByLabel('Preferred name').fill('Hosted saved preference');
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
    await expect(page.getByText('Your preferences are saved.', { exact: true })).toBeVisible();
    await page.reload(); await expect(page.getByLabel('Preferred name')).toHaveValue('Hosted saved preference');
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`/messages/${conversation}`);
    mkdirSync('docs/reviews/hosted', { recursive: true }); await page.screenshot({ path: 'docs/reviews/hosted/chat-390.png' });
    await page.goto('/settings'); await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByLabel('Email address').fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page).toHaveURL(/\/discover(?:\?|$)/);
    expect(errors).toEqual([]);
  } finally {
    // Find only this run's exact synthetic addresses if registration committed before an assertion failed.
    const users = await api<{ users: { id: string; email: string }[] }>('/auth/v1/admin/users?page=1&per_page=1000', undefined, undefined, true, 'GET');
    for (const user of users.users) if ([email, secondEmail].includes(user.email)) actors.add(user.id);
    for (const actor of actors) {
      expect(actor).toMatch(/^[a-f0-9-]{36}$/);
      writeFileSync('.local-services/hosted-cast/test-cleanup.sql', `delete from public.messages where conversation_id in(select id from public.conversations where user_id='${actor}');delete from public.conversations where user_id='${actor}';`);
      execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--linked', '--file', '.local-services/hosted-cast/test-cleanup.sql'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
      await api(`/auth/v1/admin/users/${actor}`, undefined, undefined, true, 'DELETE');
    }
  }
});
