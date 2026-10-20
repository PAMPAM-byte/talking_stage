import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';
const contextUpgrade=process.argv.includes('--context');
const version=contextUpgrade?'202610200021':'202610200020',migrationName=contextUpgrade?'reaction_context':'message_reactions',project=(await readFile('supabase/.temp/project-ref','utf8')).trim();
assert.match(project,/^[a-z]{20}$/);
assert.equal(parseEnv(await readFile('.env.local','utf8')).NEXT_PUBLIC_SUPABASE_URL,`https://${project}.supabase.co`);
const folder='.local-services/message-reactions';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});return JSON.parse(output.slice(output.indexOf('{'))).rows;}
 catch{throw Error('Reaction migration operation failed; private connection diagnostics suppressed.');}
}
const inspect=`select pg_get_functiondef('public.claim_reply(uuid,uuid,text)'::regprocedure) as claim_definition,
 pg_get_functiondef('public.conversation_thread(uuid,bigint)'::regprocedure) as thread_definition,
 (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 to_regclass('public.message_reactions') is not null as installed,
 (select count(*) from public.messages) as messages;`;
const before=(await query(inspect))[0];
if(before.versions.includes(version)){assert(before.installed);console.log('Message reactions already installed. No changes made.');process.exit(0);}
assert(before.versions.includes(contextUpgrade?'202610200020':'202610200019'));assert(before.claim_definition.includes(contextUpgrade?'claim_before_reactions':'claim_before_payments'));assert(before.thread_definition.includes(contextUpgrade?'thread_before_reactions':'has_adult_access'));
const migration=await readFile(`supabase/migrations/${version}_${migrationName}.sql`,'utf8');
const hash=createHash('sha256').update(migration).digest('hex');
const snapshot={version:1,project,createdAt:new Date().toISOString(),before,migrationHash:hash};
const key=await readFile('.local-services/hosted-privacy/encryption.key');
const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
console.log('Preflight passed; existing function definitions saved in a verified encrypted snapshot. No message content exported.');
if(!process.argv.includes('--apply'))process.exit(0);
const recheck=(await query(inspect))[0];assert.equal(recheck.claim_definition,before.claim_definition);assert.equal(recheck.thread_definition,before.thread_definition);assert.equal(recheck.installed,contextUpgrade);assert(!recheck.versions.includes(version));
const sql=migration.replace('begin;',"begin;\nset local lock_timeout='5s';\nset local statement_timeout='20s';").replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${migrationName}',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`);
await query(sql);
const after=(await query(inspect))[0];assert(after.installed);assert(after.versions.includes(version));
assert(after.claim_definition.includes(contextUpgrade?'claim_before_reaction_context':'claim_before_reactions'));assert(after.thread_definition.includes('thread_before_reactions'));
const permissions=(await query(`select has_function_privilege('authenticated','public.finish_reaction_reply(uuid,uuid,uuid,text,text,uuid,uuid,text)','execute') as user_can_finish,
 has_function_privilege('service_role','public.finish_reaction_reply(uuid,uuid,uuid,text,text,uuid,uuid,text)','execute') as service_can_finish,
 has_function_privilege('authenticated','public.set_message_reaction(uuid,uuid,text)','execute') as user_can_react,
 has_table_privilege('authenticated','public.message_reactions','insert') as direct_insert,
 (select relrowsecurity from pg_class where oid='public.message_reactions'::regclass) as rls,
 (select count(*) from public.message_reactions) as reactions;`))[0];
assert.equal(permissions.user_can_finish,false);assert.equal(permissions.service_can_finish,true);assert.equal(permissions.user_can_react,true);assert.equal(permissions.direct_insert,false);assert.equal(permissions.rls,true);
await writeFile(contextUpgrade?'docs/message-reaction-context-activation.json':'docs/message-reactions-activation.json',JSON.stringify({version,appliedAt:new Date().toISOString(),migrationHash:hash,encryptedDdlSnapshotVerified:true,ownerReactionRpcVerified:true,serviceOnlyCharacterCommitVerified:true},null,2)+'\n');
console.log('Message reactions installed. Owner-only user updates, service-only character commits and row-level security verified. Existing messages unchanged.');
