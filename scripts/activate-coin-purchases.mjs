import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`,version='202611140046';
const env=parseEnv(await readFile('.env.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const folder='.local-services/coin-purchases';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{
  const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Coin purchases operation failed; private connection diagnostics suppressed.');}
}
const inspect=`select pg_get_functiondef('public.reserve_gift(uuid,uuid,bigint,uuid,text,text)'::regprocedure) as definition,
 (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 exists(select 1 from pg_catalog.pg_proc where proname='reserve_coin_purchase') as installed,
 exists(select 1 from pg_catalog.pg_proc where proname='like_character') as likes_installed,
 (select jsonb_build_object('enabled',enabled,'environment',environment,'max',maximum_amount_minor,'recipient',recipient_name is not null) from private.bachs_configuration) as bachs,
 (select count(*) from public.payment_intents) as gifts,
 (select count(*) from public.messages) as messages;`;
const before=(await query(inspect))[0];
if(before.installed){assert(before.versions.includes(version));const p=(await query(`select count(*) filter(where status='paid') as paid,count(*) as total,count(*) filter(where needs_review) as review from private.coin_purchases;`))[0];console.log(`Coin purchases installed. Purchases: ${p.total} (${p.paid} paid, ${p.review} need review). No changes made.`);process.exit(0);}
assert(before.likes_installed,'Install likes and coins first');
console.log(`Bachs: ${before.bachs.enabled?'on':'off'}, ${before.bachs.environment}, up to ${Math.min(1000,Math.floor((before.bachs.max??0)/5000))} coins per purchase.`);
assert(before.bachs.enabled&&before.bachs.recipient,'Bachs payments must be on');assert((before.bachs.max??0)>=50000,'The Bachs maximum must allow at least ₦500 (10 coins)');
assert(before.definition.includes('payments_paused'),'Unexpected gift functions; inspect before changing it');
const migration=await readFile(`supabase/migrations/${version}_coin_purchases.sql`,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const snapshot={project,version:1,migrationVersion:version,createdAt:new Date().toISOString(),before,migrationHash:hash(migration)};
const key=await readFile('.local-services/hosted-privacy/encryption.key');
const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
console.log('Read-only preflight: payments recognised, encrypted DDL snapshot verified. No chat or payment data exported.');
if(!process.argv.includes('--apply'))process.exit(0);
const recheck=(await query(inspect))[0];assert.equal(recheck.definition,before.definition,'Verification function changed during preparation');assert.equal(recheck.installed,false);
assert(!recheck.versions.includes(version));
// Apply only this reviewed migration, not other local or remote pending changes.
const sql=migration.replace('begin;','begin;\nset local lock_timeout=\'5s\';\nset local statement_timeout=\'20s\';').replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','coin_purchases',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`);
await query(sql);
const after=(await query(inspect))[0];assert(after.installed);assert(after.versions.includes(version));
assert((await query(`select exists(select 1 from pg_catalog.pg_proc where proname='apply_coin_verification') as ok;`))[0].ok);
const permissions=(await query(`select has_function_privilege('authenticated','public.reserve_coin_purchase(uuid,integer,uuid,text,text)','execute') as users_reserve,has_function_privilege('authenticated','public.apply_coin_verification(uuid,text,text,text,timestamptz,text,text)','execute') as users_verify,has_function_privilege('anon','public.coin_shop()','execute') as anon_shop;`))[0];
assert.equal(permissions.users_reserve,false);assert.equal(permissions.users_verify,false);assert.equal(permissions.anon_shop,false);
await writeFile('docs/coin-purchases-activation.json',JSON.stringify({version,appliedAt:new Date().toISOString(),migrationHash:hash(migration),encryptedDdlSnapshotVerified:true,ledgerStepsServiceOnly:true,priceMinorPerCoin:5000,minimumCoins:10},null,2)+'\n');
console.log('Installed coin purchases: ₦50 a coin, 10 or more, through Bachs. Buying opens once the app update is live.');
