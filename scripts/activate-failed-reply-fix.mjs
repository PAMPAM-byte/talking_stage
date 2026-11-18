import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`,version='202611180048';
const env=parseEnv(await readFile('.env.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const folder='.local-services/failed-reply-fix';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{
  const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Failed-reply fix failed; private connection diagnostics suppressed.');}
}
const inspect=`select pg_get_functiondef('private.claim_text_reply(uuid,uuid,text)'::regprocedure) as definition,
 (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 pg_get_functiondef('private.claim_text_reply(uuid,uuid,text)'::regprocedure) like '%older.state<>''failed''%' as installed,
 (select count(*) from private.reply_jobs where state='failed') as failed_replies,
 (select count(*) from public.messages) as messages;`;
const before=(await query(inspect))[0];
if(before.installed){assert(before.versions.includes(version));console.log('Failed-reply fix is already installed. No changes made.');process.exit(0);}
assert(before.definition.includes('earlier_reply_pending'),'Unexpected claim function; inspect before changing it');
const migration=await readFile(`supabase/migrations/${version}_failed_reply_unblocks.sql`,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const snapshot={project,version:1,migrationVersion:version,createdAt:new Date().toISOString(),before,migrationHash:hash(migration)};
const key=await readFile('.local-services/hosted-privacy/encryption.key');
const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
console.log('Read-only preflight: reply claim function recognised, encrypted DDL snapshot verified. No chat data exported.');
if(!process.argv.includes('--apply'))process.exit(0);
const recheck=(await query(inspect))[0];assert.equal(recheck.definition,before.definition,'Verification function changed during preparation');assert.equal(recheck.installed,false);
assert(!recheck.versions.includes(version));
// Apply only this reviewed migration, not other local or remote pending changes.
const sql=migration.replace('begin;','begin;\nset local lock_timeout=\'5s\';\nset local statement_timeout=\'20s\';').replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','failed_reply_unblocks',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`);
await query(sql);
const after=(await query(inspect))[0];assert(after.installed);assert(after.versions.includes(version));
assert((await query(`select pg_get_functiondef('private.claim_text_reply(uuid,uuid,text)'::regprocedure) like '%older.state<>''failed''%' as ok;`))[0].ok);
const permissions=(await query(`select has_function_privilege('authenticated','private.claim_text_reply(uuid,uuid,text)','execute') as users_claim,has_function_privilege('service_role','private.claim_text_reply(uuid,uuid,text)','execute') as service_claims;`))[0];
assert.equal(permissions.users_claim,false);assert.equal(permissions.service_claims,false);
await writeFile('docs/failed-reply-fix-activation.json',JSON.stringify({version,appliedAt:new Date().toISOString(),migrationHash:hash(migration),encryptedDdlSnapshotVerified:true,grantsKept:true},null,2)+'\n');
console.log('Installed the failed-reply fix. Stuck chats answer the newest message when they are next opened.');
