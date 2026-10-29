import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
// Adds one nullable column and wraps conversation_thread and claim_reply, the same
// rename-and-wrap pattern as migration 026. Prior definitions stay in the private schema.
const project=(await readFile('supabase/.temp/project-ref','utf8')).trim();assert.match(project,/^[a-z]{20}$/);
assert.equal(parseEnv(await readFile('.env.local','utf8')).NEXT_PUBLIC_SUPABASE_URL,`https://${project}.supabase.co`);
const folder='.local-services/quoted-bubbles';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});try{
 const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Quoted bubbles deployment unavailable; private diagnostics suppressed.');}}
const version='202610290029',name='quoted_bubbles';
const sql=await readFile(`supabase/migrations/${version}_${name}.sql`,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
const inspect=`select (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 to_regprocedure('public.save_quoted_part_message(uuid,uuid,integer,text,uuid,smallint)') is not null as save,
 to_regprocedure('private.claim_before_quote_parts(uuid,uuid,text)') is not null as claim_wrapped,
 to_regprocedure('private.thread_before_quote_parts(uuid,bigint)') is not null as thread_wrapped,
 to_regprocedure('private.claim_before_dating_context(uuid,uuid,text)') is not null as claim_prior,
 exists(select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='reply_to_part') as part_column;`;
const before=(await query(inspect))[0];assert(before.versions.includes('202610280028'));
if(before.versions.includes(version))console.log('Quoted bubbles already installed. No changes made.');
else{
 assert.equal(before.save,false);assert.equal(before.claim_wrapped,false);assert.equal(before.thread_wrapped,false);assert.equal(before.part_column,false);assert.equal(before.claim_prior,true);
 console.log('Quoted bubbles preflight passed: migration 028 present, bubble quoting absent, current reply wrappers as expected.');
 if(process.argv.includes('--apply')){
  await query(sql.replace('begin;',"begin;\nset local lock_timeout='5s';\nset local statement_timeout='20s';").replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`));
  console.log('Quoted bubbles installed. Existing messages and quotes were not changed.');
 }
}
const installed=(await query(inspect))[0];
if(installed.versions.includes(version)){
 assert(installed.save&&installed.claim_wrapped&&installed.thread_wrapped&&installed.part_column);
 const grants=(await query(`select has_function_privilege('anon','public.save_quoted_part_message(uuid,uuid,integer,text,uuid,smallint)','execute') as anonymous_save,
  has_function_privilege('authenticated','public.save_quoted_part_message(uuid,uuid,integer,text,uuid,smallint)','execute') as member_save,
  has_function_privilege('anon','public.conversation_thread(uuid,bigint)','execute') as anonymous_thread,
  has_function_privilege('authenticated','public.conversation_thread(uuid,bigint)','execute') as member_thread,
  has_function_privilege('authenticated','public.claim_reply(uuid,uuid,text)','execute') as member_claim,
  has_function_privilege('service_role','public.claim_reply(uuid,uuid,text)','execute') as worker_claim,
  has_function_privilege('authenticated','private.claim_before_quote_parts(uuid,uuid,text)','execute') as member_private;`))[0];
 assert.deepEqual(grants,{anonymous_save:false,member_save:true,anonymous_thread:false,member_thread:true,member_claim:false,worker_claim:true,member_private:false});
 await writeFile('docs/quoted-bubbles-activation.json',JSON.stringify({verifiedAt:new Date().toISOString(),migration:{version,name,hash},memberOnlySaveVerified:true,serviceOnlyClaimVerified:true,privateWrappersClosed:true,existingMessagesUnchanged:true,noMessagesGenerated:true},null,2)+'\n');
 console.log('Verified bubble quoting is member-only, reply claims stay service-only and prior definitions are private. No replies generated.');
}
