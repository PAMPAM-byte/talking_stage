import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { providerSettings } from '../lib/ai/provider.mjs';
import { runReply } from '../lib/ai/reply-pipeline.mjs';
import { evaluationPlan, followupPlan, reservationCost, assertEvaluationAllowance, evaluationCeilingMicroUsd, reviewSignals, digest } from './lib/cast-evaluation.mjs';

const pack = JSON.parse(await readFile('docs/cast-50/characters.json', 'utf8'));
const followup = process.argv.includes('--followup');
const phase = followup ? 'followup' : 'baseline';
const suiteText = await readFile(followup ? 'docs/cast-50/followup-cases.json' : 'docs/cast-50/evaluation.json', 'utf8');
const suite = JSON.parse(suiteText);
const publication = JSON.parse(await readFile('docs/cast-50/publication.json', 'utf8'));
assert.equal(publication.sourceFingerprint, pack.sourceFingerprint);
const plan = followup ? followupPlan(pack, suite) : evaluationPlan(pack, suite);
const total = plan.reduce((n, c) => n + c.cases.length, 0);
assert.equal(total, followup ? 162 : 198);
if (process.argv.includes('--check') || (!followup && !process.argv.includes('--run') && !process.argv.includes('--pilot'))) {
    console.log(`Offline ${phase} evaluation plan: ${plan.length} characters; ${total} replies. Ceiling $1.25 across all phases, existing daily budgets unchanged. No network calls.`);
    process.exit(0);
}
const project = 'hoxeembcwureucdsssct', target = `https://${project}.supabase.co`;
const runtime = parseEnv(await readFile('.env.local', 'utf8'));
const hosted = parseEnv(await readFile('.env.hosted.local', 'utf8'));
assert.equal(runtime.NEXT_PUBLIC_SUPABASE_URL, target); assert.equal(hosted.NEXT_PUBLIC_SUPABASE_URL, target);
const settings = providerSettings(runtime); assert(settings, 'Existing enabled runtime provider is required; do not activate or switch providers.');
const promptFingerprint = digest((await readFile('lib/ai/provider.mjs', 'utf8')) + (await readFile('lib/ai/conversation-style.mjs', 'utf8')));
const folder = '.local-services/cast-50-evaluation';
await mkdir(`${folder}/cli`, { recursive: true });
await mkdir('docs/cast-50/evaluations', { recursive: true });
const lock = `${folder}/run.lock`;
writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 });
process.on('exit', () => { try { unlinkSync(lock); } catch { /* A killed run requires an explicit stale-lock check. */ } });
async function sql(query) {
    const file = resolve(`${folder}/operator.sql`); await writeFile(file, query, { mode: 0o600 });
    let output;
    try { output = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--workdir', resolve(`${folder}/cli`), '--linked', '--project-ref', project, '--output', 'json', '--file', file], { windowsHide: true, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 90000, maxBuffer: 4 * 1024 * 1024 }); }
    catch { throw new Error('Evaluation database inspection unavailable; sensitive diagnostics suppressed.'); }
    return JSON.parse(output.slice(output.indexOf('{'))).rows;
}
const configuration = (await sql('select enabled,model,max_input_tokens,max_output_tokens,input_micro_usd_per_million,output_micro_usd_per_million,project_daily_micro_usd,user_daily_micro_usd from private.ai_configuration where singleton;'))[0];
assert(configuration.enabled && configuration.model === settings.model);
assert(configuration.project_daily_micro_usd > 0 && configuration.project_daily_micro_usd <= 20_000_000);
assert(configuration.user_daily_micro_usd > 0 && configuration.user_daily_micro_usd <= 2_000_000);
const cost = reservationCost(configuration);
assert(cost * (total + (followup ? 66 : 0)) <= evaluationCeilingMicroUsd, 'Plan exceeds evaluation ceiling under current rates; no configuration changed.');
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000) }) } };
const service = createClient(target, hosted.SUPABASE_SERVICE_ROLE_KEY, options);
const member = createClient(target, hosted.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
function checked(result, label) { if (result.error) throw new Error(`${label} failed; no automatic write/provider retry.`); return result.data; }
let state;
try { state = JSON.parse(await readFile(`${folder}/state.json`, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
state ??= { version: 1, runId: randomUUID(), sourceFingerprint: pack.sourceFingerprint, promptFingerprint, suiteFingerprint: digest(suiteText), model: settings.model, calls: 0, reservedUpperBound: 0, threads: {}, records: [], startedAt: new Date().toISOString() };
assert.equal(state.sourceFingerprint, pack.sourceFingerprint); assert.equal(state.model, settings.model);
if (followup) {
    assert.equal(state.records.filter(r => (r.phase ?? 'baseline') === 'baseline' && r.finishedAt).length, 66, 'Finish and preserve the six-voice pilot first.');
    state.followupPromptFingerprint ??= promptFingerprint; state.followupSuiteFingerprint ??= digest(suiteText);
    assert.equal(state.followupPromptFingerprint, promptFingerprint); assert.equal(state.followupSuiteFingerprint, digest(suiteText));
} else { assert.equal(state.promptFingerprint, promptFingerprint); assert.equal(state.suiteFingerprint, digest(suiteText)); }
const phaseRecords = () => state.records.filter(r => (r.phase ?? 'baseline') === phase);
async function save() {
    await writeFile(`${folder}/state.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    for (let attempt = 0; ; attempt++) {
        try { await rename(`${folder}/state.tmp`, `${folder}/state.json`); break; }
        catch (error) { if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 5) throw error; await new Promise(resolve => setTimeout(resolve, 200)); }
    }
    const report = { version: 1, phase, runId: state.runId, startedAt: state.startedAt, completedAt: state.completedAt ?? null, sourceFingerprint: state.sourceFingerprint, promptFingerprint, suiteFingerprint: digest(suiteText),
        model: settings.model, plannedReplies: total, providerAttemptsUpperBound: state.calls, reservedMicroUsdUpperBound: state.reservedUpperBound, databaseReservedMicroUsd: state.databaseReservedMicroUsd ?? null,
        reservationAccounting: 'Conservative application budget reservations, not a provider invoice. Recorded token usage is separate. Interrupted attempts are not retried.',
        scope: followup ? 'Prospective regression after the 66-reply pilot. Fresh three-turn threads for all 50, two additional boundary turns for the six pilot voices. Cumulative budget includes both phases. Native/owner review remains pending.' : 'Sequential real multi-turn threads, not independent isolated cases. Initial six-voice 11-turn pilot; the remaining original plan may be superseded by prospective regression. Other held-out cases and native/owner review remain pending.',
        reviewerStatus: { nativeSpeaker: 'pending', owner: 'pending', automatedSignals: 'review_cues_not_acceptance' }, configuration, records: phaseRecords() };
    await writeFile(`docs/cast-50/evaluations/${phase}.json`, JSON.stringify(report, null, 2) + '\n');
}
await save();
let windowStart = 0, changes = 0;
async function mutation(name, parameters) {
    if (!windowStart || Date.now() - windowStart >= 62000) { windowStart = Date.now(); changes = 0; }
    if (changes >= 24) { for (let wait = Math.max(0, 62000 - (Date.now() - windowStart)); wait > 0; wait -= 20000) await new Promise(resolve => setTimeout(resolve, Math.min(wait, 20000))); windowStart = Date.now(); changes = 0; }
    changes++;
    return checked(await member.rpc(name, parameters), name);
}
let failureCount = 0;
try {
    if (!state.actor) {
        const email = `cast50-evaluation-${state.runId}@example.test`, password = `Ts!${randomUUID()}Aa9`;
        const user = checked(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1', synthetic_cast_evaluation: true } }), 'Synthetic evaluation identity');
        state.actor = user.user.id; state.email = email; state.password = password; await save();
    } else {
        const user = checked(await service.auth.admin.getUserById(state.actor), 'Evaluation identity check');
        assert.equal(user.user.email, state.email); assert.equal(user.user.user_metadata.synthetic_cast_evaluation, true);
        checked(await service.auth.admin.updateUserById(state.actor, { ban_duration: 'none' }), 'Resume synthetic evaluation login');
    }
    checked(await member.auth.signInWithPassword({ email: state.email, password: state.password }), 'Evaluation sign-in');
    if (!state.onboarded) {
        let profile = checked(await member.from('profiles').select('version,display_name,onboarding_complete').eq('id', state.actor).single(), 'Synthetic profile');
        if (!profile.onboarding_complete) {
            if (profile.display_name !== 'Synthetic cast evaluation') {
                await mutation('save_preferences', { p_name: 'Synthetic cast evaluation', p_genders: ['woman', 'man'], p_language: 'english_pidgin', p_requests: false, p_version: profile.version });
                profile = checked(await member.from('profiles').select('version').eq('id', state.actor).single(), 'Saved synthetic profile');
            }
            await mutation('complete_onboarding', { p_version: profile.version, p_consent: true });
        }
        state.onboarded = true; await save();
    }
    assert.equal(checked(await member.rpc('is_admin'), 'Ordinary actor check'), false);
    const selected = process.argv.includes('--pilot') ? plan.filter(c => c.pilot) : plan;
    for (const character of selected) {
        const threadKey = followup ? `followup:${character.key}` : character.key;
        let thread = state.threads[threadKey];
        if (!thread) {
            const earlier = followup && state.threads[character.key];
            const id = earlier ? earlier.id : await mutation('start_conversation', { p_character: publication.keys[character.key] });
            if (earlier) { const previous = checked(await member.rpc('conversation_thread', { p_id: id }), 'Own pilot thread read'); await mutation('manage_conversation', { p_id: id, p_version: previous.conversation.version, p_operation: 'reset', p_clear_memories: false }); }
            thread = { id }; state.threads[threadKey] = thread; await save();
        }
        for (const item of character.cases) {
            let record = phaseRecords().find(row => row.key === character.key && row.caseId === item.id);
            if (record?.finishedAt) continue;
            if (!record) {
                record = { phase, key: character.key, name: character.name, caseId: item.id, input: item.text, expectation: item.expectation, clientId: randomUUID(), state: 'saved', createdAt: new Date().toISOString() };
                state.records.push(record); await save();
            }
            const before = checked(await member.rpc('conversation_thread', { p_id: thread.id }), 'Thread read');
            record.history = before.messages.filter(m => m.kind === 'text').map(m => ({ role: m.role, text: m.text }));
            if (!record.messageId) { const saved = await mutation('save_user_message', { p_conversation: thread.id, p_client_id: record.clientId, p_generation: before.conversation.generation, p_text: item.text }); record.messageId = saved.id; await save(); }
            if (record.state === 'started') {
                // Lost response: recover committed output only, never repeat a paid call.
                const status = checked(await member.rpc('reply_status', { p_conversation: thread.id }), 'Reply status').find(row => row.messageId === record.messageId);
                record.state = status?.state === 'completed' ? 'completed' : 'interrupted_not_retried';
                if (record.state !== 'completed') await mutation('cancel_reply', { p_message: record.messageId });
            } else {
                assertEvaluationAllowance(state.reservedUpperBound, cost, state.calls);
                state.reservedUpperBound += cost; state.calls++; record.state = 'started'; await save();
                const fetcher = async (url, options) => {
                    assert.equal(url, 'https://api.anthropic.com/v1/messages');
                    const response = await fetch(url, options);
                    record.providerHttpStatus = response.status;
                    if (response.ok) {
                        const body = await response.clone().json();
                        record.tokenUsage = Object.fromEntries(['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'].filter(key => Number.isSafeInteger(body.usage?.[key]) && body.usage[key] >= 0).map(key => [key, body.usage[key]]));
                    }
                    return response;
                };
                record.state = await runReply(service, record.messageId, state.actor, settings, { fetcher });
                if (record.state !== 'completed') { await mutation('cancel_reply', { p_message: record.messageId }); failureCount++; }
            }
            const after = checked(await member.rpc('conversation_thread', { p_id: thread.id }), 'Saved output read');
            const user = after.messages.find(m => m.id === record.messageId);
            const outputs = after.messages.filter(m => m.role === 'character' && m.sequence > user.sequence);
            record.output = outputs.filter(m => m.kind === 'text').map(m => m.text).join('\n');
            record.photoSelected = outputs.some(m => m.kind === 'photo');
            if (record.state === 'completed') assert(record.output.trim().length > 0);
            record.signals = reviewSignals(record.output); record.finishedAt = new Date().toISOString(); await save();
            console.log(`${phaseRecords().filter(r => r.finishedAt).length}/${total} ${character.name} / ${item.id}: ${record.state}; ${record.signals.words} words. Cumulative reserved ceiling $${(state.reservedUpperBound / 1_000_000).toFixed(4)}.`);
            if (failureCount >= 3 || ['blocked_provider', 'budget_exhausted', 'unavailable'].includes(record.state)) throw new Error('Evaluation stopped at provider/budget/access gate; no configuration changes or automatic paid retries.');
        }
    }
    if (phaseRecords().filter(r => r.finishedAt).length === total) state.completedAt = new Date().toISOString();
    assert.match(state.actor, /^[a-f0-9-]{36}$/);
    state.databaseReservedMicroUsd = Number((await sql(`select coalesce(sum(amount_micro_usd),0) as reserved from private.ai_reservations where actor_id='${state.actor}';`))[0].reserved);
    assert(state.databaseReservedMicroUsd <= state.reservedUpperBound);
    await save();
    console.log(`Evaluation checkpoint saved: ${phaseRecords().filter(r => r.state === 'completed').length} completed ${phase} replies; no native/owner acceptance claimed.`);
} finally {
    if (state.actor) { checked(await service.auth.admin.updateUserById(state.actor, { ban_duration: '876000h' }), 'Disable synthetic evaluation login'); console.log('Synthetic evaluation login disabled; no administrative role was granted.'); }
    await member.auth.signOut();
}
