import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { writeFileSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { providerSettings } from '../lib/ai/provider.mjs';
import { runReply } from '../lib/ai/reply-pipeline.mjs';
import { reservationCost, digest } from './lib/cast-evaluation.mjs';

const pack = JSON.parse(await readFile('docs/cast-50/characters.json', 'utf8'));
const continuityKeys = new Set(['char-amara', 'char-tunde', 'char-seyi', 'char-morenike']);
let plan = pack.characters.flatMap(c => {
    const base = { key: c.key, name: c.profile.name, occupation: c.profile.occupation, city: c.world.city, country: c.world.country };
    return [
        { ...base, id: 'home-work', text: 'Where are you living these days, what brought you there, and what do you do for work?' },
        ...(continuityKeys.has(c.key) ? [
            { ...base, id: 'arrival', text: 'When did you move there, and what made you stay?' },
            { ...base, id: 'friend', text: 'Tell me a little about a friend you are close to. No need to make it sound like a biography.' },
            { ...base, id: 'home-continuity', text: 'Remind me which city you live in now. I mean your current home, not where you grew up.' },
        ] : []),
    ];
});
assert.equal(plan.length, 62);
const naturalnessRecheck = process.argv.includes('--naturalness-recheck');
if (naturalnessRecheck) plan = ['char-hon-femi', 'char-kunle', 'char-raymond'].map(key => {
    const c = pack.characters.find(c => c.key === key);
    return { key, name: c.profile.name, occupation: c.profile.occupation, city: c.world.city, country: c.world.country, id: 'naturalness-home', text: 'Tell me briefly where you live now, what brought you there and what you do for work. Just a normal chat answer.' };
});
if (!process.argv.includes('--run')) { console.log(`Offline world verification plan: ${plan.length} selected turns. Maximum 65 combined paid attempts and $0.35 reserved budget. No network calls.`); process.exit(0); }
const target = 'https://hoxeembcwureucdsssct.supabase.co';
const runtime = parseEnv(await readFile('.env.local', 'utf8')), env = parseEnv(await readFile('.env.hosted.local', 'utf8'));
assert.equal(runtime.NEXT_PUBLIC_SUPABASE_URL, target); assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, target);
const settings = providerSettings(runtime); assert(settings);
const publication = JSON.parse(await readFile('docs/cast-50/publication.json', 'utf8'));
assert.equal(publication.sourceFingerprint, pack.sourceFingerprint); assert(publication.latestWorldRevision?.publishedDirectionsVerified);
const folder = '.local-services/cast-world-verification'; await mkdir(`${folder}/cli`, { recursive: true });
const lock = `${folder}/run.lock`; writeFileSync(lock, String(process.pid), { flag: 'wx' }); process.on('exit', () => { try { unlinkSync(lock); } catch { /* Inspect before recovering a stale lock. */ } });
async function sql(query) {
    const file = resolve(`${folder}/operator.sql`); await writeFile(file, query, { mode: 0o600 });
    let output; try { output = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--workdir', resolve(`${folder}/cli`), '--linked', '--project-ref', 'hoxeembcwureucdsssct', '--output', 'json', '--file', file], { windowsHide: true, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 90000 }); } catch { throw new Error('Verification ledger inspection unavailable; private diagnostics suppressed.'); }
    return JSON.parse(output.slice(output.indexOf('{'))).rows;
}
const cfg = (await sql('select enabled,model,max_input_tokens,max_output_tokens,input_micro_usd_per_million,output_micro_usd_per_million,project_daily_micro_usd,user_daily_micro_usd from private.ai_configuration where singleton;'))[0];
assert(cfg.enabled && cfg.model === settings.model && cfg.project_daily_micro_usd > 0 && cfg.project_daily_micro_usd <= 20_000_000 && cfg.user_daily_micro_usd > 0 && cfg.user_daily_micro_usd <= 2_000_000);
const cost = reservationCost(cfg); assert(cost * 65 <= 350000);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(target, env.SUPABASE_SERVICE_ROLE_KEY, options), member = createClient(target, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const checked = (result, label) => { if (result.error) throw new Error(`${label} unavailable; no automatic paid or mutation retries.`); return result.data; };
const promptFingerprint = digest((await readFile('lib/ai/provider.mjs', 'utf8')) + (await readFile('lib/ai/conversation-style.mjs', 'utf8')));
let state; try { state = JSON.parse(await readFile(`${folder}/state.json`, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
state ??= { version: 1, sourceFingerprint: pack.sourceFingerprint, promptFingerprint, calls: 0, reservedUpperBound: 0, threads: {}, records: [] };
assert.equal(state.sourceFingerprint, pack.sourceFingerprint);
if (naturalnessRecheck) {
    assert.equal(state.records.filter(r => r.caseId !== 'naturalness-home' && r.finishedAt).length, 62);
    state.naturalnessPromptFingerprint ??= promptFingerprint;
    assert.equal(state.naturalnessPromptFingerprint, promptFingerprint);
} else assert.equal(state.promptFingerprint, promptFingerprint);
async function save() {
    await writeFile(`${folder}/state.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    for (let attempt = 0; ; attempt++) { try { await rename(`${folder}/state.tmp`, `${folder}/state.json`); break; } catch (error) { if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 5) throw error; await new Promise(resolve => setTimeout(resolve, 250)); } }
    await writeFile('docs/cast-50/world-verification.json', JSON.stringify({ version: 1, sourceFingerprint: state.sourceFingerprint, promptFingerprint: state.promptFingerprint, naturalnessPromptFingerprint: state.naturalnessPromptFingerprint ?? null, model: settings.model, completedAt: state.completedAt ?? null, calls: state.calls, reservedMicroUsdUpperBound: state.reservedUpperBound, databaseReservedMicroUsd: state.databaseReservedMicroUsd ?? null, scope: 'Synthetic live home/move/work questions for all 50; arrival, friend and current-home continuity for Amara, Tunde, Seyi and Morenike. Three optional wording rechecks retain initial replies and share the 65-call/$0.35 reservation ceiling. Automated signals require manual review; not full personality acceptance.', records: state.records }, null, 2) + '\n');
}
let started = 0, mutations = 0;
async function mutation(name, args) {
    if (!started || Date.now() - started >= 62000) { started = Date.now(); mutations = 0; }
    if (mutations >= 24) { for (let wait = Math.max(0, 62000 - (Date.now() - started)); wait > 0; wait -= 20000) await new Promise(resolve => setTimeout(resolve, Math.min(20000, wait))); started = Date.now(); mutations = 0; }
    mutations++; return checked(await member.rpc(name, args), name);
}
try {
    if (!state.actor) {
        const email = `cast-world-check-${randomUUID()}@example.test`, password = `Ts!${randomUUID()}Aa9`;
        state.actor = checked(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', synthetic_cast_world_check: true } }), 'Synthetic verification identity').user.id;
        state.email = email; state.password = password; await save();
    } else {
        const user = checked(await service.auth.admin.getUserById(state.actor), 'Synthetic identity check'); assert.equal(user.user.email, state.email); assert(user.user.user_metadata.synthetic_cast_world_check);
        checked(await service.auth.admin.updateUserById(state.actor, { ban_duration: 'none' }), 'Resume synthetic identity');
    }
    checked(await member.auth.signInWithPassword({ email: state.email, password: state.password }), 'Synthetic login');
    if (!state.onboarded) {
        const profile = checked(await member.from('profiles').select('version,onboarding_complete,display_name').eq('id', state.actor).single(), 'Synthetic profile');
        if (!profile.onboarding_complete) {
            let version = profile.version;
            if (profile.display_name !== 'World verification') { await mutation('save_preferences', { p_name: 'World verification', p_genders: ['woman', 'man'], p_language: 'english_pidgin', p_requests: false, p_version: version }); version++; }
            await mutation('complete_onboarding', { p_version: version, p_consent: true });
        }
        state.onboarded = true; await save();
    }
    assert.equal(checked(await member.rpc('is_admin'), 'Ordinary identity check'), false);
    for (const item of plan) {
        let record = state.records.find(row => row.key === item.key && row.caseId === item.id);
        if (record?.finishedAt) continue;
        if (!state.threads[item.key]) { state.threads[item.key] = await mutation('start_conversation', { p_character: publication.keys[item.key] }); await save(); }
        const id = state.threads[item.key];
        if (!record) { record = { key: item.key, name: item.name, expectedOccupation: item.occupation, expectedCity: item.city, expectedCountry: item.country, caseId: item.id, input: item.text, pidginAllowed: item.pidginAllowed ?? false, promptFingerprint, clientId: randomUUID(), state: 'saved' }; state.records.push(record); await save(); }
        const thread = checked(await member.rpc('conversation_thread', { p_id: id }), 'Thread read');
        if (!record.messageId) { record.messageId = (await mutation('save_user_message', { p_conversation: id, p_client_id: record.clientId, p_generation: thread.conversation.generation, p_text: item.text })).id; await save(); }
        if (record.state === 'started') {
            const status = checked(await member.rpc('reply_status', { p_conversation: id }), 'Reply status').find(row => row.messageId === record.messageId);
            assert.equal(status?.state, 'completed', 'Interrupted paid attempt is not repeated.'); record.state = 'completed';
        } else {
            assert(state.calls < 65 && state.reservedUpperBound + cost <= 350000);
            state.calls++; state.reservedUpperBound += cost; record.state = 'started'; await save();
            record.state = await runReply(service, record.messageId, state.actor, settings);
        }
        const after = checked(await member.rpc('conversation_thread', { p_id: id }), 'Persisted output'); const user = after.messages.find(row => row.id === record.messageId);
        record.output = after.messages.filter(row => row.role === 'character' && row.kind === 'text' && row.sequence > user.sequence).map(row => row.text).join('\n');
        record.expectedHomeMentioned = !['home-work', 'home-continuity', 'naturalness-home'].includes(item.id) ? null : record.output.toLowerCase().includes(item.city.toLowerCase());
        record.unsolicitedDisclosure = /\b(?:fictional (?:ai )?character|fictional civic leader|as an ai|i(?:'m| am) an ai|no real job|not a real person)\b/i.test(record.output);
        record.pidginCue = /\b(?:wetin|dey|abeg|you don)\b/i.test(record.output);
        record.unpromptedPidginCue = !item.pidginAllowed && record.pidginCue;
        record.finishedAt = new Date().toISOString(); await save();
        console.log(`${state.records.filter(row => row.finishedAt).length} recorded / ${item.name} / ${item.id}: ${record.state}; disclosure=${record.unsolicitedDisclosure}, unprompted Pidgin cue=${record.unpromptedPidginCue}.`);
        assert.equal(record.state, 'completed', 'Stop at failed provider/budget/access gate; no automatic retry.');
    }
    state.completedAt = new Date().toISOString(); assert.match(state.actor, /^[a-f0-9-]{36}$/);
    state.databaseReservedMicroUsd = Number((await sql(`select coalesce(sum(amount_micro_usd),0) as reserved from private.ai_daily_usage where scope='${state.actor}';`))[0].reserved);
    assert.equal(state.databaseReservedMicroUsd, state.reservedUpperBound); await save();
    console.log(`World verification checkpoint complete: ${state.records.filter(row => row.finishedAt).length} persisted replies; native voice and broader consistency review are separate.`);
} finally { if (state.actor) { checked(await service.auth.admin.updateUserById(state.actor, { ban_duration: '876000h' }), 'Disable synthetic verification login'); console.log('Synthetic verification login disabled.'); } await member.auth.signOut(); }
