import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`,version='202611030039';
const env=parseEnv(await readFile('.env.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const folder='.local-services/payment-ai-credit';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{
  const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Payment AI credit operation failed; private connection diagnostics suppressed.');}
}
const inspect=`select pg_get_functiondef('public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint)'::regprocedure) as definition,
 (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 exists(select 1 from pg_catalog.pg_proc where proname='credit_paid_ai_allowance') as installed,
 (select count(*) from public.payment_intents where status='paid') as paid_payments;`;
const before=(await query(inspect))[0];
if(before.installed){assert(before.versions.includes(version));console.log('Payment AI credit is already installed. No changes made.');process.exit(0);}
assert(before.definition.includes('greatest(amount_micro_usd-refund,0)'),'Unexpected settle_ai_usage; inspect before changing it');
const migration=await readFile(`supabase/migrations/${version}_payment_ai_credit.sql`,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const snapshot={project,version:1,migrationVersion:version,createdAt:new Date().toISOString(),before,migrationHash:hash(migration)};
const key=await readFile('.local-services/hosted-privacy/encryption.key');
const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
console.log('Read-only preflight: settlement function recognised, encrypted DDL snapshot verified. No chat data exported.');
if(!process.argv.includes('--apply'))process.exit(0);
const recheck=(await query(inspect))[0];assert.equal(recheck.definition,before.definition,'Settlement function changed during preparation');assert.equal(recheck.installed,false);
assert(!recheck.versions.includes(version));
// Apply only this reviewed migration, not other local or remote pending changes.
const sql=migration.replace('begin;','begin;\nset local lock_timeout=\'5s\';\nset local statement_timeout=\'20s\';').replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','payment_ai_credit',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`);
await query(sql);
const after=(await query(inspect))[0];assert(after.installed);assert(after.versions.includes(version));
assert(after.definition.includes('ai_payment_credits'),'Settlement still floors personal credit');
const checks=(await query(`select exists(select 1 from pg_catalog.pg_trigger where tgname='credit_paid_ai_allowance' and not tgisinternal) as trigger_on,
 has_table_privilege('authenticated','private.ai_payment_credits','select') as user_can_read;`))[0];
assert.equal(checks.trigger_on,true);assert.equal(checks.user_can_read,false);
await writeFile('docs/payment-ai-credit-activation.json',JSON.stringify({version,appliedAt:new Date().toISOString(),migrationHash:hash(migration),encryptedDdlSnapshotVerified:true,privateLedgerVerified:true},null,2)+'\n');
console.log('Installed: each confirmed live payment now adds $0.40 per ₦1,000 to that person\'s AI limit for the day. Site limit unchanged; credit ledger private.');
