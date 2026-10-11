import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';

// Deliberately separate from the local publication tools and local manifests.
const target = 'https://hoxeembcwureucdsssct.supabase.co';
const hosted = parseEnv(await readFile('.env.hosted.local', 'utf8'));
let local;
try { local = parseEnv(await readFile('.env.docker.local', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; local = parseEnv(await readFile('.env.local', 'utf8')); }
assert.equal(hosted.NEXT_PUBLIC_SUPABASE_URL, target);
assert(['localhost', '127.0.0.1'].includes(new URL(local.NEXT_PUBLIC_SUPABASE_URL).hostname), 'Approved local source requires Docker configuration in .env.docker.local or .env.local.');
assert.equal(hosted.TALKINGSTAGE_AI_ENABLED, 'false');
assert.equal((await readFile('supabase/.temp/project-ref', 'utf8')).trim(), 'hoxeembcwureucdsssct');
assert(hosted.SUPABASE_SERVICE_ROLE_KEY && hosted.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const fingerprint = value => digest(JSON.stringify(canonical(value)));
const uuid = value => assert.match(value, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
const manifests = await Promise.all(['approved-cast-import', 'expanded-cast-drafts', 'photo-refresh'].map(async name => JSON.parse(await readFile(`.local-services/${name}.json`, 'utf8'))));
const owners = { ...manifests[0].characters, ...manifests[1].characters };
for (const [key, value] of Object.entries(manifests[2].characters)) owners[key] = value;
assert.equal(Object.keys(owners).length, 22);
for (const owner of Object.values(owners)) uuid(owner.id);
const quotedIds = Object.values(owners).map(owner => `'${owner.id}'`).join(',');
const sourceSql = `select coalesce(json_agg(json_build_object('id',c.id,'status',c.status,'profile',d.profile,'direction',d.direction,'assets',(select json_agg(to_jsonb(a)) from public.character_assets a where a.character_id=c.id and a.published and a.review_state='approved'))),'[]') from public.characters c join private.cast_drafts d on d.character_id=c.id where c.id in (${quotedIds});`;
const snapshot = JSON.parse(execFileSync('docker', ['exec', '-i', 'supabase_db_talking_stage', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sourceSql, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }));
assert.equal(snapshot.length, 22);
await mkdir('.local-services/hosted-cast', { recursive: true });
const plan = [];
for (const [key, owner] of Object.entries(owners)) {
  const source = snapshot.find(row => row.id === owner.id);
  assert.equal(source?.status, 'published');
  assert.equal(source.assets.length, 2);
  assert(source.profile.age >= 18);
  const photos = [];
  for (const slot of ['portrait', 'gallery']) {
    const asset = source.assets.find(row => row.slot === slot);
    assert(asset && asset.review_attested && asset.id === owner.assets[slot].id, 'Current photo differs from approved publication manifest.');
    assert.equal(asset.storage_path, `${source.id}/${asset.id}/original.webp`);
    const response = await fetch(`${local.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/cast-private/${asset.storage_path}`, { headers: { apikey: local.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${local.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(15000) });
    assert(response.ok, 'Could not retrieve approved local photo.');
    const original = Buffer.from(await response.arrayBuffer());
    assert.equal(digest(original), asset.source_hash);
    assert(original.length <= 5 * 1024 * 1024);
    const metadata = await sharp(original, { limitInputPixels: 24000000, failOn: 'warning' }).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, asset.width); assert.equal(metadata.height, asset.height);
    assert(!metadata.exif && !metadata.icc && (metadata.pages ?? 1) === 1);
    // Decode every photo before any hosted write. Preserve approved original bytes.
    await sharp(original, { limitInputPixels: 24000000, failOn: 'warning' }).raw().toBuffer();
    const variants = await Promise.all([320, 640, 1280].map(async width => ({ name: String(width), bytes: await sharp(original).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer() })));
    photos.push({ slot, asset, files: [{ name: 'original', bytes: original }, ...variants] });
  }
  plan.push({ key, profile: source.profile, direction: source.direction, hash: fingerprint({ profile: source.profile, direction: source.direction }), photos });
}
console.log('Preflight passed: 22 approved adult profiles, 44 current owned photos; all originals decoded and hashes verified.');
if (process.argv.includes('--check')) process.exit(0);
assert(process.argv.includes('--publish'), 'Use --check or --publish explicitly.');
const statePath = '.local-services/hosted-cast/state.json';
let state;
try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
state ??= { target, version: 1, characters: {} };
assert.equal(state.target, target); assert.equal(state.version, 1);
try {
  const pending = JSON.parse(await readFile(`${statePath}.tmp`, 'utf8'));
  assert.equal(pending.target, target); assert.equal(pending.version, 1);
  for (const [key, value] of Object.entries(state.characters)) assert.equal(pending.characters[key]?.id, value.id);
  state = pending;
} catch (error) { if (error.code !== 'ENOENT') throw error; }
async function save() {
  await writeFile(`${statePath}.tmp`, JSON.stringify(state, null, 2));
  for (let attempt = 0; ; attempt++) {
    try { await rename(`${statePath}.tmp`, statePath); break; }
    catch (error) { if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 10) throw error; await new Promise(resolve => setTimeout(resolve, 300)); }
  }
}
async function request(path, { body, token, service = false, method = 'POST', bytes } = {}) {
  const key = service ? hosted.SUPABASE_SERVICE_ROLE_KEY : hosted.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const response = await fetch(target + path, { method, headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, 'Content-Type': bytes ? 'image/webp' : 'application/json' }, body: bytes ?? (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(30000) });
  const data = bytes && method === 'GET' ? Buffer.from(await response.arrayBuffer()) : await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Hosted operation failed: HTTP ${response.status}; ${path.split('?')[0]}. No automatic mutation retry.`);
  if (data?.error) throw new Error(`Hosted operation rejected: ${String(data.error).slice(0, 80)}.`);
  return data;
}
function trustedSql() {
  const file = '.local-services/hosted-cast/operator.sql';
  // Caller writes this file before invoking; no credentials go into CLI arguments.
  try { return execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--linked', '--file', file], { encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 }); }
  catch { throw new Error('Trusted hosted role operation failed; no database credentials logged.'); }
}
let actor, token;
try {
  const email = `hosted-cast-publisher-${randomUUID()}@example.test`, password = `Ts!${randomUUID()}Aa9`;
  const signup = await request('/auth/v1/signup', { body: { email, password, data: { adult_declaration: '18-plus-v1' } } });
  actor = signup.user?.id; uuid(actor); token = signup.access_token; assert(token);
  state.maintenanceActors ??= []; state.maintenanceActors.push(actor); await save();
  const rpc = (name, body, service = false) => request(`/rest/v1/rpc/${name}`, { body, token: service ? undefined : token, service });
  await rpc('save_preferences', { p_name: 'Hosted cast maintenance', p_genders: ['man', 'woman'], p_language: 'english', p_requests: false, p_version: 1 });
  await rpc('complete_onboarding', { p_version: 2, p_consent: true });
  await writeFile('.local-services/hosted-cast/operator.sql', `insert into private.user_roles(user_id,role) values('${actor}','admin');select count(*) as active_roles from private.user_roles where user_id='${actor}';`);
  const granted = trustedSql();
  assert.equal(JSON.parse(granted.slice(granted.indexOf('{'))).rows[0].active_roles, 1);
  const command = (operation, args) => rpc('admin_cast_command', { p_operation: operation, ...args });
  let processed = 0;
  for (const item of plan) {
    let entry = state.characters[item.key];
    if (!entry) {
      // Recover an ambiguous creation only if there is exactly one matching snapshot.
      const all = await rpc('admin_list_cast', {});
      const matching = all.filter(row => fingerprint({ profile: row.profile, direction: row.direction }) === item.hash);
      assert(matching.length <= 1, 'Ambiguous duplicate cast; operator review required.');
      const created = matching[0] ?? await command('cast.save_draft', { p_id: null, p_version: 0, p_profile: item.profile, p_direction: item.direction });
      uuid(created.id); entry = { id: created.id, hash: item.hash, assets: {} }; state.characters[item.key] = entry; await save();
    }
    assert.equal(entry.hash, item.hash, 'Source profile changed; review required.');
    const draft = await rpc('admin_get_cast', { p_id: entry.id });
    assert.equal(fingerprint({ profile: draft.profile, direction: draft.direction }), item.hash, 'Hosted draft changed; do not overwrite.');
    const previouslyPublished = Boolean(entry.published);
    if (previouslyPublished) assert.equal(draft.status, 'published', 'Do not override a later deactivation.');
    for (const photo of item.photos) {
      let saved = entry.assets[photo.slot];
      if (!saved) { saved = { id: randomUUID(), hash: photo.asset.source_hash }; entry.assets[photo.slot] = saved; await save(); }
      uuid(saved.id); assert.equal(saved.hash, photo.asset.source_hash);
      let assets = await rpc('admin_list_assets', { p_character: entry.id });
      let asset = assets.find(row => row.id === saved.id);
      if (!asset) {
        await command('asset.reserve_upload', { p_id: entry.id });
        for (const file of photo.files) {
          const objectPath = `${entry.id}/${saved.id}/${file.name}.webp`;
          // Existing immutable objects are accepted only when bytes match exactly.
          const head = await fetch(`${target}/storage/v1/object/authenticated/cast-private/${objectPath}`, { headers: { apikey: hosted.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${hosted.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(15000) });
          if (head.ok) assert.equal(digest(Buffer.from(await head.arrayBuffer())), digest(file.bytes));
          else {
            assert([400, 404].includes(head.status), 'Storage preflight failed.');
            await request(`/storage/v1/object/cast-private/${objectPath}`, { service: true, bytes: file.bytes });
          }
        }
        await rpc('register_inspected_asset', { p_id: saved.id, p_character: entry.id, p_actor: actor, p_slot: photo.slot, p_alt: photo.asset.alt_text, p_width: photo.asset.width, p_height: photo.asset.height, p_hash: saved.hash }, true);
        assets = await rpc('admin_list_assets', { p_character: entry.id }); asset = assets.find(row => row.id === saved.id);
      }
      assert(asset && asset.source_hash === saved.hash && asset.review_state !== 'rejected');
      if (asset.review_state !== 'approved') { await command('asset.approved', { p_id: asset.id, p_version: asset.version, p_attested: true }); asset = { ...asset, version: asset.version + 1 }; }
      if (!asset.published) await command('asset.publish', { p_id: asset.id, p_version: asset.version });
    }
    const preview = await rpc('admin_cast_preview', { p_id: entry.id });
    assert.equal(preview.assets.length, 2); assert.equal(preview.direction, undefined);
    if (draft.status !== 'published') await command('cast.publish', { p_id: entry.id, p_version: draft.version, p_attested: true });
    entry.published = true; await save();
    console.log(`${item.profile.name}: hosted profile and two current photos published.`);
    if (previouslyPublished) continue;
    processed++;
    if (processed % 3 === 0 && processed < plan.length) { console.log('Respecting the one-minute administrator mutation limit.'); await new Promise(resolve => setTimeout(resolve, 31000)); await new Promise(resolve => setTimeout(resolve, 31000)); }
  }
  const all = await rpc('admin_list_cast', {});
  assert.equal(all.filter(row => row.status === 'published').length, 22);
  state.completedAt = new Date().toISOString(); await save();
  console.log('Hosted publication complete: 22 profiles, 44 photos, 176 private WebP objects.');
} finally {
  if (actor) {
    uuid(actor);
    // Keep disabled attribution for history. Perform and verify cleanup through
    // the database connection even when the project's HTTP/DNS path is down.
    await writeFile('.local-services/hosted-cast/operator.sql', `begin;delete from private.user_roles where user_id='${actor}';update auth.users set banned_until=now()+interval '100 years' where id='${actor}' and email like 'hosted-cast-publisher-%@example.test';commit;select count(*) as active_roles from private.user_roles where user_id='${actor}';`);
    const cleaned = trustedSql();
    assert.equal(JSON.parse(cleaned.slice(cleaned.indexOf('{'))).rows[0].active_roles, 0);
    console.log('Maintenance administrator role removed; maintenance login disabled.');
  }
}
