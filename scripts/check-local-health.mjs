import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const app = new URL(process.env.TALKINGSTAGE_SITE_URL);
const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
for (const url of [app, backend]) assert(['127.0.0.1', 'localhost'].includes(url.hostname), 'Local health checks require loopback services');

async function check(work) {
  const started = performance.now();
  try { return { ok: !!await work(), durationMs: Math.round(performance.now() - started) }; }
  catch { return { ok: false, durationMs: Math.round(performance.now() - started) }; }
}
const client = createClient(backend.origin, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const [application, authentication, database] = await Promise.all([
  check(async () => {
    const response = await fetch(new URL('/api/health', app), { signal: AbortSignal.timeout(5000), redirect: 'error' });
    return response.ok && (await response.json()).status === 'ok';
  }),
  check(async () => (await fetch(new URL('/auth/v1/health', backend), { signal: AbortSignal.timeout(5000), redirect: 'error' })).ok),
  check(async () => !(await client.from('characters').select('id').limit(1).abortSignal(AbortSignal.timeout(5000))).error),
]);
// Never print raw responses, request URLs, keys, rows or exceptions.
console.log(JSON.stringify({ time: new Date().toISOString(), application, authentication, database }));
if (![application, authentication, database].every(value => value.ok)) process.exitCode = 1;
