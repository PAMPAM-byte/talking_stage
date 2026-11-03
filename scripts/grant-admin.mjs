import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`;
const env=parseEnv(await readFile('.env.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const folder='.local-services/grant-admin';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});
 try{
  const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Admin grant failed; private connection diagnostics suppressed.');}
}
// Grants the admin role to one existing TalkingStage account, found by sign-in email.
// Usage: node scripts/grant-admin.mjs --email person@example.com [--apply]. Prints counts only.
const email=(process.argv[process.argv.indexOf('--email')+1]??'').trim().toLowerCase();
assert(process.argv.includes('--email')&&/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email),'Pass --email with a valid address');
const state=async()=>(await query(`select count(*)::int as accounts,
 count(r.user_id)::int as already_admin,
 bool_or(p.adult_declared_at is not null and p.onboarding_complete) as onboarded,
 (select count(*)::int from private.user_roles) as admins
 from auth.users u left join private.user_roles r on r.user_id=u.id left join public.profiles p on p.id=u.id
 where lower(u.email)='${email}';`))[0];
const before=await state();
assert.equal(before.accounts,1,`Expected exactly one account for this email, found ${before.accounts}`);
console.log(`Read-only preflight: one account found (${before.onboarded?'onboarded':'not onboarded yet'}), ${before.already_admin?'already an admin':'not an admin'}; ${before.admins} admin account(s) in total.`);
if(!process.argv.includes('--apply')||before.already_admin)process.exit(0);
await query(`begin;set local lock_timeout='5s';insert into private.user_roles(user_id,role) select id,'admin' from auth.users where lower(email)='${email}' on conflict(user_id) do nothing;commit;select true as granted;`);
const after=await state();assert.equal(after.already_admin,1);
console.log(`Granted admin. ${after.admins} admin account(s) in total. Sign out and back in, then open /admin/operations.`);
