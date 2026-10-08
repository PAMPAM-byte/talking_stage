import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const password = `Ts!${randomUUID()}Aa9`;
const run = randomUUID();
const emailA = `stage8-a-${run}@example.test`;
const emailB = `stage8-b-${run}@example.test`;
const castId = randomUUID(); const ca = randomUUID(); const cb = randomUUID();
const client = () => createClient(endpoint, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
function sql(query: string) {
  return execFileSync('docker', ['exec', '-i', 'supabase_db_talking_stage', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: query, encoding: 'utf8', windowsHide: true }).trim();
}
async function emailLink(email: string, purpose: string) {
  let link = '';
  await expect.poll(async () => {
    const response = await fetch(`http://127.0.0.1:54324/view/latest.html?query=${encodeURIComponent(`to:${email}`)}`);
    if (!response.ok) return false;
    const html = await response.text();
    const href = html.match(/href="([^"]+token_hash[^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
    if (!href) return false;
    const url = new URL(href);
    if (url.origin !== 'http://localhost:3102' || url.pathname !== '/auth/confirm' || url.searchParams.get('type') !== purpose) return false;
    link = url.toString(); return true;
  }, { message: `Local ${purpose} email arrives`, timeout: 30000 }).toBe(true);
  return link;
}
async function signIn(page: Page, email: string, secret = password) {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(secret);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function expireBrowserSession(context: BrowserContext, invalidateRefresh = false) {
  const cookies = (await context.cookies()).filter(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name)).sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
  const raw = cookies.map(cookie => cookie.value).join('');
  expect(raw.startsWith('base64-'), 'Expected an SSR session cookie').toBe(true);
  const session = JSON.parse(Buffer.from(raw.slice(7), 'base64url').toString('utf8'));
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  if (invalidateRefresh) session.refresh_token = 'invalid-test-refresh-token';
  const replacement = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  let offset = 0;
  await context.addCookies(cookies.map((cookie, index) => {
    const value = index === cookies.length - 1 ? replacement.slice(offset) : replacement.slice(offset, offset + cookie.value.length);
    offset += value.length; return { ...cookie, value };
  }));
}
async function register(page: Page, email: string, name: string) {
  await page.goto('/onboarding/age');
  await expect(page.getByRole('checkbox', { name: 'I am 18 or older' })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I am 18 or older' }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: /I accept the terms/ }).check();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.locator('main').getByRole('status')).toContainText('Check your email for a confirmation link');
  await signIn(page, email);
  await expect(page.locator('main').getByRole('alert')).toContainText('confirm your email first');
  const link = await emailLink(email, 'signup');
  try { await page.goto(link); } catch { throw new Error('The local confirmation link could not be opened.'); }
  await expect(page).toHaveURL(/\/onboarding\/preferences$/);
  await page.getByLabel('Preferred name').fill(name);
  await page.getByRole('button', { name: 'Women', exact: true }).click();
  await page.getByRole('button', { name: 'Men', exact: true }).click();
  await page.getByLabel('Conversation language').selectOption('english_pidgin');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page).toHaveURL(/\/onboarding\/complete$/);
  await page.goto('/discover');
  await expect(page).toHaveURL(/\/onboarding\/preferences$/);
  await expect(page.getByLabel('Preferred name')).toHaveValue(name);
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page).toHaveURL(/\/onboarding\/complete$/);
  await page.getByRole('checkbox', { name: /I understand the characters and their photos/ }).check();
  await page.getByRole('button', { name: 'Explore characters' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Welcome, ${name}.`);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Welcome, ${name}.`);
  return link;
}

test('real local registration, declarations, ownership, preferences, roles, recovery and sign-out', async ({ browser }) => {
  test.setTimeout(600000);
  const a = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const b = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pa = await a.newPage(); const pb = await b.newPage();
  const errors: string[] = []; pa.on('pageerror', error => errors.push(error.message)); pb.on('pageerror', error => errors.push(error.message));
  try {
    await test.step('direct registration without a valid declaration cannot proceed', async () => {
      await a.addCookies([{ name: 'ts-adult', value: 'forged', url: 'http://localhost:3102' }]);
      await pa.goto('/register');
      await pa.getByLabel('Email address').fill(`stage8-blocked-${run}@example.test`);
      await pa.getByLabel('Password', { exact: true }).fill(password);
      await pa.getByRole('checkbox', { name: /I accept the terms/ }).check();
      await pa.getByRole('button', { name: 'Create account', exact: true }).click();
      await expect(pa).toHaveURL(/\/onboarding\/age$/);
      await pa.getByRole('button', { name: 'I am under 18' }).click();
      await expect(pa.getByText('You can return when you are eligible.')).toBeVisible();
      await pa.goto('/onboarding/age');
      await pa.getByRole('checkbox', { name: 'I am 18 or older' }).check();
      await pa.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(pa).toHaveURL(/\/register$/);
      expect((await a.cookies()).some(cookie => cookie.name === 'ts-adult')).toBe(true);
      await pa.goto('/onboarding/age');
      await pa.getByRole('button', { name: 'I am under 18' }).click();
      await expect(pa.getByText('You can return when you are eligible.')).toBeVisible();
      expect((await a.cookies()).some(cookie => cookie.name === 'ts-adult')).toBe(false);
      const expired = Buffer.from(JSON.stringify({ subject: '18-plus-v1', expires: Date.now() - 1000 })).toString('base64url');
      const signature = createHmac('sha256', process.env.AUTH_FLOW_SECRET!).update(`adult:${expired}`).digest('base64url');
      await a.addCookies([{ name: 'ts-adult', value: `${expired}.${signature}`, url: 'http://localhost:3102' }]);
      await pa.goto('/register');
      await pa.getByLabel('Email address').fill(`stage8-expired-${run}@example.test`);
      await pa.getByLabel('Password', { exact: true }).fill(password);
      await pa.getByRole('checkbox', { name: /I accept the terms/ }).check();
      await pa.getByRole('button', { name: 'Create account', exact: true }).click();
      await expect(pa).toHaveURL(/\/onboarding\/age$/);
    });
    const confirmation = await register(pa, emailA, 'Stage eight A');
    await register(pb, emailB, 'Stage eight B');
    const cauth = client(); const bauth = client();
    const loginA = await cauth.auth.signInWithPassword({ email: emailA, password });
    const loginB = await bauth.auth.signInWithPassword({ email: emailB, password });
    expect(loginA.error).toBeNull(); expect(loginB.error).toBeNull();
    const idA = loginA.data.user!.id; const idB = loginB.data.user!.id;
    await test.step('database ownership applies to two genuine authenticated actors', async () => {
      const declaration = await cauth.from('profiles').select('id,adult_declared_at,adult_declaration_version,onboarding_complete');
      expect(declaration.error).toBeNull(); expect(declaration.data?.length).toBe(1);
      expect(declaration.data?.[0].adult_declaration_version).toBe('18-plus-v1');
      expect(!!declaration.data?.[0].adult_declared_at).toBe(true);
      expect(declaration.data?.[0].onboarding_complete).toBe(true);
      sql(`begin; insert into public.characters(id,name,age,gender,status) values('${castId}','Stage 8 test character',25,'man','published');
        insert into public.conversations(id,user_id,character_id) values('${ca}','${idA}','${castId}'),('${cb}','${idB}','${castId}');
        insert into public.messages(conversation_id,sequence,role,kind,text) values('${ca}',1,'user','text','A test message'),('${cb}',1,'user','text','B test message');
        insert into public.memories(user_id,character_id,content,consent) values('${idA}','${castId}','A test memory','explicit'),('${idB}','${castId}','B test memory','explicit');
        insert into public.payment_intents(user_id,conversation_id,character_id,amount_minor,reference,idempotency_key,recipient_disclosure) values('${idA}','${ca}','${castId}',100,'${run}-a','${run}-a','Test operator'),('${idB}','${cb}','${castId}',100,'${run}-b','${run}-b','Test operator');
        insert into public.reports(reporter_id,target_kind,target_id,reason) values('${idA}','character','${castId}','Test'),('${idB}','character','${castId}','Test'); commit;`);
      for (const table of ['profiles', 'conversations', 'messages', 'memories', 'payment_intents', 'reports']) {
        for (const actor of [cauth, bauth]) { const read = await actor.from(table).select('id'); expect(read.error).toBeNull(); expect(read.data?.length, `${table}: one owned row`).toBe(1); }
      }
      const other = await cauth.from('conversations').select('id').eq('id', cb); expect(other.data?.length).toBe(0);
      const anon = await client().from('profiles').select('id'); expect(!!anon.error).toBe(true);
      const update = await cauth.from('profiles').update({ onboarding_complete: true }).eq('id', idB); expect(!!update.error).toBe(true);
      const privateRead = await cauth.schema('private').from('user_roles').select('role'); expect(!!privateRead.error).toBe(true);
      await cauth.auth.updateUser({ data: { role: 'admin' } });
      expect((await cauth.rpc('is_admin')).data).toBe(false);
    });
    await test.step('preference changes survive refresh and expose conflict safely', async () => {
      await pa.goto('/settings/preferences');
      await pa.getByLabel('Preferred name').fill('Stage eight updated');
      await pa.getByRole('checkbox', { name: 'Allow optional monetary requests' }).check();
      await pa.getByRole('button', { name: 'Save preferences' }).click();
      await expect.poll(async () => (await cauth.from('profiles').select('display_name').single()).data?.display_name).toBe('Stage eight updated');
      await pa.reload(); await expect(pa.getByLabel('Preferred name')).toHaveValue('Stage eight updated');
      await expect(pa.getByRole('checkbox', { name: 'Allow optional monetary requests' })).toBeChecked();
      const conflict = await cauth.rpc('save_preferences', { p_name: 'Stale', p_genders: ['man'], p_language: 'english', p_requests: false, p_version: 1 }); expect(!!conflict.error).toBe(true);
      expect((await bauth.from('profiles').select('display_name').single()).data?.display_name).toBe('Stage eight B');
      expect(await pa.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await pa.screenshot({ path: 'docs/reviews/stage-8/preferences-connected-390.png', fullPage: true });
    });
    await test.step('only a trusted role can enter administration', async () => {
      await pa.goto('/admin'); await expect(pa.getByText('Administrator access required')).toBeVisible();
      sql(`insert into private.user_roles(user_id,role) values('${idA}','admin');`);
      await pa.reload(); await expect(pa.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();
      await pb.goto('/admin'); await expect(pb.getByText('Administrator access required')).toBeVisible();
    });
    await test.step('expired local session state refreshes through Auth and invalid refresh credentials fail closed', async () => {
      await expireBrowserSession(a);
      await pa.goto('/discover'); await expect(pa.getByRole('heading', { level: 1 })).toHaveText('Welcome, Stage eight updated.');
      const refreshed = await cauth.auth.refreshSession(); expect(refreshed.error).toBeNull(); expect(refreshed.data.user?.id).toBe(idA);
      expect((await a.cookies()).filter(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name)).every(cookie => cookie.httpOnly)).toBe(true);
      await expireBrowserSession(b, true);
      await pb.goto('/discover'); await expect(pb).toHaveURL(/\/sign-in$/);
      await signIn(pb, emailB); await expect(pb).toHaveURL(/\/discover$/);
    });
    await test.step('recovery requires a verified, user-bound recovery flow', async () => {
      await pa.goto('/recover/complete');
      await pa.getByLabel('Password', { exact: true }).fill(password);
      await pa.getByLabel('Confirm password').fill(password);
      await pa.getByRole('button', { name: 'Save new password' }).click();
      await expect(pa.locator('main').getByRole('alert')).toContainText('recovery link has expired');
      await pa.goto('/recover'); await pa.getByLabel('Email address').fill(emailA);
      await pa.getByRole('button', { name: 'Send recovery link' }).click();
      await expect(pa.locator('main').getByRole('status')).toContainText('If an account matches that email');
      const recovery = await emailLink(emailA, 'recovery');
      try { await pa.goto(recovery); } catch { throw new Error('The local recovery link could not be opened.'); }
      await expect(pa).toHaveURL(/\/recover\/complete$/);
      const cookie = (await a.cookies()).find(c => c.name === 'ts-recovery'); expect(!!cookie?.httpOnly).toBe(true);
      await b.addCookies([{ name: 'ts-recovery', value: cookie!.value, url: 'http://localhost:3102' }]);
      await pb.goto('/recover/complete');
      await pb.getByLabel('Password', { exact: true }).fill(password);
      await pb.getByLabel('Confirm password').fill(password);
      await pb.getByRole('button', { name: 'Save new password' }).click();
      await expect(pb.locator('main').getByRole('alert')).toContainText('recovery link has expired');
      const fresh = `New!${randomUUID()}Aa9`;
      await pa.getByLabel('Password', { exact: true }).fill(fresh);
      await pa.getByLabel('Confirm password').fill(fresh);
      await pa.getByRole('button', { name: 'Save new password' }).click();
      await expect(pa).toHaveURL(/\/sign-in$/);
      await signIn(pa, emailA, fresh); await expect(pa).toHaveURL(/\/discover$/);
      try { await pa.goto(recovery); } catch { throw new Error('The reused recovery link check could not be opened.'); }
      await expect(pa).toHaveURL(/\/auth\/error$/);
      try { await pa.goto(confirmation); } catch { throw new Error('The reused confirmation link check could not be opened.'); }
      await expect(pa).toHaveURL(/\/auth\/error$/);
      await pa.goto('/recover'); await pa.getByLabel('Email address').fill(emailA);
      await pa.getByRole('button', { name: 'Send recovery link' }).click();
      await expect(pa.locator('main').getByRole('status')).toContainText('If an account matches that email');
      const expiredRecovery = await emailLink(emailA, 'recovery');
      sql(`update auth.users set recovery_sent_at=now()-interval '2 hours' where id='${idA}';`);
      try { await pa.goto(expiredRecovery); } catch { throw new Error('The expired recovery link check could not be opened.'); }
      await expect(pa).toHaveURL(/\/auth\/error$/);
      await pa.goto('/discover'); await pa.getByRole('button', { name: 'Sign out', exact: true }).click();
      await expect(pa).toHaveURL(/\/sign-in$/); await pa.goto('/discover'); await expect(pa).toHaveURL(/\/sign-in$/);
    });
    await test.step('a backup restores identities, ownership, roles and RLS into an isolated database', async () => {
      const container = 'supabase_db_talking_stage';
      const target = `stage8_restore_${run.replaceAll('-', '_')}`;
      if (!/^stage8_restore_[a-f0-9_]+$/.test(target)) throw new Error('Invalid disposable restore database name');
      const dump = execFileSync('docker', ['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--format=custom', '--schema=auth', '--schema=public', '--schema=private', '--no-owner'], { windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
      mkdirSync('.local-backups', { recursive: true });
      writeFileSync(`.local-backups/stage8-${run}.dump`, dump, { mode: 0o600 });
      const restored = execFileSync(process.execPath, ['scripts/test-local-restore.mjs', `.local-backups/stage8-${run}.dump`], { encoding: 'utf8', windowsHide: true });
      expect(restored).toContain('Local restore passed');

    });
    await test.step('a duplicate signup receives safe confirmation guidance', async () => {
      const duplicate = await browser.newContext(); const page = await duplicate.newPage();
      try {
        await page.goto('/onboarding/age'); await page.getByRole('checkbox', { name: 'I am 18 or older' }).check();
        await page.getByRole('button', { name: 'Continue', exact: true }).click(); await expect(page).toHaveURL(/\/register$/);
        await page.getByLabel('Email address').fill(emailA); await page.getByLabel('Password', { exact: true }).fill(password);
        await page.getByRole('checkbox', { name: /I accept the terms/ }).check(); await page.getByRole('button', { name: 'Create account', exact: true }).click();
        await expect(page.locator('main').getByRole('status')).toContainText('If you already have an account');
      } finally { await duplicate.close(); }
    });
    expect(errors).toEqual([]);
  } finally {
    // Remove only this run's synthetic records, never reset the whole database.
    sql(`begin; delete from public.reports where target_id='${castId}';
      delete from public.memories where character_id='${castId}';
      delete from public.messages where conversation_id in ('${ca}','${cb}');
      delete from public.payment_intents where character_id='${castId}';
      delete from public.conversations where character_id='${castId}';
      delete from public.characters where id='${castId}';
      delete from auth.users where email in ('${emailA}','${emailB}'); commit;`);
    await a.close(); await b.close();
  }
});

test('local Auth throttles repeated attempts and provider outage gives a safe retry message', async ({ page }) => {
  test.setTimeout(180000);
  const auth = client(); const email = `stage8-throttle-${randomUUID()}@example.test`;
  let limited = false;
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      const result = await auth.auth.signInWithPassword({ email, password });
      if (result.error?.status === 429) { limited = true; break; }
    }
    expect(limited, 'Configured provider sign-in limit returns 429').toBe(true);
    await signIn(page, email);
    await expect(page.locator('main').getByRole('alert')).toContainText('Too many attempts');
    execFileSync('docker', ['stop', 'supabase_auth_talking_stage'], { windowsHide: true });
    await signIn(page, email);
    await expect(page.locator('main').getByRole('alert')).toContainText('Account services are unavailable');
  } finally {
    // Restore the test-owned provider and clear the temporary test throttle.
    execFileSync('docker', ['restart', 'supabase_auth_talking_stage'], { windowsHide: true });
    await expect.poll(async () => {
      try { return (await fetch(`${endpoint}/auth/v1/health`, { headers: { apikey: key } })).ok; } catch { return false; }
    }, { timeout: 30000 }).toBe(true);
  }
});
