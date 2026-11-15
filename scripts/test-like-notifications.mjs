import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Like-back notifications (14 Nov): own subscriptions only, names by default, each like back sent once, keys service-only.
const db=new PGlite();const a='00000000-0000-4000-8000-0000000000a1',b='00000000-0000-4000-8000-0000000000b1';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
  create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}',raw_app_meta_data jsonb not null default '{}',last_sign_in_at timestamptz,banned_until timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values('${a}','a@example.com','{"adult_declaration":"18-plus-v1"}'),('${b}','b@example.com','{"adult_declaration":"18-plus-v1"}');
  update public.profiles set display_name='Synthetic',genders=array['man'],ai_consent_at=now(),onboarding_complete=true;
  update private.likes_configuration set enabled=true;
  update private.notification_dispatch set secret=repeat('s',40),vapid_public='PUBLICKEY',vapid_private='PRIVATEKEY';`);
 const usman=(await db.query("insert into public.characters(name,age,gender,status) values('Usman',30,'man','published') returning id")).rows[0].id;
 const tunde=(await db.query("insert into public.characters(name,age,gender,status) values('Tunde',31,'man','published') returning id")).rows[0].id;
 const as=async(role,id,sql,params=[])=>{await db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id??''}',false);`);try{return (await db.query(sql,params)).rows[0];}finally{await db.exec('reset role');}};
 const rejects=async(role,id,sql,params,pattern,msg)=>{await db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id??''}',false);`);try{await assert.rejects(db.query(sql,params),pattern,msg);}finally{await db.exec('reset role');}};
 const sub=n=>[`https://push.example.com/${n}`,'p'.repeat(40),'a'.repeat(16)];

 // Subscriptions: own only; a browser moves to whoever signed in on it last.
 await as('authenticated',a,'select public.save_push_subscription($1,$2,$3)',sub('phone'));
 await rejects('authenticated',a,'select public.save_push_subscription($1,$2,$3)',['http://insecure.example.com','p'.repeat(40),'a'.repeat(16)],/check/,'HTTPS endpoints only');
 assert.deepEqual((await as('authenticated',a,'select public.notification_preferences() v')).v,{showNames:true,devices:1},'Names shown by default');
 await as('authenticated',a,'select public.save_notification_preferences(false)');
 assert.equal((await as('authenticated',a,'select public.notification_preferences() v')).v.showNames,false);
 await as('authenticated',a,'select public.save_notification_preferences(true)');
 await as('authenticated',b,'select public.delete_push_subscription($1)',[sub('phone')[0]]);
 assert.equal((await db.query('select count(*)::int n from private.push_subscriptions')).rows[0].n,1,'Someone else cannot remove your device');
 assert.equal((await as('authenticated',a,'select public.push_public_key() v')).v,'PUBLICKEY');

 // Users cannot claim notifications or read the signing keys.
 for(const [sql,params] of [['select public.claim_like_notifications(10)',[]],['select public.dispatch_config($1)',['s'.repeat(40)]],['select public.forget_push_subscription($1)',[sub('phone')[0]]]])
  await rejects('authenticated',a,sql,params,/permission denied/,sql);
 assert.equal((await as('service_role',null,'select public.dispatch_config($1) v',['wrong'.repeat(10)])).v,null,'Wrong secret: no keys');
 assert.deepEqual((await as('service_role',null,'select public.dispatch_config($1) v',['s'.repeat(40)])).v,{publicKey:'PUBLICKEY',privateKey:'PRIVATEKEY'});

 // A like back not yet visible is not sent; once visible it is sent exactly once, with the name.
 await db.query("insert into private.character_likes(user_id,character_id,show_at,outcome) values($1,$2,now()+interval '10 minutes','match'),($1,$3,now()-interval '1 minute','no')",[a,usman,tunde]);
 const claim=async()=>(await as('service_role',null,'select public.claim_like_notifications(100) v')).v;
 assert.deepEqual(await claim(),[],'Nothing visible yet, and refusals are never sent');
 assert.equal((await as('authenticated',a,'select public.likes_pulse() v')).v.newCount,0);
 await db.query("update private.character_likes set show_at=now()-interval '1 minute' where character_id=$1",[usman]);
 const first=await claim();
 assert.equal(first.length,1);assert.deepEqual([first[0].userId,first[0].characterName,first[0].showNames,first[0].subscriptions.length],[a,'Usman',true,1]);
 assert.deepEqual(await claim(),[],'Never twice');
 const pulse=(await as('authenticated',a,'select public.likes_pulse() v')).v;assert.deepEqual([pulse.newCount,pulse.latest.name],[1,'Usman'],'In-app badge and popup');
 await as('authenticated',a,'select public.mark_likes_seen()');assert.equal((await as('authenticated',a,'select public.likes_pulse() v')).v.newCount,0);
 // Old likes back are marked without sending; people without a device are marked too.
 await db.query("insert into private.character_likes(user_id,character_id,show_at,outcome) values($1,$2,now()-interval '2 days','match')",[b,usman]);
 await db.query("insert into private.character_likes(user_id,character_id,show_at,outcome) values($1,$2,now()-interval '1 minute','match')",[b,tunde]);
 assert.deepEqual(await claim(),[],'B has no device; old news is never replayed');
 assert.equal((await db.query('select count(*)::int n from private.character_likes where outcome=$1 and notified_at is null',['match'])).rows[0].n,0);
 // Switched off: nothing is claimed.
 await db.exec('update private.likes_configuration set enabled=false');
 await db.query("insert into private.character_likes(user_id,character_id,show_at,outcome) values($1,$2,now()-interval '1 minute','match') on conflict(user_id,character_id) do update set notified_at=null,show_at=excluded.show_at",[a,tunde]);
 assert.deepEqual(await claim(),[]);
 // Expired browsers are forgotten by the sender.
 await as('service_role',null,'select public.forget_push_subscription($1)',[sub('phone')[0]]);
 assert.equal((await db.query('select count(*)::int n from private.push_subscriptions')).rows[0].n,0);
 for(const fn of ['save_push_subscription(text,text,text)','likes_pulse()','push_public_key()','claim_like_notifications(integer)','dispatch_config(text)'])
  assert.equal((await db.query(`select has_function_privilege('anon','public.${fn}','execute') v`)).rows[0].v,false,fn);
 console.log('Like notifications passed: own devices only, HTTPS endpoints, names by default with a private option, keys and sending service-only behind the secret, sent once when visible, refusals and old likes never sent, off means nothing sent, expired browsers forgotten.');
}finally{await db.close();}
// Supabase API sessions load pg_safeupdate: every UPDATE/DELETE in an API-callable function needs WHERE.
{
 const {readFile:rf}=await import('node:fs/promises');
 const sql=(await rf('supabase/migrations/202611150047_notification_claim_where.sql','utf8')).replace(/\s+/g,' ');
 for(const statement of sql.match(/\bupdate [a-z_.]+ set [^;]+;/gi)??[])assert(/\bwhere\b/i.test(statement),`UPDATE without WHERE: ${statement.slice(0,80)}`);
 console.log('Safe-update guard passed: every UPDATE in the claim has a WHERE clause.');
}
