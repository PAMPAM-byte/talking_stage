import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`,version='202611020032';
const env=parseEnv(await readFile('.env.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const folder='.local-services/payment-thanks';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{
  const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Payment thanks operation failed; private connection diagnostics suppressed.');}
}
const inspect=`select pg_get_functiondef('public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text)'::regprocedure) as definition,
 (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 exists(select 1 from pg_catalog.pg_proc where proname='claim_payment_thanks') as installed,
 (select count(*) from public.payment_intents) as payments,
 (select count(*) from public.messages) as messages;`;
const before=(await query(inspect))[0];
if(before.installed){assert(before.versions.includes(version));console.log('AI payment thanks are already installed. No changes made.');process.exit(0);}
assert(before.definition.includes('apply_before_payment_acknowledgement')&&before.definition.includes('Payment confirmed'),'Unexpected verification function; inspect before changing it');
const migration=await readFile(`supabase/migrations/${version}_payment_thanks.sql`,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const snapshot={project,version:1,migrationVersion:version,createdAt:new Date().toISOString(),before,migrationHash:hash(migration)};
const key=await readFile('.local-services/hosted-privacy/encryption.key');
const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
console.log(`Read-only preflight: existing verification function preserved, encrypted DDL snapshot verified; ${before.payments} existing payment records remain unchanged. No payment or chat data exported.`);
if(!process.argv.includes('--apply'))process.exit(0);
const recheck=(await query(inspect))[0];assert.equal(recheck.definition,before.definition,'Verification function changed during preparation');assert.equal(recheck.installed,false);
assert(!recheck.versions.includes(version));
// Apply only this reviewed migration, not other local or remote pending changes.
const sql=migration.replace('begin;','begin;\nset local lock_timeout=\'5s\';\nset local statement_timeout=\'20s\';').replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','payment_thanks',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`);
await query(sql);
const after=(await query(inspect))[0];assert(after.installed);assert(after.versions.includes(version));
assert(after.definition.includes('apply_before_payment_acknowledgement')&&!after.definition.includes('Payment confirmed'));
const permissions=(await query(`select has_function_privilege('authenticated','public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text)','execute') as user_can_verify,has_function_privilege('service_role','public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text)','execute') as service_can_verify,has_function_privilege('authenticated','public.claim_payment_thanks(uuid,text)','execute') as user_can_claim,(select count(*) from private.payment_acknowledgements where thanked_at is null) as pending;`))[0];
assert.equal(permissions.user_can_verify,false);assert.equal(permissions.service_can_verify,true);assert.equal(permissions.user_can_claim,false);assert.equal(Number(permissions.pending),0,'Existing payments must stay thanked');
await writeFile('docs/payment-thanks-activation.json',JSON.stringify({version,appliedAt:new Date().toISOString(),migrationHash:hash(migration),encryptedDdlSnapshotVerified:true,serviceOnlyVerificationVerified:true,existingPaymentsNotReplayed:true},null,2)+'\n');
console.log('Installed AI-written payment thanks with the fixed thanks as fallback. Service-only functions confirmed. Existing payments stay thanked and no payment status changed.');
