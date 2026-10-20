import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';
const project=(await readFile('supabase/.temp/project-ref','utf8')).trim();assert.match(project,/^[a-z]{20}$/);
assert.equal(parseEnv(await readFile('.env.local','utf8')).NEXT_PUBLIC_SUPABASE_URL,`https://${project}.supabase.co`);
const folder='.local-services/reply-handoff';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});try{
 const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Reply handoff deployment unavailable; private diagnostics suppressed.');}}
const inspect=`select pg_get_functiondef('public.reply_status(uuid,bigint)'::regprocedure) as definition,(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as versions;`;
const before=(await query(inspect))[0];assert(before.versions.includes('202610200024'));
const version='202610200025',name='reply_render_handoff';
if(before.versions.includes(version)){console.log('Reply render handoff already installed. No changes made.');}else{
 const sql=await readFile(`supabase/migrations/${version}_${name}.sql`,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
 const snapshot={version:1,project,before,createdAt:new Date().toISOString(),migration:{version,name,hash}};
 const key=await readFile('.local-services/hosted-privacy/encryption.key');const encrypted=encryptBundle(snapshot,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),snapshot);
 await writeFile(`${folder}/baseline-${Date.now()}.tshback`,encrypted,{flag:'wx',mode:0o600});
 console.log('Reply handoff preflight passed. Encrypted DDL snapshot verified; no messages exported or generated.');
 if(process.argv.includes('--apply')){
  const recheck=(await query(inspect))[0];assert.equal(recheck.definition,before.definition);
  await query(sql.replace('begin;',"begin;\nset local lock_timeout='5s';\nset local statement_timeout='20s';").replace(/commit;\s*$/u,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array['applied by reviewed targeted migration']);\ncommit;\nselect true as applied;`));
  const after=(await query(inspect))[0];assert(after.versions.includes(version));assert(after.definition.includes('outputMessageId'));assert(after.definition.includes('auth.uid()'));
  const grants=(await query("select has_function_privilege('anon','public.reply_status(uuid,bigint)','execute') as anonymous,has_function_privilege('authenticated','public.reply_status(uuid,bigint)','execute') as member;"))[0];assert.equal(grants.anonymous,false);assert.equal(grants.member,true);
  await writeFile('docs/reply-handoff-activation.json',JSON.stringify({appliedAt:new Date().toISOString(),migration:snapshot.migration,encryptedDdlSnapshotVerified:true,ownedReadOnlyStatus:true,noMessagesGenerated:true},null,2)+'\n');
  console.log('Exact reply output IDs installed in owned status metadata. No messages changed or generated.');
 }
}
