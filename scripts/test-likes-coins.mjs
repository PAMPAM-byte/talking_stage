import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Likes and coins (14 Nov): decide on like, show from the next half hour; 10 coins; 1 coin to start; never announce a "no".
const db=new PGlite();const a='00000000-0000-4000-8000-00000000000a',b='00000000-0000-4000-8000-00000000000b',admin='00000000-0000-4000-8000-0000000000ad';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
  create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}',raw_app_meta_data jsonb not null default '{}',last_sign_in_at timestamptz,banned_until timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values('${a}','a@example.com','{"adult_declaration":"18-plus-v1"}'),('${b}','b@example.com','{"adult_declaration":"18-plus-v1"}'),('${admin}','admin@example.com','{"adult_declaration":"18-plus-v1"}');
  update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;
  insert into private.user_roles(user_id,role) values('${admin}','admin');`);
 const chars=[];
 for(const n of [1,2,3,4]){
  const id=(await db.query("insert into public.characters(name,age,gender,status,conversation_clue) values($1,28,'woman','published','Synthetic clue') returning id",[`Synthetic ${n}`])).rows[0].id;chars.push(id);
  for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[id,slot,`${id}/${slot}.webp`,'a'.repeat(64)]);
  await db.query("insert into private.character_direction(character_id,direction) values($1,'Synthetic adult direction')",[id]);
 }
 const [c1,c2,c3,c4]=chars;
 await db.exec("update private.ai_configuration set enabled=true,model='synthetic'");
 const as=async(id,sql,params=[])=>{await db.exec(`reset role;delete from private.request_limits;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);try{return (await db.query(sql,params)).rows[0];}finally{await db.exec('reset role');}};
 const fails=async(id,sql,params,pattern,msg)=>{await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);try{await assert.rejects(db.query(sql,params),pattern,msg);}finally{await db.exec('reset role');}};
 const overview=id=>as(id,'select public.likes_overview() v').then(r=>r.v);
 const start=(id,c)=>as(id,'select public.start_conversation($1) v',[c]).then(r=>r.v);
 const like=(id,c)=>as(id,'select public.like_character($1) v',[c]).then(r=>r.v);
 const reveal=async(user,c)=>db.query("update private.character_likes set show_at=now()-interval '1 minute' where user_id=$1 and character_id=$2",[user,c]);

 // Installed switched off: Meet keeps working, nothing about likes or coins is visible.
 assert.equal((await as(a,'select public.likes_enabled() v')).v,false);
 assert.deepEqual(await overview(a),{enabled:false});
 await fails(a,'select public.like_character($1)',[c1],/likes_off/,'Likes stay off until switched on');
 const before=await start(a,c2);assert(before,'Old Meet path unchanged while off');
 assert.equal((await db.query('select count(*)::int n from private.coin_ledger')).rows[0].n,0,'No coins granted while off');

 await db.exec('update private.likes_configuration set enabled=true');
 assert.equal((await as(a,'select public.likes_enabled() v')).v,true);
 // First like: decided straight away (everyone's first is a like back), shown only from the next half hour.
 assert.deepEqual(await like(a,c1),{status:'pending'});
 const row=(await db.query('select outcome,show_at,liked_at from private.character_likes where user_id=$1 and character_id=$2',[a,c1])).rows[0];
 assert.equal(row.outcome,'match');
 const wait=(new Date(row.show_at)-new Date(row.liked_at))/60000;assert(wait>=20&&wait<50,'Shown at least 20 minutes later');
 assert.equal(new Date(row.show_at).getUTCMinutes()%30,0);assert.equal(new Date(row.show_at).getUTCSeconds(),0,'On the hour or half hour');
 let o=await overview(a);
 assert.deepEqual([o.coins,o.newCount,o.matches.length],[10,0,0],'10 welcome coins; not shown yet');assert.deepEqual(o.liked,[c1]);
 assert.deepEqual(await like(a,c1),{status:'pending'},'Liking again changes nothing');
 await fails(a,'select public.start_conversation($1)',[c1],/not_matched/,'No chat before the like back is shown');
 await reveal(a,c1);
 o=await overview(a);assert.deepEqual([o.newCount,o.matches.length,o.matches[0].characterId,o.matches[0].conversationId,o.liked.length],[1,1,c1,null,0]);
 assert.equal(o.matches[0].clue,'Synthetic clue');
 await as(a,'select public.mark_likes_seen()');assert.equal((await overview(a)).newCount,0);
 // Starting uses one coin; reopening is free; restarting after deleting the chat is free.
 const conv=await start(a,c1);assert.equal((await overview(a)).coins,9);
 assert.equal(await start(a,c1),conv);assert.equal((await overview(a)).coins,9,'Carrying on is free');
 assert.equal((await overview(a)).matches[0].conversationId,conv);
 await db.query('update public.conversations set deleted_at=now() where id=$1',[conv]);
 assert.notEqual(await start(a,c1),conv);assert.equal((await overview(a)).coins,9,'Paid once per character');
 await db.query('delete from public.conversations where user_id=$1 and character_id=$2',[a,c1]);
 await start(a,c1);assert.equal((await overview(a)).coins,9,'Even if the chat rows are gone');
 // A chat from before likes existed never needs a like or a coin.
 await db.query('update public.conversations set deleted_at=now() where id=$1',[before]);
 await start(a,c2);assert.equal((await overview(a)).coins,9);

 // A "no" is never announced: it reads as liked/waiting, and can be tried again a week after.
 await db.query("insert into private.character_likes(user_id,character_id,show_at,outcome) values($1,$2,now()-interval '1 hour','no')",[a,c3]);
 o=await overview(a);assert(!o.matches.some(m=>m.characterId===c3));assert.deepEqual(o.liked,[c3]);
 assert.deepEqual(await like(a,c3),{status:'pending'});
 await fails(a,'select public.start_conversation($1)',[c3],/not_matched/);
 assert.equal(JSON.stringify(await overview(a)).includes('"no"'),false,'No refusal in anything a user can read');
 await db.query("update private.character_likes set show_at=now()-interval '8 days',liked_at=now()-interval '8 days' where user_id=$1 and character_id=$2",[a,c3]);
 assert.equal((await overview(a)).liked.length,0);
 assert.deepEqual(await like(a,c3),{status:'pending'});
 assert((await db.query("select liked_at>now()-interval '1 minute' fresh from private.character_likes where user_id=$1 and character_id=$2",[a,c3])).rows[0].fresh,'Decided afresh');

 // Out of coins.
 await fails(a,'select public.admin_grant_coins($1,$2)',[a,5],/forbidden/,'Only admins adjust coins');
 assert.equal((await as(admin,'select public.admin_grant_coins($1,$2) v',[a,-9])).v,0);
 await fails(admin,'select public.admin_grant_coins($1,$2)',[a,-1],/invalid_amount/,'Never below zero');
 await db.query("insert into private.character_likes(user_id,character_id,show_at,outcome) values($1,$2,now()-interval '1 hour','match')",[a,c4]);
 await fails(a,'select public.start_conversation($1)',[c4],/no_coins/);
 assert.equal((await db.query('select count(*)::int n from public.conversations where user_id=$1 and character_id=$2',[a,c4])).rows[0].n,0,'No chat and no coin taken');
 assert.equal((await as(admin,'select public.admin_grant_coins($1,$2) v',[a,3])).v,3);
 await start(a,c4);assert.equal((await overview(a)).coins,2);
 assert.equal((await db.query("select count(*)::int n from private.admin_audit where action='coins.adjust'")).rows[0].n,2);
 assert.equal((await db.query("select count(*)::int n from private.coin_ledger where user_id=$1 and kind='welcome'",[a])).rows[0].n,1,'Welcome coins once');

 // Pickiness: across many characters, a person gets some likes back and some silence.
 const many=[];for(let i=0;i<40;i++)many.push((await db.query("insert into public.characters(name,age,gender,status) values($1,30,'man','published') returning id",[`Synthetic m${i}`])).rows[0].id);
 for(const c of many)await like(b,c);
 const outcomes=(await db.query("select outcome,count(*)::int n from private.character_likes where user_id=$1 group by 1",[b])).rows;
 const yes=outcomes.find(r=>r.outcome==='match')?.n??0;assert(yes>=12&&yes<=34,`Between 4 and 8 in 10 like back (${yes}/40)`);
 assert.equal((await db.query("select outcome from private.character_likes where user_id=$1 and character_id=$2",[b,many[0]])).rows[0].outcome,'match','First like is always a like back');

 // Signed-out callers and other people see nothing.
 for(const fn of ['likes_overview()','like_character(uuid)','likes_enabled()','admin_grant_coins(uuid,integer)','mark_likes_seen()'])
  assert.equal((await db.query(`select has_function_privilege('anon','public.${fn}','execute') v`)).rows[0].v,false,fn);
 assert.equal((await overview(b)).matches.some(m=>m.characterId===c1),false,'Only your own likes');
 console.log('Likes and coins passed: off until switched on, decided on like and shown from the next half hour (20+ minutes), first like answered, refusals never visible and retryable after 7 days, 10 welcome coins once, 1 coin per new character, reopening and past chats free, no chat without a coin, admin adjustments logged and never negative.');
}finally{await db.close();}
