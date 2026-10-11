import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { probe, backupHealth } from './lib/hosted-health.mjs';

try {
  const env = parseEnv(await readFile('.env.hosted.local', 'utf8'));
  const target = 'https://hoxeembcwureucdsssct.supabase.co';
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, target);
  assert(env.SUPABASE_SERVICE_ROLE_KEY);
  const fetchBounded = (input, init = {}) => fetch(input, {
    ...init, redirect: 'error', signal: AbortSignal.any([AbortSignal.timeout(8000), ...(init.signal ? [init.signal] : [])]),
  });
  const client = createClient(target, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchBounded },
  });
  const [authentication, database, photos, backups] = await Promise.all([
    probe(async () => {
      const response = await fetchBounded(`${target}/auth/v1/settings`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY } });
      const healthy = response.ok && typeof (await response.json()).disable_signup === 'boolean';
      await response.body?.cancel().catch(() => {});
      return healthy;
    }),
    probe(async () => {
      const result = await client.from('characters').select('id').eq('status', 'published').limit(1);
      return !result.error && result.data.length === 1;
    }),
    probe(async () => {
      const bucket = await client.storage.getBucket('cast-private');
      assert(!bucket.error && bucket.data.public === false);
      const assets = await client.from('character_assets').select('storage_path,source_hash').eq('published', true).eq('review_state', 'approved').order('id').limit(1);
      assert(!assets.error && assets.data.length === 1);
      const asset = assets.data[0];
      assert(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/original\.webp$/.test(asset.storage_path));
      for (const variant of ['original', '640']) {
        const response = await client.storage.from('cast-private').download(asset.storage_path.replace('original', variant));
        assert(!response.error);
        const bytes = Buffer.from(await response.data.arrayBuffer());
        assert(bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP');
        if (variant === 'original') assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.source_hash);
      }
      // Public access must stay denied; do not create signed URLs or expose paths.
      const anonymous = await fetchBounded(`${target}/storage/v1/object/public/cast-private/${asset.storage_path}`);
      await anonymous.body?.cancel();
      return [400, 401, 403, 404].includes(anonymous.status);
    }),
    (async () => {
      try { return backupHealth(JSON.parse(await readFile('.local-services/hosted-privacy/scheduled-backup.json', 'utf8'))); }
      catch (error) { return { ok: false, state: error.code === 'ENOENT' ? 'missing' : 'invalid', ageHours: null }; }
    })(),
  ]);
  console.log(JSON.stringify({ time: new Date().toISOString(), authentication, database, photos, backups }));
  if (![authentication, database, photos, backups].every(value => value.ok)) process.exitCode = 1;
} catch {
  console.error('Hosted health check could not start. Check private hosted configuration; credentials and exception details suppressed.');
  process.exitCode = 1;
}
