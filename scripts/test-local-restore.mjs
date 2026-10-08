import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function restoreLocalBackup(path) {
  const container = 'supabase_db_talking_stage';
  const target = `stage8_restore_${randomUUID().replaceAll('-', '_')}`;
  assert(/^stage8_restore_[a-f0-9_]+$/.test(target));
  const dump = readFileSync(path);
  const command = (args, input) => execFileSync('docker', ['exec', ...(input ? ['-i'] : []), container, ...args], { input, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const query = (value) => command(['psql', '-U', 'supabase_admin', '-d', target, '-v', 'ON_ERROR_STOP=1', '-At'], value).trim();
  command(['createdb', '-U', 'supabase_admin', '--template=template0', target]);
  try {
    query('drop schema public;');
    // This local cluster administrator can preserve managed Auth owners/default
    // privileges. The ordinary application postgres role cannot restore those.
    command(['pg_restore', '-U', 'supabase_admin', '-d', target, '--exit-on-error'], dump);
    const actor = query("select id from public.profiles where display_name='Stage eight updated';");
    const foreign = query("select c.id from public.conversations c join public.profiles p on p.id=c.user_id where p.display_name='Stage eight B';");
    const cast = query("select id from public.characters where name='Stage 8 test character';");
    for (const value of [actor, foreign, cast]) assert(/^[a-f0-9-]{36}$/.test(value), 'Expected this test snapshot\'s fixture identifiers');
    const rows = query(`select count(*) from public.conversations where character_id='${cast}';
      set role authenticated; select set_config('request.jwt.claims','{"sub":"${actor}"}',false);
      select count(*) from public.conversations where character_id='${cast}';
      select count(*) from public.conversations where id='${foreign}'; select public.is_admin();`).split(/\r?\n/);
    assert.equal(rows[0], '2'); assert.deepEqual(rows.slice(-3), ['1', '0', 't']);
    console.log('Local restore passed: Auth identities, data, owners/grants, trusted role and two-user RLS preserved.');
  } finally {
    // Only the fresh database created above is removed; no reset of the live stack.
    command(['dropdb', '-U', 'supabase_admin', target]);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Supply a local Stage 8 test snapshot path.');
  restoreLocalBackup(process.argv[2]);
}
