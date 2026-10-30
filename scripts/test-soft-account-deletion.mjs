import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
// Founder decision (30 Oct): deletion freezes the account for 30 days, then erases it.
const db=new PGlite(),a=randomUUID(),b=randomUUID(),operator=randomUUID();
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create table auth.sessions(user_id uuid references auth.users(id) on delete cascade);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 for(const id of [a,b,operator]){await db.query('insert into auth.users values($1,$2)',[id,{adult_declaration:'18-plus-v1'}]);await db.query('insert into auth.sessions values($1)',[id]);}
 await db.exec("update public.profiles set display_name='Synthetic',genders=array['woman'],onboarding_complete=true,ai_consent_at=now();");
 const actor=async(id,role='authenticated',age=0)=>{await db.exec(`reset role;set role ${role};`);await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({iat:Math.floor(Date.now()/1000)-age})]);};
 const count=async(sql,args=[])=>(await db.query(`select count(*)::int as n from ${sql}`,args)).rows[0].n;
 const schedule=()=>db.query("select public.request_account_deletion('DELETE') as until");
 const char=(await db.query("insert into public.characters(name,age,gender,status,bio) values('Synthetic adult',28,'woman','published','Synthetic bio') returning id")).rows[0].id;
 await db.query("insert into private.character_direction(character_id,direction) values($1,'Synthetic direction')",[char]);
 for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[char,slot,`${char}/${slot}.webp`,'a'.repeat(64)]);
 await db.query("insert into private.user_roles values($1,'admin')",[operator]);

 await actor(a);const conversation=(await db.query('select public.start_conversation($1) as id',[char])).rows[0].id;
 const message=(await db.query('select public.save_user_message($1,$2,1,$3) as value',[conversation,randomUUID(),'Synthetic text'])).rows[0].value.id;
 await actor(b);const paid=(await db.query('select public.start_conversation($1) as id',[char])).rows[0].id;
 await db.exec('reset role;');
 await assert.rejects(db.query("insert into public.payment_intents(user_id,conversation_id,character_id,amount_minor,reference,idempotency_key,recipient_disclosure) values($1,$2,$3,100,'mismatch','mismatch','Synthetic operator')",[a,paid,char]),/payment_conversation_mismatch/);
 const intent=(await db.query("insert into public.payment_intents(user_id,conversation_id,character_id,amount_minor,reference,idempotency_key,recipient_disclosure) values($1,$2,$3,100,'synthetic','synthetic','Synthetic operator') returning id",[b,paid,char])).rows[0].id;

 // Scheduling: confirmation, recent sign-in and operator guards still apply.
 await actor(a);await assert.rejects(db.query("select public.request_account_deletion('delete')"),/confirmation_required/);
 await actor(a,'authenticated',600);await assert.rejects(schedule(),/reauth_required/);
 await actor(operator);await assert.rejects(schedule(),/operator_account/);
 await actor(a);const until=new Date((await schedule()).rows[0].until);
 assert(Math.abs(until-Date.now()-30*864e5)<6e4,'Erasure is scheduled 30 days ahead');
 // Frozen: no adult-gated reads or actions, and no second request.
 await assert.rejects(db.query('select public.conversation_thread($1)',[conversation]),/forbidden|not_found/);
 await assert.rejects(db.query('select public.save_user_message($1,$2,1,$3)',[conversation,randomUUID(),'Late']),/forbidden|not_found/);
 await assert.rejects(schedule(),/forbidden/);
 assert.equal((await db.query('select deletion_scheduled_for from public.profiles where id=$1',[a])).rows[0].deletion_scheduled_for.getTime(),until.getTime(),'The owner can read the scheduled date');
 await assert.rejects(db.query('update public.profiles set deletion_scheduled_for=null where id=$1',[a]),/permission denied/);
 // Restoring brings everything back.
 await db.query('select public.restore_account()');await assert.rejects(db.query('select public.restore_account()'),/not_scheduled/);
 assert.equal((await db.query('select public.conversation_thread($1) as v',[conversation])).rows[0].v.messages.length,1);

 // Not yet due: the daily job leaves the account alone.
 await schedule();await actor(b);await schedule();
 for(const role of ['anon','authenticated']){await actor(a,role);await assert.rejects(db.query('select public.erase_due_accounts()'),/permission denied/);}
 await actor('','service_role');assert.equal((await db.query('select public.erase_due_accounts() as n')).rows[0].n,0);
 await db.exec('reset role;');assert.equal(await count('public.messages where id=$1',[message]),1);

 // Due: both accounts are erased; the payment record stays without the account.
 await db.exec("reset role;update public.profiles set deletion_scheduled_for=now()-interval '1 minute' where id in($1,$2);".replace('$1',`'${a}'`).replace('$2',`'${b}'`));
 await actor(a);await assert.rejects(db.query('select public.restore_account()'),/not_scheduled/,'An expired schedule cannot be restored');
 await actor('','service_role');assert.equal((await db.query('select public.erase_due_accounts() as n')).rows[0].n,2);
 await db.exec('reset role;');
 for(const [table,id] of [['auth.users where id=$1',a],['auth.sessions where user_id=$1',a],['public.profiles where id=$1',a],['public.conversations where user_id=$1',a],['public.messages where id=$1',message],['auth.users where id=$1',b],['public.conversations where id=$1',paid]])assert.equal(await count(table,[id]),0,table);
 assert.equal(await count('public.payment_intents where id=$1 and user_id=$2',[intent,b]),1,'Payment records are kept for accounting');
 assert.equal(await count('privacy_guard.account_erasures where actor_id in($1,$2)',[a,b]),2);
 assert.equal(await count('auth.users where id=$1',[operator]),1);
 console.log('Soft account deletion checks passed: 30-day schedule, confirmation/recent sign-in/operator guards, frozen access, owner-only restore, expired restore denied, daily erasure (service only), payment records kept without the account.');
} finally {await db.close();}
