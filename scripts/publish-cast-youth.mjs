import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { writeFileSync, unlinkSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { inspectImage } from '../lib/backend/inspect-image.ts';
import { loadRoster } from './build-cast-roster.mjs';
import { encryptBundle, decryptBundle } from './lib/hosted-backup-crypto.mjs';

const project = 'hoxeembcwureucdsssct', target = `https://${project}.supabase.co`;
const env = parseEnv(await readFile('.env.hosted.local', 'utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, target);
assert.equal(parseEnv(await readFile('.env.local', 'utf8')).NEXT_PUBLIC_SUPABASE_URL, target);
const pack = await loadRoster();
const receipt = JSON.parse(await readFile('docs/cast-50/publication.json', 'utf8'));
assert.equal(receipt.target, target); assert.equal(Object.keys(receipt.keys).length, 50);
const sourceBaseline = JSON.parse(await readFile('.local-services/cast-youth/source-baseline.json', 'utf8'));
const images = JSON.parse(await readFile('docs/cast-50/youth-images.json', 'utf8'));
assert.equal(Object.keys(images.photos).length, 20);
const prepared = new Map();
for (const c of pack.characters) {
 const photos = [];
 for (const slot of ['portrait', 'gallery']) {
  const record = images.photos[c.key + '-' + slot]; if (!record) continue;
  assert.equal(record.visualReview, 'passed'); const bytes = await readFile(record.original);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sourceHash);
  const image = await inspectImage(bytes); photos.push({ slot, image, hash: createHash('sha256').update(image.original).digest('hex'), alt: c.profile.name + ', ' + c.profile.age + ', a fictional adult AI character in a ' + slot + ' photograph.' });
 }
 if (photos.length) { assert.equal(photos.length, 2); prepared.set(c.key, photos); }
}
assert.equal(prepared.size, 10);
const folder = '.local-services/cast-youth'; await mkdir(`${folder}/cli`, { recursive: true });
const lock = `${folder}/publish.lock`; writeFileSync(lock, String(process.pid), { flag: 'wx' });
process.on('exit', () => { try { unlinkSync(lock); } catch { /* Explicit stale-lock inspection required after a forced stop. */ } });
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const fingerprint = value => hash(JSON.stringify(canonical(value)));
const uuid = id => assert.match(id, /^[a-f0-9-]{36}$/);
for (const id of Object.values(receipt.keys)) uuid(id);
async function sql(query) {
    const file = resolve(`${folder}/operator.sql`); await writeFile(file, query, { mode: 0o600 });
    let output;
    try { output = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--workdir', resolve(`${folder}/cli`), '--linked', '--project-ref', project, '--output', 'json', '--file', file], { encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], timeout: 90000, maxBuffer: 8 * 1024 * 1024 }); }
    catch { throw new Error('Trusted cast-revision operation unavailable; private data and raw diagnostics suppressed.'); }
    return JSON.parse(output.slice(output.indexOf('{'))).rows;
}
const ids = Object.values(receipt.keys).map(id => `'${id}'`).join(',');
const readSql = `select c.id,c.status,d.profile,d.direction,d.version,p.direction as published_direction,(select jsonb_agg(to_jsonb(a)) from public.character_assets a where a.character_id=c.id and a.published) as assets from public.characters c join private.cast_drafts d on d.character_id=c.id join private.character_direction p on p.character_id=c.id where c.id in (${ids});`;
const current = await sql(readSql); assert.equal(current.length, 50);
let state;
try { state = JSON.parse(await readFile(`${folder}/state.json`, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!state) {
    assert.equal(receipt.sourceFingerprint, sourceBaseline.sourceFingerprint, 'Published source changed before snapshot.');
    for (const c of sourceBaseline.characters) {
        const row = current.find(row => row.id === receipt.keys[c.key]);
        assert.equal(row.status, 'published'); assert.equal(fingerprint(row.profile), fingerprint(c.profile), 'Outside profile edit; do not overwrite.');
        assert.equal(row.direction, c.direction, 'Outside private direction edit; do not overwrite.');
        assert.equal(row.published_direction, c.direction, 'Published direction differs from the recorded baseline.');
    }
    const key = await readFile('.local-services/hosted-privacy/encryption.key');
    const baseline = { version: 1, project, kind: 'cast-youth-profile-and-photo-revision', savedAt: new Date().toISOString(), originalReceipt: receipt, rows: current };
    const encrypted = encryptBundle(baseline, key, project);
    await writeFile(`${folder}/baseline.tshback`, encrypted, { flag: 'wx', mode: 0o600 });
    assert.deepEqual(decryptBundle(await readFile(`${folder}/baseline.tshback`), key, project), baseline);
    state = { version: 1, target, sourceFingerprint: pack.sourceFingerprint, baselineHash: hash(encrypted), actors: [], completed: [] };
}
assert.equal(state.target, target); assert.equal(state.sourceFingerprint, pack.sourceFingerprint);
const encrypted = await readFile(`${folder}/baseline.tshback`); assert.equal(hash(encrypted), state.baselineHash);
const baseline = decryptBundle(encrypted, await readFile('.local-services/hosted-privacy/encryption.key'), project);
assert.equal(baseline.kind, 'cast-youth-profile-and-photo-revision'); assert.equal(baseline.rows.length, 50);
async function save() {
    await writeFile(`${folder}/state.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    for (let attempt = 0; ; attempt++) { try { await rename(`${folder}/state.tmp`, `${folder}/state.json`); break; } catch (error) { if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 5) throw error; await new Promise(resolve => setTimeout(resolve, 250)); } }
}
await save();
if (!process.argv.includes('--publish')) {
    console.log('Read-only preflight: 50 profile/personality revisions, 46 younger adults, four older adults and 20 reviewed replacement photos, encrypted/hash-verified revision snapshot. No hosted writes.');
} else {
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const service = createClient(target, env.SUPABASE_SERVICE_ROLE_KEY, options);
    const admin = createClient(target, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
    function checked(result, label) {
        if (result.error || result.data?.error) {
            const reason = ['conflict', 'rate_limited', 'invalid_cast', 'invalid_change'].includes(result.data?.error) ? result.data.error : 'dependency_or_access';
            console.error(`${label}: ${reason}; mutation not retried.`); throw new Error('Cast youth publication stopped; checkpoints and encrypted baseline retained.');
        }
        return result.data;
    }
    async function cleanup() {
        if (!state.actors.length) return;
        const actors = state.actors.map(id => { uuid(id); return `'${id}'`; }).join(',');
        for (let attempt = 0; ; attempt++) {
            try { const result = await sql(`begin;delete from private.user_roles where user_id in (${actors});update auth.users set banned_until=now()+interval '100 years' where id in (${actors}) and email like 'cast-youth-%@example.test';commit;select count(*) as n from private.user_roles where user_id in (${actors});`); assert.equal(Number(result[0].n), 0); break; }
            catch (error) { if (attempt === 2) throw error; await new Promise(resolve => setTimeout(resolve, 5000)); }
        }
        console.log('Maintenance roles removed and logins disabled.');
    }
    await cleanup();
    let actor;
    let windowStart = 0, mutations = 0;
    async function command(operation, args) {
        if (!windowStart || Date.now() - windowStart >= 62000) { windowStart = Date.now(); mutations = 0; }
        if (mutations >= 24) { for (let wait = Math.max(0, 62000 - (Date.now() - windowStart)); wait > 0; wait -= 20000) await new Promise(resolve => setTimeout(resolve, Math.min(wait, 20000))); windowStart = Date.now(); mutations = 0; }
        mutations++; return checked(await admin.rpc('admin_cast_command', { p_operation: operation, ...args }), operation);
    }
    try {
        const email = `cast-youth-${randomUUID()}@example.test`, password = `Ts!${randomUUID()}Aa9`;
        actor = checked(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', synthetic_cast_maintenance: true } }), 'Maintenance account').user.id;
        uuid(actor); state.actors.push(actor); await save();
        checked(await admin.auth.signInWithPassword({ email, password }), 'Maintenance sign-in');
        checked(await admin.rpc('save_preferences', { p_name: 'Cast youth maintenance', p_genders: ['woman', 'man'], p_language: 'english', p_requests: false, p_version: 1 }), 'Maintenance preferences');
        checked(await admin.rpc('complete_onboarding', { p_version: 2, p_consent: true }), 'Maintenance onboarding');
        await sql(`insert into private.user_roles(user_id,role) values('${actor}','admin'); select count(*) as n from private.user_roles where user_id='${actor}';`);
        const fresh = checked(await admin.rpc('admin_list_cast'), 'Current drafts');
        for (const c of pack.characters) {
            const id = receipt.keys[c.key], row = fresh.find(row => row.id === id), original = baseline.rows.find(row => row.id === id);
            assert.equal(row.status, 'published');
            assert([fingerprint(original.profile),fingerprint(c.profile)].includes(fingerprint(row.profile)), 'Outside profile edit.');
            let version = row.version;
            if (row.direction !== c.direction || fingerprint(row.profile) !== fingerprint(c.profile)) {
                assert.equal(row.direction, original.direction, 'Outside draft edit; do not overwrite.'); assert.equal(row.version, original.version);
                await command('cast.save_draft', { p_id: id, p_version: version, p_profile: c.profile, p_direction: c.direction }); version++;
            }
            for (const photo of prepared.get(c.key) ?? []) {
                state.assets ??= {};
                const assetKey = `${c.key}-${photo.slot}`;
                let stored = state.assets[assetKey];
                if (!stored) { stored = { id: randomUUID(), hash: photo.hash }; state.assets[assetKey] = stored; await save(); }
                uuid(stored.id); assert.equal(stored.hash, photo.hash);
                let assets = checked(await admin.rpc('admin_list_assets', { p_character: id }), 'Current assets');
                let asset = assets.find(row => row.id === stored.id);
                if (!asset) {
                    await command('asset.reserve_upload', { p_id: id });
                    const files = [{ name: 'original', bytes: photo.image.original }, ...photo.image.variants.map(v => ({ name: String(v.width), bytes: v.bytes }))];
                    for (const file of files) {
                        const path = `${id}/${stored.id}/${file.name}.webp`;
                        const response = await fetch(`${target}/storage/v1/object/authenticated/cast-private/${path}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(20000), cache: 'no-store' });
                        if (response.ok) assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(file.bytes));
                        else {
                            assert([400, 404].includes(response.status), 'Storage preflight failed.');
                            checked(await service.storage.from('cast-private').upload(path, file.bytes, { contentType: 'image/webp', upsert: false }), 'Image upload');
                        }
                    }
                    checked(await service.rpc('register_inspected_asset', { p_id: stored.id, p_character: id, p_actor: actor, p_slot: photo.slot, p_alt: photo.alt, p_width: photo.image.width, p_height: photo.image.height, p_hash: photo.hash }), 'Register inspected photo');
                    assets = checked(await admin.rpc('admin_list_assets', { p_character: id }), 'Registered assets');
                    asset = assets.find(row => row.id === stored.id);
                }
                assert(asset && asset.source_hash === photo.hash && asset.review_state !== 'rejected');
                if (asset.review_state !== 'approved') {
                    await command('asset.approved', { p_id: asset.id, p_version: asset.version, p_attested: true });
                    asset = { ...asset, version: asset.version + 1 };
                }
                if (!asset.published) await command('asset.publish', { p_id: asset.id, p_version: asset.version });
                // Re-approval unpublishes an old asset without deleting its bytes or history.
                for (const old of original.assets.filter(a => a.slot === photo.slot)) {
                    const fresh = assets.find(a => a.id === old.id);
                    assert(fresh, 'Original asset missing.');
                    if (fresh.published) {
                        assert.equal(fresh.version, old.version, 'Outside photo edit.');
                        await command('asset.approved', { p_id: old.id, p_version: fresh.version, p_attested: true });
                    }
                }
            }
            if (!state.completed.includes(c.key)) {
                const published = current.find(row => row.id === id).published_direction;
                if (published !== c.direction) await command('cast.publish', { p_id: id, p_version: version, p_attested: true });
                state.completed.push(c.key); await save();
            }
            console.log(`${state.completed.length}/50 ${c.profile.name}: ${c.profile.occupation}, profile, lifestyle and personal canon published.`);
        }
        const final = await sql(readSql);
        for (const c of pack.characters) { const row = final.find(row => row.id === receipt.keys[c.key]); assert.equal(row.direction, c.direction); assert.equal(row.published_direction, c.direction); assert.equal(fingerprint(row.profile), fingerprint(c.profile)); }
        for (const c of pack.characters) {
            const row = final.find(row => row.id === receipt.keys[c.key]);
            assert.equal(row.assets.length, 2);
            for (const photo of prepared.get(c.key) ?? []) assert(row.assets.some(a => a.id === state.assets[`${c.key}-${photo.slot}`].id && a.source_hash === photo.hash));
        }
        const totals = (await sql("select (select count(*) from public.characters where status='published') as profiles,(select count(*) from public.character_assets where published and review_state='approved') as photos;"))[0];
        assert.equal(Number(totals.profiles), 50); assert.equal(Number(totals.photos), 100);
        // Verify the customer-facing projection after removing administrator privileges.
        await sql(`delete from private.user_roles where user_id='${actor}'; select count(*) as n from private.user_roles where user_id='${actor}';`);
        const visible = [];
        for (let page = 1; page <= 5; page++) {
            const result = checked(await admin.rpc('discover_cast', { p_page: page, p_gender: null }), 'Ordinary adult discovery');
            assert.equal(result.total, 50); visible.push(...result.characters);
        }
        assert.equal(new Set(visible.map(c => c.id)).size, 50);
        assert.equal(visible.filter(c => c.age >= 22 && c.age <= 34).length, 46);
        assert.equal(visible.filter(c => c.age >= 40 && c.age <= 50 && c.gender === 'man').length, 2);
        assert.equal(visible.filter(c => c.age >= 40 && c.age <= 50 && c.gender === 'woman').length, 2);
        for (const c of pack.characters) {
            const row = visible.find(row => row.id === receipt.keys[c.key]);
            assert.equal(row.name, c.profile.name); assert.equal(row.age, c.profile.age);
            assert.equal(row.occupation, c.profile.occupation); assert.equal(row.bio, c.profile.bio);
        }
        state.completedAt = new Date().toISOString(); await save();
        const initialPath = 'docs/cast-50/youth-publication-baseline.json';
        try { await writeFile(initialPath, JSON.stringify(baseline.originalReceipt, null, 2) + '\n', { flag: 'wx' }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
        const revision = { version: 1, completedAt: state.completedAt, sourceFingerprint: pack.sourceFingerprint, profiles: 50, personalFacts: 250, youngerAdults: 46, olderAdults: 4, replacedPhotos: 20, preservedCharacterIds: true, oldPhotosRetainedUnpublished: true, encryptedBaselineVerified: true, publishedDirectionsVerified: true };
        await writeFile('docs/cast-50/youth-publication.json', JSON.stringify(revision, null, 2) + '\n');
        await writeFile('docs/cast-50/publication.json', JSON.stringify({ ...receipt, sourceFingerprint: pack.sourceFingerprint, latestYouthRevision: revision }, null, 2) + '\n');
        console.log('Verified all 50 published revised profiles; IDs preserved, 100 current photos, 20 replacements.');
    } finally { if (actor) await cleanup(); }
}
