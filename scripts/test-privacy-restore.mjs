import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createBackup, restoreIsolated, store, localOnly, syncErasures } from './lib/local-backups.mjs';
localOnly();
const options = { auth: { persistSession: false, autoRefreshToken: false } }, url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options), a = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const users = [];
let snapshot;
const check = result => { if (result.error)
    throw new Error('Synthetic restore fixture operation failed.'); return result.data; };
try {
    const password = `Ts!${randomUUID()}Aa9`;
    for (let i = 0; i < 2; i++) {
        const email = `restore-${randomUUID()}@example.test`;
        const user = check(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { adult_declaration: '18-plus-v1' } })).user;
        users.push(user.id);
        const client = i === 0 ? a : createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
        check(await client.auth.signInWithPassword({ email, password }));
        check(await client.rpc('save_preferences', { p_name: 'Synthetic restore', p_genders: ['woman'], p_language: 'english', p_requests: false, p_version: 1 }));
        check(await client.rpc('complete_onboarding', { p_version: 2, p_consent: true }));
    }
    const manifest = JSON.parse(await readFile('.local-services/photo-refresh.json', 'utf8')), character = manifest.characters['char-amara'].id;
    const conversation = check(await a.rpc('start_conversation', { p_character: character }));
    const message = check(await a.rpc('save_user_message', { p_conversation: conversation, p_client_id: randomUUID(), p_generation: 1, p_text: 'Synthetic pre-deletion snapshot text' })).id;
    check(await a.rpc('manage_memory', { p_character: character, p_operation: 'enable' }));
    check(await a.rpc('manage_memory', { p_character: character, p_operation: 'save', p_content: 'Synthetic pre-deletion memory', p_consent: true }));
    const report = check(await a.rpc('submit_report', { p_kind: 'message', p_target: message, p_reason: 'Other', p_details: 'Synthetic private evidence', p_operation: randomUUID() })).id;
    snapshot = await createBackup();
    check(await a.rpc('delete_own_account', { p_confirmation: 'DELETE' }));
    const [erased, other] = users;
    assert(erased && other);
    await restoreIsolated(snapshot.id, ({ query, records }) => {
        assert(records.some(record => record.actorId === erased));
        for (const [table, column, id] of [['auth.users', 'id', erased], ['public.profiles', 'id', erased], ['public.messages', 'id', message], ['public.memories', 'user_id', erased], ['public.reports', 'id', report], ['private.report_context', 'report_id', report]])
            assert.equal(query(`select count(*) from ${table} where ${column}='${id}';`), '0', table);
        assert.equal(query(`select count(*) from auth.users where id='${other}';`), '1');
        assert.equal(query('select account_deletion_enabled from private.privacy_configuration;'), 'f');
        assert.equal(query(`set role authenticated;select set_config('request.jwt.claims','{"sub":"${erased}"}',false);select public.has_adult_access();`).split(/\r?\n/).at(-1), 'f');
    });
    console.log('Real isolated restore passed: pre-deletion snapshot restored, current erasure ledger replayed, Auth/chat/memory/report evidence removed, unrelated account preserved, deletion disabled and erased identity denied access.');
}
finally {
    for (const id of users) {
        assert(/^[a-f0-9-]{36}$/.test(id));
        execFileSync('docker', ['exec', '-i', 'supabase_db_talking_stage', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: `delete from private.report_resolutions where report_id in(select id from public.reports where reporter_id='${id}');delete from public.reports where reporter_id='${id}';delete from public.memories where user_id='${id}';delete from public.memory_preferences where user_id='${id}';delete from public.messages where conversation_id in(select id from public.conversations where user_id='${id}');delete from public.conversations where user_id='${id}';`, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        const found = await service.auth.admin.getUserById(id);
        if (found.data.user)
            check(await service.auth.admin.deleteUser(id));
    }
    // Remove only this test's exact UUID snapshot after its isolated restore completes.
    if (snapshot)
        for (const ext of ['dump', 'json'])
            await unlink(join(store.root, `${snapshot.id}.${ext}`));
    await syncErasures();
}
