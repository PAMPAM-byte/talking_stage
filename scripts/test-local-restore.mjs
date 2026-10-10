import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { localOnly, syncErasures } from './lib/local-backups.mjs';

export async function restoreLocalBackup(path) {
  localOnly();
  const records = await syncErasures();
  const container = 'supabase_db_talking_stage';
  const target = `stage8_restore_${randomUUID().replaceAll('-', '_')}`;
  assert(/^stage8_restore_[a-f0-9_]+$/.test(target));
  const dump = readFileSync(path);
  const command = (args, input) => execFileSync('docker', ['exec', ...(input ? ['-i'] : []), container, ...args], { input, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const query = (value) => command(['psql', '-U', 'supabase_admin', '-d', target, '-v', 'ON_ERROR_STOP=1', '-At'], value).trim();
  command(['createdb', '-U', 'supabase_admin', '--template=template0', target]);
  try {
    query('drop schema public;');
    query('create schema privacy_guard authorization postgres; revoke all on schema privacy_guard from public,anon,authenticated,service_role; create table privacy_guard.account_erasures(actor_id uuid primary key,deleted_at timestamptz not null default now()); alter table privacy_guard.account_erasures owner to postgres; alter table privacy_guard.account_erasures enable row level security;');
    // This local cluster administrator can preserve managed Auth owners/default
    // privileges. The ordinary application postgres role cannot restore those.
    command(['pg_restore', '-U', 'supabase_admin', '-d', target, '--exit-on-error'], dump);
    assert.equal(query("select to_regprocedure('private.erase_restored_account(uuid)') is not null;"), 't', 'Historical snapshots require the managed restore workflow');
    query(`begin; update private.privacy_configuration set account_deletion_enabled=false; ${records.map(record => `select private.erase_restored_account('${record.actorId}');`).join('\n')} commit;`);
    for (const record of records) assert.equal(query(`select count(*) from auth.users where id='${record.actorId}';`), '0');
    const actor = query("select id from public.profiles where display_name='Stage eight updated';");
    const foreign = query("select c.id from public.conversations c join public.profiles p on p.id=c.user_id where p.display_name='Stage eight B';");
    const cast = query("select id from public.characters where name='Stage 8 test character';");
    for (const value of [actor, foreign, cast]) assert(/^[a-f0-9-]{36}$/.test(value), 'Expected this test snapshot\'s fixture identifiers');
    const rows = query(`select count(*) from public.conversations where character_id='${cast}';
      set role authenticated; select set_config('request.jwt.claims','{"sub":"${actor}"}',false);
      select count(*) from public.conversations where character_id='${cast}';
      select count(*) from public.conversations where id='${foreign}'; select public.is_admin();`).split(/\r?\n/);
    assert.equal(rows[0], '2'); assert.deepEqual(rows.slice(-3), ['1', '0', 't']);
    const stage9=query("select character_id from private.cast_drafts where profile->>'name' like 'Stage9 %' order by updated_at desc limit 1;");
    if(stage9) {
      assert(/^[a-f0-9-]{36}$/.test(stage9));
      const preserved=query(`select count(*) from public.character_assets where character_id='${stage9}';
        select count(*) from private.direction_history where character_id='${stage9}';
        select count(*) from private.capability_controls where character_id='${stage9}';`).split(/\r?\n/);
      assert.deepEqual(preserved,['2','1','1'],'Stage 9 asset ownership, instruction history and character controls survive database restore');
    }
    console.log('Local restore passed: Auth identities, data, owners/grants, trusted role and two-user RLS preserved.');
  } finally {
    // Only the fresh database created above is removed; no reset of the live stack.
    command(['dropdb', '-U', 'supabase_admin', target]);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Supply a local Stage 8 test snapshot path.');
  await restoreLocalBackup(process.argv[2]);
}
