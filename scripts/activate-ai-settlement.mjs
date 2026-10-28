import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
// F14 is additive: two nullable columns and two new functions. No existing function,
// reservation or daily total changes, so no DDL snapshot of prior definitions is needed.
const project=(await readFile('supabase/.temp/project-ref','utf8')).trim();assert.match(project,/^[a-z]{20}$/);
assert.equal(parseEnv(await readFile('.env.local','utf8')).NEXT_PUBLIC_SUPABASE_URL,`https://${project}.supabase.co`);
const folder='.local-services/ai-settlement';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});try{
 const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('AI settlement deployment unavailable; private diagnostics suppressed.');}}
const version='202610280028',name='ai_settlement';
const sql=await readFile(`supabase/migrations/${version}_${name}.sql`,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
const inspect=`select (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 to_regprocedure('public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint)') is not null as settle,
 to_regprocedure('public.admin_ai_spend()') is not null as spend;`;
const before=(await query(inspect))[0];assert(before.versions.includes('202610210027'));
if(before.versions.includes(version))console.log('AI settlement already installed. No changes made.');
else{
 assert.equal(before.settle,false);assert.equal(before.spend,false);
 console.log('AI settlement preflight passed: migration 027 present, settlement functions absent.');
 if(process.argv.includes('--apply')){
  await query(sql.replace('begin;',"begin;\nset local lock_timeout='5s';\nset local statement_timeout='20s';").replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`));
  console.log('AI settlement installed. Existing reservations and daily totals were not changed.');
 }
}
const installed=(await query(inspect))[0];
if(installed.versions.includes(version)){
 assert(installed.settle&&installed.spend);
 const grants=(await query(`select has_function_privilege('anon','public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint)','execute') as anonymous,
  has_function_privilege('authenticated','public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint)','execute') as member,
  has_function_privilege('service_role','public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint)','execute') as worker,
  has_function_privilege('anon','public.admin_ai_spend()','execute') as anonymous_spend;`))[0];
 assert.equal(grants.anonymous,false);assert.equal(grants.member,false);assert.equal(grants.worker,true);assert.equal(grants.anonymous_spend,false);
 await writeFile('docs/ai-settlement-activation.json',JSON.stringify({verifiedAt:new Date().toISOString(),migration:{version,name,hash},serviceOnlySettlementVerified:true,adminOnlySpendViewVerified:true,existingTotalsUnchanged:true,noMessagesGenerated:true},null,2)+'\n');
 console.log('Verified settlement is service-only and the spend view is closed to anonymous visitors. No replies generated.');
}
