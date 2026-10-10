import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (process.env.NODE_ENV === 'production' || !url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Test accounts can only be configured against local Supabase.');
}
const credentials = JSON.parse(await readFile(new URL('../lib/backend/local-test-account.json', import.meta.url), 'utf8'));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
function check(result) { if (result.error) throw result.error; return result.data; }
let existing;
for (let page = 1; ; page++) {
  const { users } = check(await admin.auth.admin.listUsers({ page, perPage: 100 }));
  existing = users.find(user => user.email === credentials.email);
  if (existing || users.length < 100) break;
}
if (existing && existing.user_metadata?.local_test_account !== true) throw new Error('The sample email belongs to an account this script did not create.');
if (existing) {
  check(await admin.auth.admin.updateUserById(existing.id, { password: credentials.password, email_confirm: true }));
} else {
  check(await admin.auth.admin.createUser({ ...credentials, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', local_test_account: true } }));
}
check(await client.auth.signInWithPassword(credentials));
let profile = check(await client.from('profiles').select('version,onboarding_complete').single());
if (!profile.onboarding_complete) {
  check(await client.rpc('save_preferences', { p_name: 'Tester', p_genders: ['man', 'woman'], p_language: 'english', p_requests: false, p_version: profile.version }));
  profile = check(await client.from('profiles').select('version,onboarding_complete').single());
  check(await client.rpc('complete_onboarding', { p_version: profile.version, p_consent: true }));
}
check(await client.auth.signOut());
const env = await readFile('.env.local', 'utf8');
const updated = /^TALKINGSTAGE_LOCAL_TEST_ACCOUNT=.*$/m.test(env)
  ? env.replace(/^TALKINGSTAGE_LOCAL_TEST_ACCOUNT=.*$/m, 'TALKINGSTAGE_LOCAL_TEST_ACCOUNT=1')
  : `${env.trimEnd()}\nTALKINGSTAGE_LOCAL_TEST_ACCOUNT=1\n`;
await writeFile('.env.local', updated, { mode: 0o600 });
console.log('Local test account ready. Email: tester@talkingstage.example | Password: TalkingStage123!');
