import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { inspectImage } from '../lib/backend/inspect-image.ts';
import { loadRoster } from './build-cast-roster.mjs';

// Owner requested generating and displaying the whole roster. Use existing
// audited/versioned operations; preserve all 22 IDs, conversations and photos.
const project = 'hoxeembcwureucdsssct';
const target = `https://${project}.supabase.co`;
const env = parseEnv(await readFile('.env.hosted.local', 'utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, target);
assert.equal((await readFile('supabase/.temp/project-ref', 'utf8')).trim(), project);
const working = parseEnv(await readFile('.env.local', 'utf8'));
assert.equal(working.NEXT_PUBLIC_SUPABASE_URL, target, 'Do not publish to a different app environment.');
assert(env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const folder = '.local-services/cast-50';
await mkdir(folder, { recursive: true });
await mkdir(`${folder}/cli`, { recursive: true });
const statePath = `${folder}/publication.json`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const fingerprint = value => hash(JSON.stringify(canonical(value)));
const uuid = value => assert.match(value, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
async function trustedSql(query) {
    const file = `${folder}/operator.sql`;
    await writeFile(file, query);
    let output;
    try { output = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--workdir', resolve(`${folder}/cli`), '--linked', '--project-ref', project, '--output', 'json', '--file', resolve(file)], { encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch { throw new Error('Hosted trusted SQL operation failed; credentials and private snapshots are not logged.'); }
    return JSON.parse(output.slice(output.indexOf('{'))).rows;
}
let state;
try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
async function save() {
    await writeFile(`${statePath}.tmp`, JSON.stringify(state, null, 2));
    for (let attempt = 0; ; attempt++) {
        try { await rename(`${statePath}.tmp`, statePath); break; }
        catch (error) { if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 10) throw error; await new Promise(resolve => setTimeout(resolve, 200)); }
    }
}
const original = JSON.parse(await readFile('.local-services/hosted-cast/state.json', 'utf8'));
assert.equal(original.target, target);
assert.equal(Object.keys(original.characters).length, 22);
for (const entry of Object.values(original.characters)) uuid(entry.id);
const ids = Object.values(original.characters).map(entry => `'${entry.id}'`).join(',');
if (!state) {
    const rows = await trustedSql(`select c.id,c.status,d.profile,d.direction,d.version,(select jsonb_agg(to_jsonb(a)) from public.character_assets a where a.character_id=c.id and a.published) as assets from public.characters c join private.cast_drafts d on d.character_id=c.id where c.id in (${ids});`);
    assert.equal(rows.length, 22);
    state = { version: 1, target, characters: {}, maintenanceActors: [] };
    for (const [key, entry] of Object.entries(original.characters)) {
        const row = rows.find(r => r.id === entry.id);
        assert.equal(row.status, 'published', 'Respect existing deactivation.');
        assert.equal(row.assets.length, 2);
        state.characters[key] = { id: row.id, origin: 'existing_catalogue', baseline: row, assets: {} };
    }
    await save();
}
assert.equal(state.target, target); assert.equal(state.version, 1);
if (process.argv.includes('--snapshot')) {
    console.log('Read-only baseline saved for the 22 existing hosted IDs, private drafts and current photo ownership. No hosted writes.');
    process.exit(0);
}
assert(process.argv.includes('--check') || process.argv.includes('--publish'), 'Use --snapshot, --check or --publish.');
const pack = await loadRoster();
const manifest = JSON.parse(await readFile('docs/cast-50/image-generation.json', 'utf8'));
const prepared = new Map();
for (const c of pack.characters.filter(c => c.origin === 'new_draft')) {
    const photos = [];
    for (const slot of ['portrait', 'gallery']) {
        const source = manifest.photos[`${c.key}-${slot}`];
        assert.equal(source?.visualReview, 'passed', `${c.key} ${slot}: review required.`);
        const bytes = await readFile(source.original);
        assert.equal(hash(bytes), source.sourceHash, 'Reviewed original changed.');
        const image = await inspectImage(bytes);
        photos.push({ slot, image, hash: hash(image.original), alt: `${c.profile.name}, ${c.profile.age}, a fictional adult AI character in a ${slot === 'portrait' ? 'portrait' : 'lifestyle photograph'}.` });
    }
    prepared.set(c.key, photos);
}
assert.equal(prepared.size, 28);
if (state.sourceFingerprint) assert.equal(state.sourceFingerprint, pack.sourceFingerprint, 'Do not change sources during a resumable publication.');
else { state.sourceFingerprint = pack.sourceFingerprint; await save(); }
if (process.argv.includes('--check')) {
    console.log('Publication preflight: 50 validated profiles/directions, 56 reviewed/hash-verified new originals, owned existing IDs preserved. No hosted writes.');
    process.exit(0);
}
// Back up before the first hosted mutation, using the existing encrypted store.
if (!state.backupCompletedAt) {
    execFileSync(process.execPath, ['scripts/hosted-backups.mjs', 'create'], { windowsHide: true, stdio: 'inherit', timeout: 1800000 });
    state.backupCompletedAt = new Date().toISOString(); await save();
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(target, env.SUPABASE_SERVICE_ROLE_KEY, options);
const admin = createClient(target, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
function checked(result, label) {
    if (result.error || result.data?.error) throw new Error(`${label} failed; inspect the private audit/state. No automatic mutation retry.`);
    return result.data;
}
const rpc = async (name, args, privileged = false) => checked(await (privileged ? service : admin).rpc(name, args), name);
let windowStart = Date.now(), mutations = 0;
async function command(operation, args) {
    if (Date.now() - windowStart >= 62000) { windowStart = Date.now(); mutations = 0; }
    if (mutations >= 26) {
        const remaining = Math.max(0, 62000 - (Date.now() - windowStart));
        console.log('Pausing for the existing administrator mutation limit; publication is checkpointed.');
        for (let wait = remaining; wait > 0; wait -= 30000) await new Promise(resolve => setTimeout(resolve, Math.min(wait, 30000)));
        windowStart = Date.now(); mutations = 0;
    }
    mutations++;
    return rpc('admin_cast_command', { p_operation: operation, ...args });
}
let actor;
try {
    const email = `cast50-publisher-${randomUUID()}@example.test`, password = `Ts!${randomUUID()}Aa9`;
    const created = checked(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', synthetic_cast_maintenance: true } }), 'Maintenance identity');
    actor = created.user.id; uuid(actor);
    state.maintenanceActors.push(actor); await save();
    checked(await admin.auth.signInWithPassword({ email, password }), 'Maintenance sign-in');
    await rpc('save_preferences', { p_name: 'Cast maintenance', p_genders: ['woman', 'man'], p_language: 'english', p_requests: false, p_version: 1 });
    await rpc('complete_onboarding', { p_version: 2, p_consent: true });
    await trustedSql(`insert into private.user_roles(user_id,role) values('${actor}','admin'); select count(*) as n from private.user_roles where user_id='${actor}';`);
    let completed = 0;
    for (const c of pack.characters) {
        const desired = { profile: c.profile, direction: c.direction };
        const desiredHash = fingerprint(desired);
        let entry = state.characters[c.key];
        if (!entry) {
            const all = await rpc('admin_list_cast', {});
            const matching = all.filter(row => fingerprint({ profile: row.profile, direction: row.direction }) === desiredHash);
            assert(matching.length <= 1, 'Ambiguous new draft; do not create duplicates.');
            const row = matching[0] ?? await command('cast.save_draft', { p_id: null, p_version: 0, p_profile: c.profile, p_direction: c.direction });
            uuid(row.id);
            entry = { id: row.id, origin: 'new_draft', assets: {} };
            state.characters[c.key] = entry; await save();
        }
        let draft = await rpc('admin_get_cast', { p_id: entry.id });
        assert(['draft', 'published'].includes(draft.status), 'Do not override a later deactivation.');
        const current = { profile: draft.profile, direction: draft.direction };
        if (fingerprint(current) !== desiredHash) {
            assert(entry.baseline && fingerprint(current) === fingerprint({ profile: entry.baseline.profile, direction: entry.baseline.direction }), 'Draft edited outside this operation; stop instead of overwriting.');
            assert.equal(draft.version, entry.baseline.version, 'Draft version changed since baseline.');
            await command('cast.save_draft', { p_id: entry.id, p_version: draft.version, p_profile: c.profile, p_direction: c.direction });
            draft = await rpc('admin_get_cast', { p_id: entry.id });
        }
        assert.equal(fingerprint({ profile: draft.profile, direction: draft.direction }), desiredHash);
        for (const photo of prepared.get(c.key) ?? []) {
            let stored = entry.assets[photo.slot];
            if (!stored) { stored = { id: randomUUID(), hash: photo.hash }; entry.assets[photo.slot] = stored; await save(); }
            uuid(stored.id); assert.equal(stored.hash, photo.hash);
            let assets = await rpc('admin_list_assets', { p_character: entry.id });
            let asset = assets.find(row => row.id === stored.id);
            if (!asset) {
                await command('asset.reserve_upload', { p_id: entry.id });
                const files = [{ name: 'original', bytes: photo.image.original }, ...photo.image.variants.map(v => ({ name: String(v.width), bytes: v.bytes }))];
                for (const file of files) {
                    const path = `${entry.id}/${stored.id}/${file.name}.webp`;
                    const response = await fetch(`${target}/storage/v1/object/authenticated/cast-private/${path}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(20000), cache: 'no-store' });
                    if (response.ok) assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(file.bytes), 'Immutable object differs.');
                    else {
                        assert([400, 404].includes(response.status), 'Storage preflight failed.');
                        checked(await service.storage.from('cast-private').upload(path, file.bytes, { contentType: 'image/webp', upsert: false }), 'Owned image upload');
                    }
                }
                await rpc('register_inspected_asset', { p_id: stored.id, p_character: entry.id, p_actor: actor, p_slot: photo.slot, p_alt: photo.alt, p_width: photo.image.width, p_height: photo.image.height, p_hash: photo.hash }, true);
                assets = await rpc('admin_list_assets', { p_character: entry.id }); asset = assets.find(row => row.id === stored.id);
            }
            assert(asset && asset.source_hash === photo.hash && asset.review_state !== 'rejected');
            if (asset.review_state !== 'approved') { await command('asset.approved', { p_id: asset.id, p_version: asset.version, p_attested: true }); asset = { ...asset, version: asset.version + 1 }; }
            if (!asset.published) await command('asset.publish', { p_id: asset.id, p_version: asset.version });
        }
        const preview = await rpc('admin_cast_preview', { p_id: entry.id });
        assert.equal(preview.direction, undefined); assert.equal(preview.assets.length, 2);
        if (!entry.completed) await command('cast.publish', { p_id: entry.id, p_version: draft.version, p_attested: true });
        entry.completed = true; entry.desiredHash = desiredHash; await save();
        completed++; console.log(`${completed}/50 ${c.profile.name}: profile, private voice and two owned photos available.`);
    }
    // Verify using an ordinary adult identity, not an administrator bypass.
    await trustedSql(`delete from private.user_roles where user_id='${actor}';select count(*) as n from private.user_roles where user_id='${actor}';`);
    const visible = new Set(); let total;
    for (let page = 1; ; page++) {
        const data = await rpc('discover_cast', { p_page: page, p_gender: null });
        total = data.total;
        for (const c of data.characters) visible.add(c.id);
        if (page * 12 >= total) break;
    }
    assert.equal(total, 50); assert.equal(visible.size, 50);
    for (const entry of Object.values(state.characters)) assert(visible.has(entry.id));
    const summary = await trustedSql(`select (select count(*) from public.characters where status='published') as profiles,(select count(*) from public.character_assets where published and review_state='approved' and review_attested) as photos;`);
    assert.equal(Number(summary[0].profiles), 50); assert.equal(Number(summary[0].photos), 100);
    state.completedAt = new Date().toISOString(); await save();
    await writeFile('docs/cast-50/publication.json', JSON.stringify({ version: 1, target, completedAt: state.completedAt, sourceFingerprint: pack.sourceFingerprint, profiles: 50, photos: 100, ordinaryAdultPaginationVerified: true, keys: Object.fromEntries(Object.entries(state.characters).map(([key, entry]) => [key, entry.id])) }, null, 2) + '\n');
    console.log('Hosted verification complete: 50 profiles, 100 approved photos; all five discovery pages visible to an ordinary adult.');
} finally {
    if (actor) {
        uuid(actor);
        const rows = await trustedSql(`begin;delete from private.user_roles where user_id='${actor}';update auth.users set banned_until=now()+interval '100 years' where id='${actor}' and email like 'cast50-publisher-%@example.test';commit;select count(*) as n from private.user_roles where user_id='${actor}';`);
        assert.equal(Number(rows[0].n), 0);
        console.log('Maintenance administrator role removed and login disabled.');
    }
}
