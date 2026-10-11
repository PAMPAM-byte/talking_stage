import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { create, restoreCheck, query, syncLedger, store } from './hosted-backups.mjs';
import { uuid } from './lib/local-backup-store.mjs';

assert(process.argv.length === 2 || (process.argv.length === 4 && process.argv[2] === '--cleanup' && uuid(process.argv[3])), 'Use no arguments for a rehearsal, or --cleanup RUN_UUID.');

const target = 'https://hoxeembcwureucdsssct.supabase.co';
const env = parseEnv(await readFile('.env.hosted.local', 'utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, target);
assert.equal(env.TALKINGSTAGE_AI_ENABLED, 'false');
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) } };
const service = createClient(target, env.SUPABASE_SERVICE_ROLE_KEY, options);
const cleanupRun = process.argv[2] === '--cleanup' ? process.argv[3] : null;
assert(!cleanupRun || uuid(cleanupRun));
const run = cleanupRun ?? randomUUID(), password = `Ts!${randomUUID()}Aa9`;
const root = '.local-services/hosted-privacy';
await mkdir(root, { recursive: true });
const manifestPath = join(root, `test-${run}.json`), lockPath = join(root, 'privacy-test.lock');
await writeFile(lockPath, 'locked', { flag: 'wx', mode: 0o600 });
const users = [];
if (cleanupRun) {
  const prior = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(prior.run, cleanupRun);
  for (const user of prior.users) {
    assert(uuid(user.id));
    const slot = ['a', 'b'].find(value => user.email === `hosted-privacy-${run}-${value}@example.test`);
    assert(slot); users.push({ ...user, slot });
  }
}
let snapshot, phase = 'preflight', completed = false, cleanupComplete = true;
const check = result => { if (result.error) throw new Error('Hosted synthetic operation failed.'); return result.data; };
const last = rows => { assert(rows.length); return rows.at(-1); };
async function checkpoint() {
  await writeFile(manifestPath, JSON.stringify({ version: 1, run, phase, users: users.map(({ id, email }) => ({ id, email })), backupId: snapshot?.id, completed, cleanupComplete }, null, 2), { mode: 0o600 });
}
async function signIn(user) {
  const result = check(await user.client.auth.signInWithPassword({ email: user.email, password }));
  assert.equal(result.user.id, user.id);
  user.refreshToken = result.session.refresh_token;
  const claims = JSON.parse(Buffer.from(result.session.access_token.split('.')[1], 'base64url').toString());
  assert.equal(claims.sub, user.id); assert(Number.isInteger(claims.iat));
  // Only the verified session's UUID/time/role go into SQL; never its token.
  return JSON.stringify({ sub: user.id, iat: claims.iat, role: 'authenticated' });
}
function inventorySql(user) {
  assert(uuid(user.id) && uuid(user.message) && uuid(user.conversation) && uuid(user.report));
  return `select json_build_object(
    'users',(select count(*) from auth.users where id='${user.id}'),
    'sessions',(select count(*) from auth.sessions where user_id='${user.id}'),
    'profiles',(select count(*) from public.profiles where id='${user.id}'),
    'conversations',(select count(*) from public.conversations where user_id='${user.id}'),
    'messages',(select count(*) from public.messages where id='${user.message}'),
    'memories',(select count(*) from public.memories where user_id='${user.id}'),
    'memoryPreferences',(select count(*) from public.memory_preferences where user_id='${user.id}'),
    'reports',(select count(*) from public.reports where reporter_id='${user.id}'),
    'evidence',(select count(*) from private.report_context where report_id='${user.report}'),
    'jobs',(select count(*) from private.reply_jobs where conversation_id='${user.conversation}'),
    'journal',(select count(*) from privacy_guard.account_erasures where actor_id='${user.id}')
  ) as inventory;`;
}
function assertErased(counts) {
  for (const [key, value] of Object.entries(counts)) if (key !== 'journal') assert.equal(value, 0, `Erasure failed for ${key}.`);
}
function deletionSql(user, claims, confirmation = 'DELETE') {
  assert(users.includes(user) && uuid(user.id) && user.email === `hosted-privacy-${run}-${user.slot}@example.test`);
  assert(['DELETE', 'delete'].includes(confirmation));
  return `begin;
    do $$begin if not exists(select 1 from auth.users where id='${user.id}' and email='${user.email}') then raise exception 'fixture_owner_mismatch';end if;end$$;
    update private.privacy_configuration set account_deletion_enabled=true where singleton;
    set local role authenticated;
    select set_config('request.jwt.claims','${claims}',true);
    select public.delete_own_account('${confirmation}');
    reset role;
    update private.privacy_configuration set account_deletion_enabled=false where singleton;
    ${inventorySql(user)}
    commit;`;
}
try {
  if (!cleanupRun) {
  const baseline = last(await query("select json_build_object('deletion',(select account_deletion_enabled from private.privacy_configuration where singleton),'ai',(select enabled from private.ai_configuration where singleton),'cast',(select count(*) from public.character_assets)) as state;")).state;
  assert.equal(baseline.deletion, false); assert.equal(baseline.ai, false);
  const character = check(await service.from('characters').select('id').eq('status', 'published').limit(1))[0]?.id;
  assert(uuid(character));
  phase = 'creating-fixtures'; await checkpoint();
  for (const slot of ['a', 'b']) {
    const email = `hosted-privacy-${run}-${slot}@example.test`;
    const id = check(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1' } })).user.id;
    assert(uuid(id));
    const user = { id, email, slot, client: createClient(target, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options) };
    users.push(user); await checkpoint();
    await signIn(user);
    check(await user.client.rpc('save_preferences', { p_name: 'Synthetic privacy test', p_genders: ['woman'], p_language: 'english', p_requests: false, p_version: 1 }));
    check(await user.client.rpc('complete_onboarding', { p_version: 2, p_consent: true }));
    user.conversation = check(await user.client.rpc('start_conversation', { p_character: character }));
    user.message = check(await user.client.rpc('save_user_message', { p_conversation: user.conversation, p_client_id: randomUUID(), p_generation: 1, p_text: 'Synthetic hosted privacy fixture' })).id;
    check(await user.client.rpc('manage_memory', { p_character: character, p_operation: 'enable' }));
    check(await user.client.rpc('manage_memory', { p_character: character, p_operation: 'save', p_content: 'Synthetic hosted memory fixture', p_consent: true }));
    user.report = check(await user.client.rpc('submit_report', { p_kind: 'message', p_target: user.message, p_reason: 'Other', p_details: 'Synthetic hosted privacy evidence', p_operation: randomUUID() })).id;
    const before = last(await query(inventorySql(user))).inventory;
    user.before = before;
    for (const key of ['users', 'sessions', 'profiles', 'conversations', 'messages', 'memories', 'memoryPreferences', 'reports', 'evidence', 'jobs']) assert(before[key] > 0, `Missing fixture: ${key}.`);
    assert.equal(before.journal, 0);
  }
  const [erased, other] = users;
  assert.equal(check(await erased.client.rpc('account_deletion_status')), false);
  const disabled = await erased.client.rpc('delete_own_account', { p_confirmation: 'DELETE' });
  assert(disabled.error && disabled.error.message.includes('deletion_unavailable'));
  console.log('Hosted disposable fixtures created; general-user deletion gate verified disabled.');
  phase = 'pre-deletion-backup'; await checkpoint();
  snapshot = await create(); await checkpoint();
  phase = 'deletion'; await checkpoint();
  const claims = await signIn(erased);
  await assert.rejects(query(deletionSql(erased, claims, 'delete')));
  assert.equal(last(await query(inventorySql(erased))).inventory.journal, 0);
  await query(deletionSql(erased, claims));
  const gone = last(await query(inventorySql(erased))).inventory;
  assertErased(gone); assert.equal(gone.journal, 1);
  assert.equal(check(await other.client.from('messages').select('id').eq('id', other.message)).length, 1);
  assert.deepEqual(last(await query(inventorySql(other))).inventory, other.before);
  const oldSession = await erased.client.rpc('has_adult_access');
  assert(oldSession.error || oldSession.data === false);
  const login = await erased.client.auth.signInWithPassword({ email: erased.email, password });
  assert(login.error && !login.data.session);
  assert(login.error.status >= 400 && login.error.status < 500, 'Expected an Auth rejection, not a dependency outage.');
  const refresh = await erased.client.auth.refreshSession({ refresh_token: erased.refreshToken });
  assert(refresh.error && !refresh.data.session);
  assert(refresh.error.status >= 400 && refresh.error.status < 500, 'Expected a refresh rejection, not a dependency outage.');
  console.log('Hosted deletion passed: Auth/session/profile/chat/memory/report evidence removed; other account preserved and old sign-in/refresh denied.');
  phase = 'isolated-restore'; await checkpoint();
  await restoreCheck(snapshot.id, ({ query: restoredQuery, records, phase: restorePhase }) => {
    assert(records.some(record => record.actorId === erased.id));
    const counts = JSON.parse(restoredQuery(inventorySql(erased)));
    if (restorePhase === 'before-replay') {
      for (const key of ['users', 'profiles', 'messages', 'memories', 'reports', 'evidence']) assert(counts[key] > 0, `Pre-deletion snapshot missing ${key}.`);
    } else {
      assertErased(counts);
      assert.equal(restoredQuery(`select count(*) from auth.users where id='${other.id}';`), '1');
      assert.equal(restoredQuery(`select count(*) from public.messages where id='${other.message}';`), '1');
      assert.deepEqual(JSON.parse(restoredQuery(inventorySql(other))), other.before);
      assert.equal(restoredQuery(`set role authenticated;select set_config('request.jwt.claims','${claims}',false);select public.has_adult_access();reset role;`).split(/\r?\n/).at(-2), 'f');
    }
  });
  const state = last(await query("select json_build_object('deletion',(select account_deletion_enabled from private.privacy_configuration where singleton),'ai',(select enabled from private.ai_configuration where singleton),'cast',(select count(*) from public.character_assets)) as state;")).state;
  assert.deepEqual(state, baseline);
  completed = true; phase = 'passed'; await checkpoint();
  console.log('Hosted-origin restore suppression passed: historical data existed in the snapshot, deletion replay removed it and preserved the other account. Launch gates remain disabled.');
  } else { phase = 'cleanup-recovery'; }
} catch (error) {
  const category = error.code === 'ERR_ASSERTION' ? 'invariant check' : /^Hosted (database export|TLS certificate validation|pooler connection|database export access|backup dependency request|synthetic operation)/.exec(error.message ?? '')?.[1] ?? 'operation';
  console.error(`Hosted privacy test failed during ${phase} (${category}); sensitive diagnostics suppressed.`);
  process.exitCode = 1;
} finally {
  try {
    // Recover a successful Auth create whose response/checkpoint was interrupted.
    // Discovery is limited to this run's two exact synthetic email addresses.
    const discovered = await query(`select id,email from auth.users where email in('hosted-privacy-${run}-a@example.test','hosted-privacy-${run}-b@example.test');`);
    for (const user of discovered) {
      assert(uuid(user.id));
      const slot = ['a', 'b'].find(value => user.email === `hosted-privacy-${run}-${value}@example.test`);
      assert(slot);
      if (!users.some(value => value.id === user.id)) users.push({ ...user, slot });
    }
  } catch { cleanupComplete = false; process.exitCode = 1; }
  for (const user of users) {
    try {
      assert(uuid(user.id) && user.email === `hosted-privacy-${run}-${user.slot}@example.test`);
      // Cleanup is bounded to this run's synthetic UUID/email pair, including
      // a journal entry so its historical test snapshot cannot revive it later.
      await query(`begin;
        do $$begin if exists(select 1 from auth.users where id='${user.id}' and email is distinct from '${user.email}') then raise exception 'fixture_owner_mismatch';end if;end$$;
        delete from private.summary_reservations where actor_id='${user.id}';
        delete from private.ai_reservations where actor_id='${user.id}';
        delete from private.conversation_summaries where conversation_id in(select id from public.conversations where user_id='${user.id}');
        delete from private.reply_jobs where conversation_id in(select id from public.conversations where user_id='${user.id}');
        delete from public.memories where user_id='${user.id}';
        delete from public.memory_preferences where user_id='${user.id}';
        delete from private.report_resolutions where report_id in(select id from public.reports where reporter_id='${user.id}');
        delete from public.reports where reporter_id='${user.id}';
        delete from public.messages where conversation_id in(select id from public.conversations where user_id='${user.id}');
        delete from public.conversations where user_id='${user.id}';
        delete from auth.users where id='${user.id}';
        insert into privacy_guard.account_erasures(actor_id) values('${user.id}') on conflict(actor_id) do nothing;
        select not exists(select 1 from auth.users where id='${user.id}') as cleaned;
        commit;`);
      const cleaned = last(await query(`select not exists(select 1 from auth.users where id='${user.id}') as cleaned;`)).cleaned;
      assert.equal(cleaned, true);
    } catch (error) { cleanupComplete = false; process.exitCode = 1; console.error(error.code === 'ERR_ASSERTION' ? 'Synthetic cleanup verification did not confirm success.' : 'Synthetic cleanup transport/SQL failed; no sensitive diagnostics logged.'); }
  }
  try {
    await syncLedger();
    if (snapshot && cleanupComplete && completed) for (const extension of ['dump', 'json']) await unlink(join(store.root, `${snapshot.id}.${extension}`));
  } catch { cleanupComplete = false; process.exitCode = 1; }
  await checkpoint(); await unlink(lockPath);
  console.log(cleanupComplete ? 'Disposable hosted fixtures removed and deletion ledger synchronized.' : 'Synthetic cleanup needs operator review; private checkpoint retained.');
}
