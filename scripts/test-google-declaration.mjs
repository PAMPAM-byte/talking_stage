import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Google sign-in (5 Nov): a Google account starts without the 18+ declaration and records it once.
const db=new PGlite();const google='00000000-0000-4000-8000-000000000001',email='00000000-0000-4000-8000-000000000002';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${google}','{"full_name":"Google person"}'),('${email}','{"adult_declaration":"18-plus-v1"}');`);
 const actor=async(id,role='authenticated')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 const profile=async id=>{await db.exec('reset role');return (await db.query('select adult_declared_at,adult_declaration_version from public.profiles where id=$1',[id])).rows[0];};
 assert.equal((await profile(google)).adult_declared_at,null,'A Google account arrives without a declaration');
 await actor('',' anon'.trim());await assert.rejects(db.query('select public.accept_adult_declaration()'),/permission denied/,'Signed-out visitors cannot call it');
 await actor(google);assert.equal((await db.query('select public.accept_adult_declaration() v')).rows[0].v,true);
 const first=await profile(google);assert(first.adult_declared_at);assert.equal(first.adult_declaration_version,'18-plus-v1');
 await actor(google);assert.equal((await db.query('select public.accept_adult_declaration() v')).rows[0].v,true);
 assert.deepEqual(await profile(google),first,'Calling again never changes an existing declaration');
 const before=await profile(email);await actor(email);await db.query('select public.accept_adult_declaration()');assert.deepEqual(await profile(email),before,'Email accounts keep their sign-up declaration');
 // Accounts scheduled for deletion are not revived.
 const late='00000000-0000-4000-8000-000000000003';
 await db.exec(`reset role;insert into auth.users values('${late}','{}');update public.profiles set deletion_scheduled_for=now()+interval '30 days' where id='${late}';`);
 await actor(late);assert.equal((await db.query('select public.accept_adult_declaration() v')).rows[0].v,false);
 console.log('Google declaration passed: Google accounts start undeclared, record 18+ once, never overwrite, email declarations untouched, signed-out refused, scheduled deletions not revived.');
}finally{await db.close();}
