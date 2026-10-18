import assert from 'node:assert/strict';
import { allowsDevelopmentTestLogin, developmentTestCredentials } from '../lib/backend/development-test-login.mjs';

const access = { nodeEnv: 'development', enabled: '1', host: 'localhost:3000', siteUrl: 'http://localhost:3000', origin: 'http://localhost:3000' };
const backend = 'https://synthetic-project.supabase.co';
const credentials = { url: backend, email: 'tester@talkingstage.example', password: 'SYNTHETIC-NOT-A-REAL-PASSWORD' };
assert(allowsDevelopmentTestLogin(access));
assert(allowsDevelopmentTestLogin({ ...access, host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' }));
assert(allowsDevelopmentTestLogin({ ...access, origin: null }), 'Server rendering can check availability without a POST origin.');
let reads = 0;
const read = async () => { reads++; return JSON.stringify(credentials); };
for (const override of [{ nodeEnv: 'production' }, { nodeEnv: 'test' }, { enabled: '0' }, { enabled: undefined }, { host: 'example.com:3000' }, { origin: 'https://evil.example' }, { origin: 'http://localhost:3001' }, { origin: 'https://localhost:3000' }, { host: 'localhost:3000/path' }, { siteUrl: 'https://public.example' }, { siteUrl: 'http://localhost:3001' }]) {
    assert.equal(await developmentTestCredentials({ ...access, ...override }, backend, read), null);
}
assert.equal(reads, 0, 'Denied requests must not even read credentials.');
assert.deepEqual(await developmentTestCredentials(access, backend, read), { email: credentials.email, password: credentials.password });
assert.equal(await developmentTestCredentials(access, 'https://another-project.supabase.co', read), null, 'Never use credentials for a different backend.');
assert.equal(await developmentTestCredentials(access, backend, async () => JSON.stringify({ ...credentials, email: 'real-user@example.test' })), null);
assert.equal(await developmentTestCredentials(access, backend, async () => '{malformed'), null);
assert.equal(await developmentTestCredentials(access, backend, async () => { throw new Error('SYNTHETIC PRIVATE PATH'); }), null);
console.log('Development test login passed: dev opt-in, loopback/same-origin and project/account checks, denial before reading credentials, and private/malformed-file failure handling. No network calls.');
