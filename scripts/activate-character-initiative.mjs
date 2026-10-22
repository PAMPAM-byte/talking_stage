import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';
const project=(await readFile('supabase/.temp/project-ref','utf8')).trim();assert.match(project,/^[a-z]{20}$/);
assert.equal(parseEnv(await readFile('.env.local','utf8')).NEXT_PUBLIC_SUPABASE_URL,`https://${project}.supabase.co`);
const folder='.local-services/character-initiative';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});try{
 const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Character initiation deployment unavailable; private diagnostics suppressed.');}}
const inspect=`select pg_get_functiondef('public.claim_reply(uuid,uuid,text)'::regprocedure) as claim,
 pg_get_functiondef('public.save_user_message(uuid,uuid,integer,text)'::regprocedure) as save,
 pg_get_functiondef('public.conversation_thread(uuid,bigint)'::regprocedure) as thread,
 (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions;`;
const before=(await query(inspect))[0];assert(before.versions.includes('202610210026'));
const version='202610210027',name='character_initiative';
if(before.versions.includes(version)){console.log('Character initiation already installed. No changes made.');}else{
 const sql=await readFile(`supabase/migrations/${version}_${name}.sql`,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
 const snapshot={version:1,project,before,createdAt:new Date().toISOString(),migration:{version,name,hash}};
 const key=await readFile('.local-services/hosted-privacy/encryption.key');const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
 await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
 console.log('Character initiation preflight passed. Encrypted DDL snapshot verified; no chat content exported.');
 if(process.argv.includes('--apply')){
  const recheck=(await query(inspect))[0];assert.equal(recheck.claim,before.claim);assert.equal(recheck.save,before.save);assert.equal(recheck.thread,before.thread);
  await query(sql.replace('begin;',"begin;\nset local lock_timeout='5s';\nset local statement_timeout='20s';").replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`));
  const after=(await query(inspect))[0];assert(after.versions.includes(version));assert(after.claim.includes('gender'));assert(after.thread.includes('message_quote'));assert(after.save.includes('save_quoted_user_message'));
  const grants=(await query("select has_function_privilege('anon','public.claim_character_initiative(uuid,text,boolean,uuid)','execute') as anonymous,has_function_privilege('authenticated','public.claim_character_initiative(uuid,text,boolean,uuid)','execute') as member,has_function_privilege('authenticated','public.finish_quoted_reply(uuid,uuid,uuid,text,text,uuid,uuid,bigint,uuid,text)','execute') as member_finish,has_function_privilege('service_role','public.finish_quoted_reply(uuid,uuid,uuid,text,text,uuid,uuid,bigint,uuid,text)','execute') as service_finish;"))[0];
  assert.equal(grants.anonymous,false);assert.equal(grants.member,false);assert.equal(grants.member_finish,false);assert.equal(grants.service_finish,true);
  await writeFile('docs/character-initiative-activation.json',JSON.stringify({appliedAt:new Date().toISOString(),migration:snapshot.migration,encryptedDdlSnapshotVerified:true,serviceOnlyInitiativeAndGenderContextVerified:true,noMessagesGenerated:true},null,2)+'\n');
  console.log('Character initiation and gender context installed. Existing messages were preserved; no replies generated.');
 }
}

// A lost response can follow a committed migration. Reconcile and verify on
// every resume instead of rerunning DDL or claiming an unverified completion.
const installed=(await query(inspect))[0];
if(installed.versions.includes(version)){
 assert(installed.claim.includes('gender'));
 const privileges=(await query("select to_regclass('private.one_character_opener') is not null as opener_guard,has_function_privilege('authenticated','public.claim_character_initiative(uuid,text,boolean,uuid)','execute') as member,has_function_privilege('service_role','public.claim_character_initiative(uuid,text,boolean,uuid)','execute') as worker;"))[0];
 assert(privileges.opener_guard);assert.equal(privileges.member,false);assert.equal(privileges.worker,true);
 const hash=createHash('sha256').update(await readFile(`supabase/migrations/${version}_${name}.sql`,'utf8')).digest('hex');
 let backupVerified=false;const encryptionKey=await readFile('.local-services/hosted-privacy/encryption.key');
 for(const file of (await readdir(folder)).filter(file=>file.endsWith('.tshback'))){const snapshot=decryptBundle(await readFile(`${folder}/${file}`),encryptionKey,project);if(snapshot.migration?.hash===hash&&snapshot.migration?.version===version)backupVerified=true;}
 assert(backupVerified);
 await writeFile('docs/character-initiative-activation.json',JSON.stringify({verifiedAt:new Date().toISOString(),migration:{version,name,hash},encryptedDdlSnapshotVerified:true,serviceOnlyInitiativeAndGenderContextVerified:true,oneOpenerGuardVerified:true,noMessagesGenerated:true},null,2)+'\n');
 console.log('Verified deployed first-message guard, gender context and service-only permissions. No replies generated.');
}
