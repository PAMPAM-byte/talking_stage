import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`,version='202611140044';
const env=parseEnv(await readFile('.env.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const folder='.local-services/likes-and-coins';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{
  const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Likes and coins operation failed; private connection diagnostics suppressed.');}
}
const inspect=`select pg_get_functiondef('public.start_conversation(uuid)'::regprocedure) as definition,
 (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
 exists(select 1 from pg_catalog.pg_proc where proname='like_character') as installed,
 (select count(*) from public.conversations) as conversations,
 (select count(*) from public.messages) as messages;`;
const before=(await query(inspect))[0];
// Switch: --enable turns Like and coins on for everyone (only after the app code is live); --disable turns them off.
const toggle=process.argv.includes('--enable')?true:process.argv.includes('--disable')?false:null;
const enabled=async()=>(await query(`select enabled from private.likes_configuration;`))[0].enabled;
if(before.installed){
 assert(before.versions.includes(version));before.enabled=await enabled();
 if(toggle===null){console.log(`Likes and coins are installed and ${before.enabled?'ON':'OFF'}. No changes made.`);process.exit(0);}
 await query(`update private.likes_configuration set enabled=${toggle},updated_at=now(); select true as ok;`);
 assert.equal(await enabled(),toggle);
 const record=JSON.parse(await readFile('docs/likes-and-coins-activation.json','utf8').catch(()=>'{}'));
 await writeFile('docs/likes-and-coins-activation.json',JSON.stringify({...record,enabled:toggle,switchedAt:new Date().toISOString()},null,2)+'\n');
 console.log(toggle?'Likes and coins are ON: Discover shows Like, the Likes tab appears, new chats need a like back and 1 coin.':'Likes and coins are OFF: Discover is back to Meet; coins and likes are kept.');
 process.exit(0);
}
assert(before.definition.includes('limit_conversation_mutation')&&!before.definition.includes('coin'),'Unexpected start_conversation; inspect before changing it');
const migration=await readFile(`supabase/migrations/${version}_likes_and_coins.sql`,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const snapshot={project,version:1,migrationVersion:version,createdAt:new Date().toISOString(),before,migrationHash:hash(migration)};
const key=await readFile('.local-services/hosted-privacy/encryption.key');
const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
console.log('Read-only preflight: start_conversation recognised, encrypted DDL snapshot verified. No chat data exported.');
if(!process.argv.includes('--apply'))process.exit(0);
const recheck=(await query(inspect))[0];assert.equal(recheck.definition,before.definition,'Verification function changed during preparation');assert.equal(recheck.installed,false);
assert(!recheck.versions.includes(version));
// Apply only this reviewed migration, not other local or remote pending changes.
const sql=migration.replace('begin;','begin;\nset local lock_timeout=\'5s\';\nset local statement_timeout=\'20s\';').replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','likes_and_coins',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`);
await query(sql);
const after=(await query(inspect))[0];assert(after.installed);assert(after.versions.includes(version));
assert((await query(`select exists(select 1 from pg_catalog.pg_proc where proname='likes_overview') as ok;`))[0].ok);
const permissions=(await query(`select has_function_privilege('anon','public.likes_overview()','execute') as anon_overview,has_function_privilege('anon','public.like_character(uuid)','execute') as anon_like,(select enabled from private.likes_configuration) as enabled;`))[0];
assert.equal(permissions.anon_overview,false);assert.equal(permissions.anon_like,false);assert.equal(permissions.enabled,false,'Installed switched off');
await writeFile('docs/likes-and-coins-activation.json',JSON.stringify({version,appliedAt:new Date().toISOString(),migrationHash:hash(migration),encryptedDdlSnapshotVerified:true,signedOutRefused:true,enabled:false},null,2)+'\n');
console.log('Installed likes and coins, switched OFF: nothing changes for users yet. After the app update is live, run with --enable.');
