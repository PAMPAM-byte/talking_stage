import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';
import {approvedRequestPolicySql} from '../lib/payments/request-policy.mjs';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`,version='202611030033';
const env=parseEnv(await readFile('.env.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const folder='.local-services/billing-milestones';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{
  const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Billing milestones operation failed; private connection diagnostics suppressed.');}
}
const inspect=`select pg_get_functiondef('private.monetary_request_eligibility(uuid,uuid)'::regprocedure) as definition,
 (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 exists(select 1 from pg_catalog.pg_proc where proname='request_milestone') as installed,
 (select to_jsonb(p) from private.monetary_request_policy p) as policy,
 (select count(*) from public.profiles where not requests_enabled) as opted_out,
 (select count(*) from public.conversations where requests_refused) as refused_chats,
 (select count(*) from public.payment_intents) as payments,
 (select count(*) from public.messages) as messages;`;
const before=(await query(inspect))[0];
if(before.installed){assert(before.versions.includes(version));console.log('Billing milestones are already installed. No changes made.');process.exit(0);}
assert(before.definition.includes('early_chat')&&!before.definition.includes('request_milestone'),'Unexpected eligibility function; inspect before changing it');
const migration=await readFile(`supabase/migrations/${version}_billing_milestones.sql`,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const snapshot={project,version:1,migrationVersion:version,createdAt:new Date().toISOString(),before,migrationHash:hash(migration)};
const key=await readFile('.local-services/hosted-privacy/encryption.key');
const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
console.log(`Read-only preflight: encrypted DDL snapshot verified. Policy now: ${before.policy.enabled?'on':'off'}, first after ${before.policy.minimum_completed_exchanges??'-'} replies. ${before.opted_out} profiles have requests off and ${before.refused_chats} chats are stopped; the migration turns requests on for all profiles and reopens chats stopped only by "no thanks". No payment or chat data exported.`);
if(!process.argv.includes('--apply'))process.exit(0);
const recheck=(await query(inspect))[0];assert.equal(recheck.definition,before.definition,'Verification function changed during preparation');assert.equal(recheck.installed,false);
assert(!recheck.versions.includes(version));
// Apply only this reviewed migration, not other local or remote pending changes.
const sql=migration.replace('begin;','begin;\nset local lock_timeout=\'5s\';\nset local statement_timeout=\'20s\';').replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','billing_milestones',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`);
await query(sql);
const after=(await query(inspect))[0];assert(after.installed);assert(after.versions.includes(version));
assert(after.definition.includes('request_milestone'));
await query(`begin;set local lock_timeout='5s';${approvedRequestPolicySql()}commit;select true as configured;`);
const permissions=(await query(`select has_function_privilege('authenticated','public.finish_gift_reply(uuid,uuid,uuid,text,text,uuid,bigint)','execute') as user_can_finish,(select to_jsonb(p) from private.monetary_request_policy p) as policy,(select count(*) from public.profiles where not requests_enabled) as opted_out;`))[0];
assert.equal(permissions.user_can_finish,false);assert.equal(permissions.policy.enabled,true);assert.equal(permissions.policy.minimum_completed_exchanges,20);assert.equal(Number(permissions.policy.maximum_amount_minor),1000000);assert.equal(Number(permissions.opted_out),0);
await writeFile('docs/billing-milestones-activation.json',JSON.stringify({version,appliedAt:new Date().toISOString(),migrationHash:hash(migration),encryptedDdlSnapshotVerified:true,policy:'20/50/100 then every 30 replies, 1h spacing, NGN 2,000-10,000',requestsOnByDefault:true},null,2)+'\n');
console.log('Installed billing milestones and enabled the approved policy: male and female characters may ask after 20, 50 and 100 replies, then every 30, NGN 2,000-10,000, at most once an hour per chat. Requests are on for every profile; Settings remains the opt-out.');
