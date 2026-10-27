import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { writeFileSync, unlinkSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { loadRoster } from './build-cast-roster.mjs';
import { encryptBundle, decryptBundle } from './lib/hosted-backup-crypto.mjs';

// Publishes the founder-approved style copy revision (27 Oct 2026): bios, profile lines,
// playboy tags and the matching private directions. Only characters that changed are touched.
const project = 'hoxeembcwureucdsssct', target = `https://${project}.supabase.co`;
const previousCommit = '909ba35^';
const env = parseEnv(await readFile('.env.hosted.local', 'utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, target);
assert.equal(parseEnv(await readFile('.env.local', 'utf8')).NEXT_PUBLIC_SUPABASE_URL, target);
assert.equal((await readFile('supabase/.temp/project-ref', 'utf8')).trim(), project);
const pack = await loadRoster();
const previous = JSON.parse(execFileSync('git', ['show', `${previousCommit}:docs/cast-50/characters.json`], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 }).replace(/^﻿/, ''));
const receipt = JSON.parse(await readFile('docs/cast-50/publication.json', 'utf8'));
assert.equal(receipt.target, target); assert.equal(Object.keys(receipt.keys).length, 50);
assert.notEqual(pack.sourceFingerprint, previous.sourceFingerprint, 'Nothing to publish.');
const alreadyPublished = receipt.sourceFingerprint === pack.sourceFingerprint;
assert(alreadyPublished || receipt.sourceFingerprint === previous.sourceFingerprint, 'Hosted receipt does not match the pre-revision roster.');
const folder = '.local-services/cast-styles'; await mkdir(`${folder}/cli`, { recursive: true });
const lock = `${folder}/publish.lock`; writeFileSync(lock, String(process.pid), { flag: 'wx' });
process.on('exit', () => { try { unlinkSync(lock); } catch { /* Explicit stale-lock inspection required after a forced stop. */ } });
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const fingerprint = value => hash(JSON.stringify(canonical(value)));
const uuid = id => assert.match(id, /^[a-f0-9-]{36}$/);
for (const id of Object.values(receipt.keys)) uuid(id);
const before = key => previous.characters.find(c => c.key === key);
const changed = pack.characters.filter(c => { const old = before(c.key); assert(old, 'Missing previous character.'); return old.direction !== c.direction || fingerprint(old.profile) !== fingerprint(c.profile); });
assert(changed.length > 0 && changed.length <= 50);
async function sql(query) {
    const file = resolve(`${folder}/operator.sql`); await writeFile(file, query, { mode: 0o600 });
    let output;
    try { output = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--workdir', resolve(`${folder}/cli`), '--linked', '--project-ref', project, '--output', 'json', '--file', file], { encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], timeout: 90000, maxBuffer: 8 * 1024 * 1024 }); }
    catch { throw new Error('Trusted cast-revision operation unavailable; private data and raw diagnostics suppressed.'); }
    return JSON.parse(output.slice(output.indexOf('{'))).rows;
}
const ids = Object.values(receipt.keys).map(id => `'${id}'`).join(',');
const readSql = `select c.id,c.status,d.profile,d.direction,d.version,p.direction as published_direction from public.characters c join private.cast_drafts d on d.character_id=c.id join private.character_direction p on p.character_id=c.id where c.id in (${ids});`;
const current = await sql(readSql); assert.equal(current.length, 50);
let state;
try { state = JSON.parse(await readFile(`${folder}/state.json`, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!state) {
    assert(!alreadyPublished, 'Receipt already records this revision.');
    for (const c of pack.characters) {
        const row = current.find(row => row.id === receipt.keys[c.key]), old = before(c.key);
        assert.equal(row.status, 'published');
        assert.equal(fingerprint(row.profile), fingerprint(old.profile), `Outside public profile edit for ${old.profile.name}; do not overwrite.`);
        assert.equal(row.direction, old.direction, `Outside private direction edit for ${old.profile.name}; do not overwrite.`);
        assert.equal(row.published_direction, old.direction, `Published direction differs for ${old.profile.name}.`);
    }
    const key = await readFile('.local-services/hosted-privacy/encryption.key');
    const baseline = { version: 1, project, kind: 'cast-style-copy-revision', savedAt: new Date().toISOString(), originalReceipt: receipt, rows: current };
    const encrypted = encryptBundle(baseline, key, project);
    await writeFile(`${folder}/baseline.tshback`, encrypted, { flag: 'wx', mode: 0o600 });
    assert.deepEqual(decryptBundle(await readFile(`${folder}/baseline.tshback`), key, project), baseline);
    state = { version: 1, target, sourceFingerprint: pack.sourceFingerprint, baselineHash: hash(encrypted), actors: [], completed: [] };
}
assert.equal(state.target, target); assert.equal(state.sourceFingerprint, pack.sourceFingerprint);
const encrypted = await readFile(`${folder}/baseline.tshback`); assert.equal(hash(encrypted), state.baselineHash);
const baseline = decryptBundle(encrypted, await readFile('.local-services/hosted-privacy/encryption.key'), project);
assert.equal(baseline.kind, 'cast-style-copy-revision'); assert.equal(baseline.rows.length, 50);
async function save() {
    await writeFile(`${folder}/state.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    for (let attempt = 0; ; attempt++) { try { await rename(`${folder}/state.tmp`, `${folder}/state.json`); break; } catch (error) { if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 5) throw error; await new Promise(resolve => setTimeout(resolve, 250)); } }
}
await save();
if (!process.argv.includes('--publish')) {
    console.log(`Read-only preflight: all 50 hosted profiles and directions match the pre-revision roster; ${changed.length} characters to update (${changed.map(c => c.profile.name).join(', ')}); encrypted/hash-verified snapshot saved. No hosted writes.`);
} else {
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const service = createClient(target, env.SUPABASE_SERVICE_ROLE_KEY, options);
    const admin = createClient(target, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
    function checked(result, label) {
        if (result.error || result.data?.error) {
            const reason = ['conflict', 'rate_limited', 'invalid_cast', 'invalid_change'].includes(result.data?.error) ? result.data.error : 'dependency_or_access';
            console.error(`${label}: ${reason}; mutation not retried.`); throw new Error('Cast style publication stopped; checkpoints and encrypted baseline retained.');
        }
        return result.data;
    }
    async function cleanup() {
        if (!state.actors.length) return;
        const actors = state.actors.map(id => { uuid(id); return `'${id}'`; }).join(',');
        for (let attempt = 0; ; attempt++) {
            try { const result = await sql(`begin;delete from private.user_roles where user_id in (${actors});update auth.users set banned_until=now()+interval '100 years' where id in (${actors}) and email like 'cast-styles-%@example.test';commit;select count(*) as n from private.user_roles where user_id in (${actors});`); assert.equal(Number(result[0].n), 0); break; }
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
        const email = `cast-styles-${randomUUID()}@example.test`, password = `Ts!${randomUUID()}Aa9`;
        actor = checked(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', synthetic_cast_maintenance: true } }), 'Maintenance account').user.id;
        uuid(actor); state.actors.push(actor); await save();
        checked(await admin.auth.signInWithPassword({ email, password }), 'Maintenance sign-in');
        checked(await admin.rpc('save_preferences', { p_name: 'Cast style maintenance', p_genders: ['woman', 'man'], p_language: 'english', p_requests: false, p_version: 1 }), 'Maintenance preferences');
        checked(await admin.rpc('complete_onboarding', { p_version: 2, p_consent: true }), 'Maintenance onboarding');
        await sql(`insert into private.user_roles(user_id,role) values('${actor}','admin'); select count(*) as n from private.user_roles where user_id='${actor}';`);
        const fresh = checked(await admin.rpc('admin_list_cast'), 'Current drafts');
        for (const c of changed) {
            const id = receipt.keys[c.key], row = fresh.find(row => row.id === id), original = baseline.rows.find(row => row.id === id);
            assert.equal(row.status, 'published');
            assert([fingerprint(original.profile), fingerprint(c.profile)].includes(fingerprint(row.profile)), 'Outside public profile edit; do not overwrite.');
            let version = row.version;
            if (row.direction !== c.direction || fingerprint(row.profile) !== fingerprint(c.profile)) {
                assert.equal(fingerprint(row.profile), fingerprint(original.profile), 'Outside profile edit; do not overwrite.');
                assert.equal(row.direction, original.direction, 'Outside draft edit; do not overwrite.'); assert.equal(row.version, original.version);
                await command('cast.save_draft', { p_id: id, p_version: version, p_profile: c.profile, p_direction: c.direction }); version++;
            }
            if (!state.completed.includes(c.key)) {
                if (original.published_direction !== c.direction || fingerprint(original.profile) !== fingerprint(c.profile)) await command('cast.publish', { p_id: id, p_version: version, p_attested: true });
                state.completed.push(c.key); await save();
            }
            console.log(`${state.completed.length}/${changed.length} ${c.profile.name}: new profile copy published.`);
        }
        const final = await sql(readSql);
        for (const c of pack.characters) { const row = final.find(row => row.id === receipt.keys[c.key]); assert.equal(row.direction, c.direction); assert.equal(row.published_direction, c.direction); assert.equal(fingerprint(row.profile), fingerprint(c.profile)); }
        const totals = (await sql("select (select count(*) from public.characters where status='published') as profiles,(select count(*) from public.character_assets where published and review_state='approved') as photos;"))[0];
        assert.equal(Number(totals.profiles), 50); assert.equal(Number(totals.photos), 100);
        await sql(`delete from private.user_roles where user_id='${actor}'; select count(*) as n from private.user_roles where user_id='${actor}';`);
        const visible = [];
        for (let page = 1; page <= 5; page++) {
            const result = checked(await admin.rpc('discover_cast', { p_page: page, p_gender: null }), 'Ordinary adult discovery');
            assert.equal(result.total, 50); visible.push(...result.characters);
        }
        assert.equal(new Set(visible.map(c => c.id)).size, 50);
        for (const c of pack.characters) {
            const row = visible.find(row => row.id === receipt.keys[c.key]);
            for (const field of ['name', 'age', 'occupation', 'bio']) assert.equal(row[field], c.profile[field]);
            assert.equal(row.conversation_clue ?? row.conversationClue, c.profile.conversationClue);
            assert.deepEqual([...row.personality].sort(), [...c.profile.personalityTags].sort());
        }
        const playboys = checked(await admin.rpc('discover_cast', { p_page: 1, p_personality: 'playboy' }), 'Playboy filter');
        assert.equal(playboys.total, pack.characters.filter(c => c.profile.personalityTags.includes('playboy')).length);
        state.completedAt = new Date().toISOString(); await save();
        const revision = { version: 1, completedAt: state.completedAt, sourceFingerprint: pack.sourceFingerprint, previousSourceFingerprint: previous.sourceFingerprint, updatedProfiles: changed.length, playboys: playboys.total, ordinaryAdultDiscoveryVerified: true, preservedIdsAndPhotos: true, encryptedBaselineVerified: true, publishedDirectionsVerified: true };
        await writeFile('docs/cast-50/style-publication.json', JSON.stringify(revision, null, 2) + '\n');
        await writeFile('docs/cast-50/publication.json', JSON.stringify({ ...receipt, sourceFingerprint: pack.sourceFingerprint, latestStyleRevision: revision }, null, 2) + '\n');
        console.log(`Verified ${changed.length} updated profiles and all 50 directions in ordinary adult discovery; IDs and 100 photos preserved.`);
    } finally { if (actor) await cleanup(); }
}
