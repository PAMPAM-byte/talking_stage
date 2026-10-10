import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('connected mobile layouts, keyboard photo access and interrupted preference recovery', async ({ page }) => {
  test.setTimeout(240000);
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
  const viewer = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
  const email = `integration-${randomUUID()}@example.test`, password = `Ts!${randomUUID()}Aa9`;
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1' } });
  expect(created.error).toBeNull();
  const actor = created.data.user!.id;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    expect((await viewer.auth.signInWithPassword({ email, password })).error).toBeNull();
    expect((await viewer.rpc('save_preferences', { p_name: 'Integration review', p_genders: ['woman'], p_language: 'english', p_requests: false, p_version: 1 })).error).toBeNull();
    expect((await viewer.rpc('complete_onboarding', { p_version: 2, p_consent: true })).error).toBeNull();
    const cast = JSON.parse(readFileSync('.local-services/photo-refresh.json', 'utf8'));
    const character = cast.characters['char-amara'].id;
    const conversation = await viewer.rpc('start_conversation', { p_character: character });
    expect(conversation.error).toBeNull();

    await page.goto('/onboarding/age');
    const adult = page.getByRole('checkbox', { name: 'I am 18 or older', exact: true });
    await adult.focus(); await page.keyboard.press('Space'); await expect(adult).toBeChecked();
    await page.getByRole('button', { name: 'Continue', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/register$/);
    await page.goto('/sign-in');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/discover$/);
    mkdirSync('docs/reviews/integration', { recursive: true });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/discover?gender=woman', `/characters/${character}?gender=woman`, `/messages/${conversation.data}`, '/settings']) {
        await page.goto(path);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true);
        if (width === 390 && path === '/settings') await page.screenshot({ path: 'docs/reviews/integration/settings-390.png', fullPage: true });
      }
    }
    await page.goto(`/characters/${character}?gender=woman`);
    const photo = page.locator('.profile-photo-open').first();
    await photo.focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(photo).toBeFocused();

    await page.goto('/settings/preferences');
    const name = page.getByLabel('Preferred name', { exact: true });
    await name.fill('Recovered preference');
    await page.route('**/settings/preferences', route => route.request().headers()['next-action'] ? route.abort('failed') : route.continue());
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
    await expect(page.getByText('We couldn’t connect. Please try again.', { exact: true })).toBeVisible();
    await expect(name).toHaveValue('Recovered preference');
    await expect(page.getByRole('button', { name: 'Save preferences', exact: true })).toBeEnabled();
    await page.unroute('**/settings/preferences');
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
    await expect(page.getByText('Your preferences are saved.', { exact: true })).toBeVisible();
    await page.reload(); await expect(name).toHaveValue('Recovered preference');
    expect(errors).toEqual([]);
  } finally {
    expect(/^[a-f0-9-]{36}$/.test(actor)).toBe(true);
    execFileSync('docker', ['exec', '-i', 'supabase_db_talking_stage', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input: `delete from public.messages where conversation_id in(select id from public.conversations where user_id='${actor}');delete from public.conversations where user_id='${actor}';`,
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    expect((await service.auth.admin.deleteUser(actor)).error).toBeNull();
  }
});
