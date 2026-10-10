import { execFileSync } from 'node:child_process';
import { readFile, readdir, lstat, realpath, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { backupStore, uuid, sha } from './local-backup-store.mjs';
export const store = backupStore();
export function localOnly() { if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    process.loadEnvFile('.env.local'); assert(['127.0.0.1', 'localhost'].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname), 'Loopback Supabase required'); }
const docker = (args, input) => { try {
    return execFileSync('docker', ['exec', ...(input ? ['-i'] : []), 'supabase_db_talking_stage', ...args], { input, windowsHide: true, maxBuffer: 128 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}
catch {
    throw new Error('Local backup database operation failed; no restore is released.');
} };
const sql = (database, input) => docker(['psql', '-U', 'supabase_admin', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], input).toString().trim();
export async function syncErasures() { localOnly(); return store.syncLedger(async () => JSON.parse(sql('postgres', "select coalesce(jsonb_agg(jsonb_build_object('actorId',actor_id,'deletedAt',deleted_at) order by actor_id),'[]'::jsonb) from privacy_guard.account_erasures;"))); }
export async function createBackup() { localOnly(); await syncErasures(); const files = (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort(), version = sql('postgres', 'select max(version) from supabase_migrations.schema_migrations;'), schemaVersion = files.find(file => file.startsWith(`${version}_`)); assert(schemaVersion, 'Unknown applied schema version'); const bytes = docker(['pg_dump', '-U', 'supabase_admin', '-d', 'postgres', '-Fc', '--schema=auth', '--schema=public', '--schema=private']); const body = await store.save(bytes, schemaVersion); await store.expire(); return body; }
export async function adoptLegacyBackups() { localOnly(); let count = 0; for (const directory of [resolve('.local-backups'), resolve('.local-services/backups')]) {
    for (const name of await readdir(directory).catch(error => { if (error.code === 'ENOENT')
        return []; throw error; })) {
        if (!/^(before-|stage\d+-|cast-before-)[a-zA-Z0-9_-]+\.(dump|sql)$/.test(name))
            continue;
        const path = join(directory, name), info = await lstat(path);
        assert(info.isFile() && !info.isSymbolicLink());
        assert.equal((await realpath(path)).toLowerCase(), path.toLowerCase());
        const bytes = await readFile(path), format = bytes.subarray(0, 5).toString() === 'PGDMP' ? 'pg-custom' : 'sql';
        const body = await store.save(bytes, null, { createdAt: info.mtime.toISOString(), format });
        await store.load(body.id);
        assert.equal(sha(await readFile(path)), sha(bytes), 'Legacy source changed during adoption');
        await unlink(path);
        count++;
    }
} return count; }
export async function restoreIsolated(id, check = () => { }) {
    localOnly();
    const records = await syncErasures();
    const { body, bytes } = await store.load(id);
    assert(body.schemaVersion && body.format === 'pg-custom', 'Legacy/unknown snapshots require a reviewed schema upgrade before restore');
    const target = `privacy_restore_${randomUUID().replaceAll('-', '_')}`;
    assert(/^privacy_restore_[a-f0-9_]+$/.test(target));
    docker(['createdb', '-U', 'supabase_admin', '--template=template0', target]);
    try {
        sql(target, 'drop schema public;');
        if (body.schemaVersion >= '202610100014_restore_guard.sql')
            sql(target, 'create schema privacy_guard authorization postgres;revoke all on schema privacy_guard from public,anon,authenticated,service_role;create table privacy_guard.account_erasures(actor_id uuid primary key,deleted_at timestamptz not null default now());alter table privacy_guard.account_erasures owner to postgres;alter table privacy_guard.account_erasures enable row level security;');
        docker(['pg_restore', '-U', 'supabase_admin', '-d', target, '--exit-on-error'], bytes);
        const files = (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
        assert(files.includes(body.schemaVersion), 'Unknown snapshot schema version');
        // private functions reference the journal schema; it is intentionally NOT restored.
        for (const file of files.filter(f => f > body.schemaVersion))
            await sql(target, await readFile(`supabase/migrations/${file}`, 'utf8'));
        assert(sql(target, "select to_regprocedure('private.erase_restored_account(uuid)') is not null;") === 't', 'Restore cleanup function unavailable');
        // The isolated database is never connected to the app. Failures drop the copy.
        const erase = records.map(r => { assert(uuid(r.actorId)); const deletedAt = new Date(r.deletedAt).toISOString(); return `select private.erase_restored_account('${r.actorId}');insert into privacy_guard.account_erasures(actor_id,deleted_at) values('${r.actorId}','${deletedAt}') on conflict(actor_id) do nothing;`; }).join('\n');
        sql(target, `begin;update private.privacy_configuration set account_deletion_enabled=false;${erase}commit;`);
        for (const r of records)
            assert.equal(sql(target, `select count(*) from auth.users where id='${r.actorId}';select count(*) from public.profiles where id='${r.actorId}';`), '0\n0', 'Deleted identity survived restore');
        await check({ query: value => sql(target, value), target, records });
        return { verified: true, erased: records.length };
    }
    finally {
        docker(['dropdb', '-U', 'supabase_admin', target]);
    }
}
