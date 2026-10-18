import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

test('published fifty-character cast renders profiles and all private photos without generating replies', async ({ page, browser }) => {
  const receipt = JSON.parse(readFileSync('docs/cast-50/publication.json', 'utf8'));
  expect(receipt.profiles).toBe(50);
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const service = createClient(endpoint, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
  const member = createClient(endpoint, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
  const email = `cast50-browser-${randomUUID()}@example.test`, password = `Ts!${randomUUID()}Aa9`;
  let actor: string | undefined;
  try {
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', synthetic_cast_verification: true } });
    expect(created.error).toBeNull(); actor = created.data.user!.id;
    expect((await member.auth.signInWithPassword({ email, password })).error).toBeNull();
    expect((await member.rpc('save_preferences', { p_name: 'Cast review', p_genders: ['woman', 'man'], p_language: 'english', p_requests: false, p_version: 1 })).error).toBeNull();
    expect((await member.rpc('complete_onboarding', { p_version: 2, p_consent: true })).error).toBeNull();
    await page.goto('/sign-in');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/discover(?:\?|$)/);
    await page.goto('/discover?gender=all');
    await expect(page.locator('.discovery-deck')).toHaveAttribute('data-selection-size', '50');
    await expect(page.getByRole('navigation', { name: 'Pagination', exact: true })).toHaveCount(0);
    await expect.poll(() => page.locator('.discovery-deck__photo img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const publicRows: { id: string; age: number; gender: string }[] = [];
    for (let batch = 1; batch <= 5; batch++) {
      const rows = await member.rpc('discover_cast', { p_page: batch, p_gender: null });
      expect(rows.error).toBeNull(); publicRows.push(...rows.data.characters);
    }
    expect(new Set(publicRows.map(c => c.id)).size).toBe(50);
    expect(publicRows.filter(c => c.age >= 22 && c.age <= 34)).toHaveLength(46);
    expect(publicRows.filter(c => c.age >= 40 && c.age <= 50 && c.gender === 'man')).toHaveLength(2);
    expect(publicRows.filter(c => c.age >= 40 && c.age <= 50 && c.gender === 'woman')).toHaveLength(2);
    const assets = await member.from('character_assets').select('id');
    expect(assets.error).toBeNull(); expect(assets.data).toHaveLength(100);
    for (let start = 0; start < assets.data!.length; start += 4) {
      await Promise.all(assets.data!.slice(start, start + 4).map(async asset => {
        const response = await page.request.get(`/api/cast-assets/${asset.id}?w=320`);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('image/webp');
        expect(response.headers()['cache-control']).toContain('private');
        expect((await response.body()).length).toBeGreaterThan(100);
      }));
    }
    for (const [key, name] of [['char-chief-chukwudi', 'Chuka'], ['char-yomi', 'Yomi'], ['char-lola', 'Lola']]) {
      await page.goto(`/characters/${receipt.keys[key]}`);
      await expect(page.getByRole('heading', { name: new RegExp(`^${name},`) })).toBeVisible();
      await expect(page.locator('.profile-facts')).toContainText('· Fictional setting');
      await expect(page.locator('.profile-clue p')).toHaveText(/^“.+”$/);
      for (const number of [1, 2]) {
        await page.getByRole('button', { name: `Show photo ${number} of ${name}`, exact: true }).click();
        await expect.poll(() => page.locator('.profile-photo-open img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      }
      if (key === 'char-yomi') for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.getByRole('heading', { name: /^Yomi,/ }).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `test-results-hosted/youth-yomi-${width}.png`, fullPage: true });
      }
    }
    const anonymous = await browser.newContext();
    try { expect([401, 403, 404]).toContain((await anonymous.request.get(`http://localhost:3102/api/cast-assets/${assets.data![0].id}?w=320`)).status()); }
    finally { await anonymous.close(); }
    console.log('Hosted frontend verified: five discovery batches, 100 private photo responses, paired new-character galleries and anonymous photo denial. No conversations or replies created.');
  } finally {
    if (actor) expect((await service.auth.admin.updateUserById(actor, { ban_duration: '876000h' })).error).toBeNull();
    await member.auth.signOut();
  }
});
