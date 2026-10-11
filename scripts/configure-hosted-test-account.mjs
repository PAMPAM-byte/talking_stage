import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';

const env = parseEnv(await readFile('.env.hosted.local', 'utf8'));
const url = 'https://hoxeembcwureucdsssct.supabase.co';
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, url);
await mkdir('.local-services/hosted-cast', { recursive: true });
const path = '.local-services/hosted-cast/test-account.json';
let credentials;
try { credentials = JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
credentials ??= { url, email: 'tester@talkingstage.example', password: `Ts!${randomUUID()}Aa9` };
assert.equal(credentials.url, url); assert.equal(credentials.email, 'tester@talkingstage.example');
// Save privately before registration so an interrupted response can be resolved
// by password sign-in; never reset an unrelated existing account.
await writeFile(path, JSON.stringify(credentials, null, 2));
async function call(path, body, token) {
  const response = await fetch(url + path, { method: 'POST', headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Hosted test account operation failed: HTTP ${response.status}; no credentials logged.`);
  return data;
}
let session;
try { session = await call('/auth/v1/token?grant_type=password', { email: credentials.email, password: credentials.password }); }
catch (error) {
  // Only an actual invalid-credentials response authorizes creating the fixture.
  if (!error.message.includes('HTTP 400')) throw error;
  session = await call('/auth/v1/signup', { email: credentials.email, password: credentials.password, data: { adult_declaration: '18-plus-v1', synthetic_hosted_test_account: true } });
}
assert(session.access_token && session.user?.id);
if (credentials.id) assert.equal(credentials.id, session.user.id);
credentials.id = session.user.id;
await writeFile(path, JSON.stringify(credentials, null, 2));
await writeFile('.local-services/hosted-cast/test-login.txt', `Hosted development test account\nEmail: ${credentials.email}\nPassword: ${credentials.password}\n\nSign in through the normal application form and complete preferences if prompted. This is a synthetic testing account; remove it before pilot/public access. Do not commit or share this file.\n`);
console.log('Hosted test account verified. Login details saved privately in .local-services/hosted-cast/test-login.txt; onboarding uses the normal application flow.');
