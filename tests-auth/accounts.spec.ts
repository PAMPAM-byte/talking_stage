import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const inboxPort = readFileSync('supabase/config.toml','utf8').match(/\[local_smtp\][\s\S]*?^port\s*=\s*(\d+)/m)?.[1];
if (!inboxPort) throw new Error('Local email test port is missing from Supabase configuration.');
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const password = `Ts!${randomUUID()}Aa9`;
const run = randomUUID();
const emailA = `stage8-a-${run}@example.test`;
const emailB = `stage8-b-${run}@example.test`;
const castId = randomUUID(); const ca = randomUUID(); const cb = randomUUID();
const uploadedPaths: string[] = [];
const client = () => createClient(endpoint, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
function sql(query: string) {
  return execFileSync('docker', ['exec', '-i', 'supabase_db_talking_stage', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: query, encoding: 'utf8', windowsHide: true }).trim();
}
async function emailLink(email: string, purpose: string) {
  let link = '';
  await expect.poll(async () => {
    const response = await fetch(`http://127.0.0.1:${inboxPort}/view/latest.html?query=${encodeURIComponent(`to:${email}`)}`);
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
  await expect(page.getByText(`Welcome, ${name}.`, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Welcome, ${name}.`, { exact: true })).toBeVisible();
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
    await register(pa, emailA, 'Stage eight A');
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
    await test.step('administrator cast drafts persist privately and reject ordinary-user mutations', async () => {
      await pa.goto('/admin/characters/new');
      await pa.getByLabel('Name', { exact: true }).fill(`Stage9 ${run}`.slice(0, 40));
      await pa.getByLabel('Age', { exact: true }).fill('26');
      await pa.getByLabel('Fictional location').fill('Lagos');
      await pa.getByLabel('Occupation').fill('Designer');
      await pa.getByLabel('Biography').fill('A synthetic fictional adult used for integration checks.');
      await pa.getByLabel('Conversation clue').fill('What music is on your mind?');
      await pa.getByLabel('Interests', { exact: true }).fill('Music, Art');
      await pa.getByLabel('Personality', { exact: true }).fill('Warm, Curious');
      await pa.getByLabel('Private character direction').fill('SYNTHETIC PRIVATE STAGE9 DIRECTION');
      await pa.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(pa).toHaveURL(/\/admin\/characters\/[a-f0-9-]{36}$/);
      const draftId = pa.url().split('/').pop()!;
      await pa.reload(); await expect(pa.getByLabel('Private character direction')).toHaveValue('SYNTHETIC PRIVATE STAGE9 DIRECTION');
      const denied = await bauth.rpc('admin_list_cast'); expect(!!denied.error).toBe(true);
      expect((await bauth.from('characters').select('id').eq('id', draftId)).data).toEqual([]);
      await pa.getByLabel('Biography').fill('An updated synthetic biography.');
      await pa.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(pa.getByRole('status')).toContainText('Draft saved');
      await pa.reload(); await expect(pa.getByLabel('Biography')).toHaveValue('An updated synthetic biography.');
      await pa.setViewportSize({ width: 390, height: 844 });
      expect(await pa.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      mkdirSync('docs/reviews/stage-9', { recursive: true });
      await pa.screenshot({ path: 'docs/reviews/stage-9/cast-draft-390.png', fullPage: true, caret:'initial' });
      await pa.goto(`/admin/assets?character=${draftId}`);
      await pa.getByLabel('Character',{exact:true}).selectOption(draftId);
      await pa.getByLabel('Photo description').fill('Synthetic invalid file');
      await pa.getByLabel('Image file').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
      await pa.getByRole('button',{name:'Upload photo',exact:true}).click();
      await expect(pa.getByText(/Choose a valid still JPEG/)).toBeVisible();
      await expect(pa.getByRole('button',{name:'Upload photo',exact:true})).toBeEnabled();
      const uploadFailures=await cauth.rpc('admin_list_audit',{p_outcome:'failed'});
      expect(uploadFailures.data.events.some((event:{reason:string})=>event.reason==='inspection_failed')).toBe(true);
      const image = await sharp({create:{width:500,height:600,channels:3,background:'#682447'}}).png().toBuffer();
      for (const slot of ['portrait','gallery']) {
        await pa.getByLabel('Character', {exact:true}).selectOption(draftId);
        await pa.getByLabel('Photo type').selectOption(slot);
        await pa.getByLabel('Photo description').fill(`Synthetic ${slot}`);
        await pa.getByLabel('Image file').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:image});
        await pa.getByRole('button',{name:'Upload photo',exact:true}).click();
        await expect.poll(async () => (await cauth.rpc('admin_list_assets',{p_character:draftId})).data?.length).toBe(slot==='portrait'?1:2);
        await expect(pa.getByRole('button',{name:'Upload photo',exact:true})).toBeEnabled();
        const currentAssets = (await cauth.rpc('admin_list_assets',{p_character:draftId})).data as {storage_path:string}[];
        for (const asset of currentAssets) {
          const prefix=asset.storage_path.replace('original.webp','');
          for (const name of ['original','320','640','1280']) if(!uploadedPaths.includes(`${prefix}${name}.webp`)) uploadedPaths.push(`${prefix}${name}.webp`);
        }
      }
      const assets = (await cauth.rpc('admin_list_assets',{p_character:draftId})).data as {id:string;storage_path:string;slot:string}[];
      for (const asset of assets) {
        const card=pa.locator('.card').filter({has:pa.getByText(`Synthetic ${asset.slot}`,{exact:true})});
        await card.getByRole('checkbox',{name:/I reviewed this photo/}).check();
        await card.getByRole('button',{name:'Approve photo',exact:true}).click();
        await expect.poll(async () => (await cauth.rpc('admin_list_assets',{p_character:draftId})).data?.find((a:{id:string})=>a.id===asset.id)?.review_state).toBe('approved');
        await card.getByText('Publish photo',{exact:true}).click();
        await card.getByRole('button',{name:'Confirm publish photo'}).click();
        await expect.poll(async () => (await cauth.rpc('admin_list_assets',{p_character:draftId})).data?.find((a:{id:string})=>a.id===asset.id)?.published).toBe(true);
        expect(!!(await bauth.storage.from('cast-private').download(asset.storage_path)).error).toBe(true);
        expect((await pb.request.get(`/api/cast-assets/${asset.id}`)).status()).toBe(404);
      }
      await pa.screenshot({path:'docs/reviews/stage-9/asset-review-390.png',fullPage:true,caret:'initial'});
      await pa.goto(`/admin/characters/${draftId}/preview`);
      await expect(pa.getByRole('heading',{name:new RegExp(`^Stage9 ${run.slice(0,12)}`)})).toBeVisible();
      await expect(pa.getByText('An updated synthetic biography.')).toBeVisible();
      await expect(pa.getByLabel('Private character direction')).toHaveCount(0);
      expect(await pa.content()).not.toContain('SYNTHETIC PRIVATE STAGE9 DIRECTION');
      await pa.screenshot({path:'docs/reviews/stage-9/public-preview-390.png',fullPage:true,caret:'initial'});
      const staleCast=await cauth.rpc('admin_cast_command',{p_operation:'cast.deactivate',p_id:draftId,p_version:0});
      expect(staleCast.data?.error).toBe('conflict');
      await pa.goto(`/admin/characters/${draftId}`);
      await pa.getByRole('checkbox',{name:/I reviewed this fictional adult profile/}).check();
      await pa.getByText('Publish character',{exact:true}).click();
      await pa.getByRole('button',{name:'Confirm publish character'}).click();
      await expect.poll(async () => (await bauth.from('characters').select('id').eq('id',draftId)).data?.length).toBe(1);
      await pb.goto('/discover?gender=woman');await expect(pb.getByRole('link',{name:/Meet Stage9/})).toBeVisible();
      await pb.getByRole('link',{name:/Meet Stage9/}).click();await expect(pb).toHaveURL(new RegExp(`/characters/${draftId}$`));await expect(pb.getByText('An updated synthetic biography.')).toBeVisible();
      const delivered=await pb.request.get(`/api/cast-assets/${assets[0].id}?w=320`);expect(delivered.status()).toBe(200);expect(delivered.headers()['cache-control']).toContain('no-store');
      const anon=await browser.newContext();try {expect((await anon.request.get(`http://localhost:3102/api/cast-assets/${assets[0].id}`)).status()).toBe(401);}finally{await anon.close();}
      await pa.goto('/admin/operations');
      const controlCard=pa.locator('.card').filter({has:pa.getByRole('heading',{name:`Stage9 ${run}`.slice(0,40),exact:true})});
      await controlCard.getByRole('switch',{name:'Photos enabled'}).uncheck();
      await controlCard.getByLabel('Reason for change').fill('Synthetic photo pause');
      await controlCard.getByText('Review changes',{exact:true}).click();
      await controlCard.getByRole('button',{name:'Confirm controls'}).click();
      await expect.poll(async()=>(await bauth.rpc('effective_capabilities',{p_character:draftId})).data?.photos).toBe(false);
      await expect(controlCard.getByRole('button',{name:'Confirm controls'})).toBeEnabled();
      expect((await pb.request.get(`/api/cast-assets/${assets[0].id}`)).status()).toBe(404);
      expect((await pa.request.get(`/api/cast-assets/${assets[0].id}`)).status()).toBe(200);
      expect((await bauth.rpc('admin_list_controls')).error).not.toBeNull();
      expect((await bauth.rpc('admin_list_audit')).error).not.toBeNull();
      expect((await bauth.rpc('effective_capabilities',{p_character:draftId})).data).toEqual({chat:true,photos:false,payments:true});
      await pb.goto('/discover');await expect(pb.getByText('Photos are paused')).toBeVisible();
      expect(await pa.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
      await pa.screenshot({path:'docs/reviews/stage-9/operations-390.png',fullPage:true,caret:'initial'});
      const stale=await cauth.rpc('admin_save_controls',{p_character:draftId,p_version:0,p_chat:true,p_photos:true,p_payments:true,p_reason:'Synthetic stale edit'});
      expect(stale.data?.error).toBe('conflict');
      await pa.goto('/admin/audit?outcome=failed');await expect(pa.getByText('Reason: conflict',{exact:true}).first()).toBeVisible();
      await pa.screenshot({path:'docs/reviews/stage-9/audit-390.png',fullPage:true,caret:'initial'});
      await pa.goto('/admin/operations');
      await controlCard.getByRole('switch',{name:'Photos enabled'}).check();
      await controlCard.getByLabel('Reason for change').fill('Synthetic photo resume');
      await controlCard.getByText('Review changes',{exact:true}).click();
      await controlCard.getByRole('button',{name:'Confirm controls'}).click();
      await expect.poll(async()=>(await bauth.rpc('effective_capabilities',{p_character:draftId})).data?.photos).toBe(true);
      expect((await pb.request.get(`/api/cast-assets/${assets[0].id}`)).status()).toBe(200);
      const rejected=await cauth.rpc('admin_cast_command',{p_operation:'asset.rejected',p_id:assets.find(a=>a.slot==='portrait')!.id,p_version:3,p_attested:false,p_reason:'Synthetic rejection test'});expect(rejected.error).toBeNull();expect(rejected.data?.error).toBeUndefined();
      expect((await pb.request.get(`/api/cast-assets/${assets[0].id}`)).status()).toBe(404);
      await pb.goto(`/characters/${draftId}`);await expect(pb.getByRole('heading',{name:'Character unavailable'})).toBeVisible();
      await pa.goto(`/admin/characters/${draftId}`);
      await pa.getByText('Deactivate character', { exact: true }).click();
      await pa.getByRole('button', { name: 'Confirm deactivation' }).click();
      await expect(pa.getByRole('status')).toContainText('Character deactivated');
    });
    await test.step('expired local session state refreshes through Auth and invalid refresh credentials fail closed', async () => {
      await expireBrowserSession(a);
      await pa.goto('/discover'); await expect(pa.getByText('Welcome, Stage eight updated.',{exact:true})).toBeVisible();
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
    await test.step('a duplicate signup receives safe sign-in guidance', async () => {
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
      delete from private.admin_audit where actor_id in (select id from auth.users where email in ('${emailA}','${emailB}'));
      delete from public.memories where character_id='${castId}';
      delete from public.messages where conversation_id in ('${ca}','${cb}');
      delete from public.payment_intents where character_id='${castId}';
      delete from public.conversations where character_id='${castId}';
      delete from private.direction_history where character_id in (select character_id from private.cast_drafts where profile->>'name'='${`Stage9 ${run}`.slice(0,40)}');
      delete from private.character_direction where character_id in (select character_id from private.cast_drafts where profile->>'name'='${`Stage9 ${run}`.slice(0,40)}');
      delete from public.character_assets where character_id in (select character_id from private.cast_drafts where profile->>'name'='${`Stage9 ${run}`.slice(0,40)}');
      delete from public.characters where id='${castId}';
      delete from public.characters where id in (select character_id from private.cast_drafts where profile->>'name'='${`Stage9 ${run}`.slice(0,40)}');
      delete from auth.users where email in ('${emailA}','${emailB}'); commit;`);
    if(uploadedPaths.length) await createClient(endpoint,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('cast-private').remove(uploadedPaths);
    await a.close(); await b.close();
  }
});

test('native anonymous Auth limits cannot be bypassed with client forwarding headers', async ({ page }) => {
  test.setTimeout(180000);
  const email = `stage8-throttle-${randomUUID()}@example.test`;
  const reset = async () => {
    execFileSync('docker', ['restart', 'supabase_auth_talking_stage'], { windowsHide: true });
    await expect.poll(async () => {
      try { return (await fetch(`${endpoint}/auth/v1/health`, { headers: { apikey: key } })).ok; } catch { return false; }
    }, { timeout: 30000 }).toBe(true);
  };
  const attempt = (path: string, body: object, sequence: number) => fetch(`${endpoint}/auth/v1/${path}`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json',
      // Both values change on every request. The gateway must overwrite them.
      'X-Real-IP': `198.51.100.${sequence % 250 + 1}`, 'X-Forwarded-For': `203.0.113.${sequence % 250 + 1}` },
    body: JSON.stringify(body),
  });
  try {
    for (const [path, body] of [
      ['token?grant_type=password', { email, password }],
      ['signup', { email: 'invalid', password }],
      ['recover', { email }],
      ['verify', { token_hash: 'a'.repeat(64), type: 'signup' }],
    ] as const) {
      await test.step(`${path} returns 429 despite forged forwarding headers`, async () => {
        await reset();
        let limited = false;
        for (let count = 0; count < 45; count++) {
          const response = await attempt(path, body, count);
          await response.arrayBuffer();
          if (response.status === 429) { limited = true; break; }
          expect(response.status).toBeLessThan(500);
        }
        expect(limited, `Native anonymous limit enforced for ${path}`).toBe(true);
        const forged = await attempt(path, body, 200);
        expect(forged.status, 'Changing client IP headers cannot bypass the gateway').toBe(429);
        await forged.arrayBuffer();
      });
    }
    await reset();
    await page.goto('/sign-in');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    // Warm the route first, then exhaust the shared provider bucket.
    for (let count = 0; count < 45; count++) {
      const response = await attempt('token?grant_type=password', { email, password }, count);
      await response.arrayBuffer();
    }
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('Too many attempts');
  } finally { await reset(); }
});

test('provider outage gives a safe retry message', async ({ page }) => {
  test.setTimeout(180000);
  const email = `stage8-outage-${randomUUID()}@example.test`;
  try {
    execFileSync('docker', ['stop', 'supabase_auth_talking_stage'], { windowsHide: true });
    await signIn(page, email);
    await expect(page.locator('main').getByRole('alert')).toContainText('Account services are unavailable');
  } finally {
    // Restore the test-owned provider even if the browser assertion fails.
    execFileSync('docker', ['restart', 'supabase_auth_talking_stage'], { windowsHide: true });
    await expect.poll(async () => {
      try { return (await fetch(`${endpoint}/auth/v1/health`, { headers: { apikey: key } })).ok; } catch { return false; }
    }, { timeout: 30000 }).toBe(true);
  }
});
