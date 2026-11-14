import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';

// Like-back notifications (14 Nov 2026). Without flags: read-only preflight. --apply installs the
// migration, generates the push signing keys and the dispatch secret straight into the private
// table (never printed or saved), and schedules the sender at :00 and :30 with pg_cron + pg_net.
const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`,version='202611140045';
const site='https://www.talkingstage.buzz',endpoint=`${site}/api/notifications/likes`;
const env=parseEnv(await readFile('.env.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const folder='.local-services/like-notifications';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql,{sensitive=false}={}){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{
  const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Like notifications operation failed; private connection diagnostics suppressed.');}
 finally{if(sensitive)await rm(path,{force:true});}
}
const inspect=`select (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 exists(select 1 from pg_catalog.pg_proc where proname='like_character') as likes_installed,
 exists(select 1 from pg_catalog.pg_proc where proname='claim_like_notifications') as installed,
 exists(select 1 from pg_available_extensions where name='pg_net') as pg_net_available,
 exists(select 1 from pg_available_extensions where name='pg_cron') as pg_cron_available;`;
const before=(await query(inspect))[0];
assert(before.likes_installed,'Install likes and coins first');
assert(before.pg_net_available&&before.pg_cron_available,'pg_net and pg_cron are needed for the half-hourly sender');
const migration=await readFile(`supabase/migrations/${version}_like_notifications.sql`,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
if(before.installed){
 assert(before.versions.includes(version));
 const state=(await query(`select (secret is not null and vapid_private is not null) as keys,url,last_run_at,last_sent,(select count(*) from private.push_subscriptions) as devices,
  (select count(*) from cron.job where jobname='like-notifications') as scheduled from private.notification_dispatch;`))[0];
 console.log(`Like notifications installed. Keys set: ${state.keys}. Scheduled: ${state.scheduled==1}. Devices: ${state.devices}. Last run: ${state.last_run_at??'never'} (${state.last_sent??0} people). No changes made.`);
 process.exit(0);
}
const snapshot={project,version:1,migrationVersion:version,createdAt:new Date().toISOString(),before,migrationHash:hash(migration)};
const key=await readFile('.local-services/hosted-privacy/encryption.key');
const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
console.log('Read-only preflight: likes installed, pg_net and pg_cron available, encrypted snapshot verified. No chat data exported.');
if(!process.argv.includes('--apply'))process.exit(0);
const recheck=(await query(inspect))[0];assert.equal(recheck.installed,false);assert(!recheck.versions.includes(version));
// Apply only this reviewed migration.
const sql=migration.replace('begin;','begin;\nset local lock_timeout=\'5s\';\nset local statement_timeout=\'20s\';').replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','like_notifications',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`);
await query(sql);
// Keys and secret: generated here, sent once, never printed or kept on disk.
const vapid=webpush.generateVAPIDKeys();const secret=randomBytes(32).toString('base64url');
const quote=value=>`'${String(value).replace(/'/g,"''")}'`;
await query(`update private.notification_dispatch set url=${quote(endpoint)},secret=${quote(secret)},vapid_public=${quote(vapid.publicKey)},vapid_private=${quote(vapid.privateKey)}; select true as ok;`,{sensitive:true});
await query(`create extension if not exists pg_net;
 select cron.unschedule(jobid) from cron.job where jobname='like-notifications';
 select cron.schedule('like-notifications','0,30 * * * *','select private.dispatch_like_notifications()') as job;`);
const after=(await query(`select exists(select 1 from pg_catalog.pg_proc where proname='claim_like_notifications') as installed,
 (select secret is not null and length(secret)>=32 and vapid_private is not null and url=${quote(endpoint)} from private.notification_dispatch) as configured,
 (select count(*)=1 from cron.job where jobname='like-notifications' and schedule='0,30 * * * *') as scheduled,
 has_function_privilege('authenticated','public.dispatch_config(text)','execute') as users_read_keys,
 has_function_privilege('anon','public.likes_pulse()','execute') as anon_pulse;`))[0];
assert(after.installed&&after.configured&&after.scheduled);assert.equal(after.users_read_keys,false);assert.equal(after.anon_pulse,false);
await writeFile('docs/like-notifications-activation.json',JSON.stringify({version,appliedAt:new Date().toISOString(),migrationHash:hash(migration),encryptedDdlSnapshotVerified:true,keysGeneratedAndStoredPrivately:true,schedule:'0,30 * * * * (UTC)',sender:endpoint},null,2)+'\n');
console.log('Installed like-back notifications: keys stored privately, sender scheduled at :00 and :30. Pushes start once the app update is live.');
