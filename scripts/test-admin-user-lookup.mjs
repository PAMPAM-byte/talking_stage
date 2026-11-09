import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Admin user lookup (9 Nov): admins only, by email, name or ID, spend against the limit including payment credit.
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c3='00000000-0000-4000-8000-000000000003';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
  create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}',raw_app_meta_data jsonb not null default '{}',last_sign_in_at timestamptz,banned_until timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data,last_sign_in_at) values
  ('${a}','ada.reader@example.com','{"adult_declaration":"18-plus-v1"}','{"providers":["email","google"]}',now()),
  ('${b}','founder@example.com','{"adult_declaration":"18-plus-v1"}','{"providers":["email"]}',now()),
  ('${c3}','ada_100%@example.com','{"adult_declaration":"18-plus-v1"}','{"providers":["google"]}',now()-interval '2 days');
  update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;
  update public.profiles set display_name='Tolu' where id='${a}';`);
 const char=(await db.query("insert into public.characters(name,age,gender,status) values('Synthetic adult',28,'woman','published') returning id")).rows[0].id;
 for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[char,slot,`${char}/${slot}.webp`,'a'.repeat(64)]);
 await db.query("insert into private.character_direction(character_id,direction) values($1,'Synthetic adult direction')",[char]);
 // Worst-case reply: 48000 input at $1/M plus 1024 output at $5/M = 53120 micro-USD.
 await db.exec("update private.ai_configuration set enabled=true,model='synthetic',project_daily_micro_usd=60000000,user_daily_micro_usd=2000000,input_micro_usd_per_million=1000000,output_micro_usd_per_million=5000000,max_input_tokens=48000,max_output_tokens=1024");
 const actor=async(id=a)=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);
 await actor();const conv=(await db.query('select public.start_conversation($1) id',[char])).rows[0].id;
 for(const text of ['Hi','How was your day?','Tell me more']){await db.exec('reset role;delete from private.request_limits');await actor();await db.query('select public.save_user_message($1,gen_random_uuid(),1,$2)',[conv,text]);}
 await db.exec('reset role');
 // Spent $1.96 of $2.00 today: under the limit, but not enough left for a worst-case reply.
 await db.query("insert into private.ai_daily_usage(day,scope,amount_micro_usd) values((now() at time zone 'UTC')::date,$1,1960000)",[a]);
 const lookup=async(q,id=b)=>{await actor(id);const v=(await db.query('select public.admin_user_lookup($1) v',[q])).rows[0].v;await db.exec('reset role');return v;};
 await actor(a);await assert.rejects(db.query("select public.admin_user_lookup('founder')"),/forbidden/,'Only administrators can look people up');
 await db.exec(`reset role;insert into private.user_roles(user_id,role) values('${b}','admin');`);
 await actor(b);await assert.rejects(db.query("select public.admin_user_lookup('ad')"),/query_length/,'At least 3 characters');await db.exec('reset role');
 let found=(await lookup('  ADA.Reader@example.com ')).users;
 assert.equal(found.length,1);const u=found[0];
 assert.deepEqual([u.id,u.email,u.name,u.isAdmin,u.onboardingComplete],[a,'ada.reader@example.com','Tolu',false,true]);
 assert.deepEqual(u.signInMethods,['email','google']);
 assert.deepEqual([u.ai.usedMicroUsd,u.ai.limitMicroUsd,u.ai.creditMicroUsd,u.ai.replyCostMicroUsd,u.ai.atLimit],[1960000,2000000,0,53120,true],'Reached: the next worst-case reply does not fit');
 assert.deepEqual([u.activity.messagesSent,u.activity.characters],[3,1]);assert(u.activity.messagesToday>=1);assert.deepEqual(u.topCharacters,['Synthetic adult']);
 assert.deepEqual([u.payments.paidMinor,u.payments.payments],[0,0]);
 // A live ₦2,000 payment adds $0.80 to today's limit, so the person can chat again.
 const pay=(await db.query(`insert into public.payment_intents(user_id,conversation_id,character_id,amount_minor,reference,idempotency_key,recipient_disclosure,status,gateway_environment)
  values($1,$2,$3,200000,'ref-1','key-1','Synthetic operator','pending','production') returning id`,[a,conv,char])).rows[0].id;
 await db.query("update public.payment_intents set status='paid',verified_at=now() where id=$1",[pay]);
 const paid=(await lookup('ada.reader')).users[0];
 assert.deepEqual([paid.ai.usedMicroUsd,paid.ai.limitMicroUsd,paid.ai.creditMicroUsd,paid.ai.atLimit],[1960000,2800000,800000,false],'Payment credit raises the limit');
 assert.deepEqual([paid.payments.paidMinor,paid.payments.payments],[200000,1]);
 // Partial matches: name and email, exact first; wildcard characters are matched literally.
 found=(await lookup('ada')).users;assert.deepEqual(found.map(x=>x.id),[a,c3],'Most recent sign-in first');
 assert.deepEqual((await lookup('tolu')).users.map(x=>x.id),[a],'By name');
 assert.deepEqual((await lookup('100%')).users.map(x=>x.id),[c3],'Percent is literal');
 assert.deepEqual((await lookup('r_e')).users.map(x=>x.id),[],'Underscore is literal, not any character (reader@example)');
 assert.deepEqual((await lookup(a)).users.map(x=>x.id),[a],'By account ID');
 assert.deepEqual((await lookup('nobody@example.com')).users,[]);
 assert.equal((await lookup('founder@')).users[0].isAdmin,true);
 assert.equal(JSON.stringify(await lookup('ada')).includes('How was your day'),false,'No message text');
 // Every lookup is logged; the search text is never stored.
 const audit=(await db.query("select target_id from private.admin_audit where action='user.lookup' and actor_id=$1",[b])).rows;
 assert(audit.some(r=>r.target_id===a));assert(audit.some(r=>r.target_id===null),'Searches with no match are logged too');
 assert.equal((await db.query("select count(*)::int n from private.admin_audit where action='user.lookup' and actor_id=$1",[b])).rows[0].n,12,'One row per person shown, or one for no match');
 console.log('Admin user lookup passed: admins only, 3+ characters, email/name/ID matches, literal wildcards, limit reached using the worst-case reply, payment credit raises the limit, live payments, activity without message text, every lookup logged.');
}finally{await db.close();}
