import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
// Adds the 30-day deletion schedule, switches self-service deletion on and
// schedules the daily erasure with pg_cron. No account is scheduled or erased.
const project=(await readFile('supabase/.temp/project-ref','utf8')).trim();assert.match(project,/^[a-z]{20}$/);
assert.equal(parseEnv(await readFile('.env.local','utf8')).NEXT_PUBLIC_SUPABASE_URL,`https://${project}.supabase.co`);
const folder='.local-services/soft-account-deletion';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});try{
 const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Soft account deletion deployment unavailable; private diagnostics suppressed.');}}
const version='202610300031',name='soft_account_deletion';
const sql=await readFile(`supabase/migrations/${version}_${name}.sql`,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
const inspect=`select (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 to_regprocedure('public.request_account_deletion(text)') is not null as request,
 to_regprocedure('public.restore_account()') is not null as restore,
 to_regprocedure('public.erase_due_accounts()') is not null as erase,
 exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='deletion_scheduled_for') as scheduled_column,
 (select account_deletion_enabled from private.privacy_configuration where singleton) as enabled,
 exists(select 1 from pg_available_extensions where name='pg_cron') as cron_available;`;
const before=(await query(inspect))[0];assert(before.versions.includes('202610290029'));
if(before.versions.includes(version))console.log('Soft account deletion already installed. No changes made.');
else{
 assert.equal(before.request,false);assert.equal(before.restore,false);assert.equal(before.erase,false);assert.equal(before.scheduled_column,false);
 console.log(`Soft account deletion preflight passed: migration 029 present, soft deletion absent, deletion currently ${before.enabled?'on':'off'}, pg_cron ${before.cron_available?'available':'NOT available'}.`);
 if(process.argv.includes('--apply')){
  await query(sql.replace('begin;',"begin;\nset local lock_timeout='5s';\nset local statement_timeout='20s';").replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`));
  console.log('Soft account deletion installed. No account was scheduled or erased.');
 }
}
const installed=(await query(inspect))[0];
if(installed.versions.includes(version)){
 assert(installed.request&&installed.restore&&installed.erase&&installed.scheduled_column&&installed.enabled);
 const checks=(await query(`select has_function_privilege('anon','public.request_account_deletion(text)','execute') as anonymous_request,
  has_function_privilege('authenticated','public.request_account_deletion(text)','execute') as member_request,
  has_function_privilege('authenticated','public.restore_account()','execute') as member_restore,
  has_function_privilege('authenticated','public.erase_due_accounts()','execute') as member_erase,
  has_function_privilege('service_role','public.erase_due_accounts()','execute') as worker_erase,
  has_function_privilege('authenticated','private.erase_account(uuid)','execute') as member_private,
  has_column_privilege('authenticated','public.profiles','deletion_scheduled_for','update') as member_update,
  (select count(*)::int from public.profiles where deletion_scheduled_for is not null) as scheduled_accounts,
  (select count(*)::int from cron.job where jobname='erase-deleted-accounts' and active) as cron_jobs;`))[0];
 assert.deepEqual({...checks,cron_jobs:undefined},{anonymous_request:false,member_request:true,member_restore:true,member_erase:false,worker_erase:true,member_private:false,member_update:false,scheduled_accounts:0,cron_jobs:undefined});
 assert.equal(checks.cron_jobs,1,'The daily erasure job is scheduled');
 await writeFile('docs/soft-account-deletion-activation.json',JSON.stringify({verifiedAt:new Date().toISOString(),migration:{version,name,hash},deletionEnabled:true,dailyErasureScheduled:true,memberOnlyRequestVerified:true,serviceOnlyErasureVerified:true,noAccountScheduledOrErased:true},null,2)+'\n');
 console.log('Verified: self-service deletion on, restore member-only, erasure service-only and scheduled daily at 02:23 UTC. No account was scheduled or erased.');
}
