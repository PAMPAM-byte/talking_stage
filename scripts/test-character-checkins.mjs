import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {runCheckin} from '../lib/ai/checkin-pipeline.mjs';
import {buildInput,generateReply} from '../lib/ai/provider.mjs';
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${a}','{"adult_declaration":"18-plus-v1"}'),('${b}','{"adult_declaration":"18-plus-v1"}');update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;
 update private.ai_configuration set enabled=true,model='synthetic',project_daily_micro_usd=10000000,user_daily_micro_usd=10000000,input_micro_usd_per_million=1000000,output_micro_usd_per_million=1000000;`);
 const daytime=(await db.query("select name from pg_timezone_names where extract(hour from now() at time zone name) between 10 and 18 order by name limit 1")).rows[0].name;
 const nighttime=(await db.query("select name from pg_timezone_names where extract(hour from now() at time zone name) between 0 and 4 order by name limit 1")).rows[0].name;
 const actor=async(id,role='authenticated')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 const preference=async(frequency='daily',zone=daytime)=>{await actor(a);await db.query('select public.set_checkin_preference($1,$2)',[frequency,zone]);};
 const clearCooldown=async()=>{await db.exec('reset role');await db.query("update private.checkin_preferences set last_attempt_at=now()-interval '100 hours' where user_id=$1",[a]);};
 const seed=async(turns=8)=>{
  await db.exec('reset role');const char=(await db.query("insert into public.characters(name,age,gender,status) values('Synthetic check-in character',28,'woman','published') returning id")).rows[0].id;
  for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[char,slot,`${char}/${slot}.webp`,'a'.repeat(64)]);
  await db.query("insert into private.character_direction(character_id,direction) values($1,'Warm fictional adult; enjoys books.')",[char]);
  await actor(a);const c=(await db.query('select public.start_conversation($1) as id',[char])).rows[0].id;
  await db.exec('reset role');await db.query("insert into public.messages(conversation_id,sequence,role,kind,text,created_at) select $1,n,case when n%2=1 then 'user' else 'character' end,'text',case when n%2=1 then 'I enjoy reading novels.' else 'A good book can take over an evening.' end,now()-interval '26 hours'+n*interval '1 minute' from generate_series(1,$2::int)n",[c,turns]);
  await db.query("update public.conversations set next_sequence=$2+1,last_message_at=now()-interval '25 hours' where id=$1",[c,turns]);return c;
 };
 const claim=async(onReturn=false,conversation=null)=>{await actor('', 'service_role');return (await db.query('select public.claim_character_initiative($1,$2,$3,$4) as v',[a,'synthetic',onReturn,conversation])).rows[0].v;};
 const finish=async(job,text='Hey, did you get back to that novel?')=>{await actor('', 'service_role');return (await db.query('select public.finish_character_checkin($1,$2,$3,$4,null) as v',[job.job,a,job.lease,text])).rows[0].v;};
 await actor(a);assert.equal((await db.query('select public.checkin_settings() as v')).rows[0].v.frequency,'off');assert.equal((await claim()).state,'disabled');
 const c=await seed();await preference('daily',nighttime);assert.equal((await claim()).state,'quiet_hours');
 await preference();const job=await claim();assert.equal(job.state,'claimed');assert.equal(job.replyMode,'checkin');assert(job.history.every(m=>m.created_at));
 const input=buildInput(job);assert(input[0].content.includes('NO new user message'));assert(!input[0].content.includes('Available reactions'));
 const response=text=>async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text,photoAssetId:null})}]}]});
 const settings={key:'SYNTHETIC-NOT-A-KEY',model:'synthetic'};
 await assert.rejects(generateReply(job,settings,{fetcher:response('[[ts:gif:wave]]')}),/invalid_output/);
 await assert.rejects(generateReply(job,settings,{fetcher:response('x'.repeat(281))}),/invalid_output/);
 let calls=0;const client={rpc:async(name,p)=>name==='claim_character_checkin'?{data:job}:{data:(await db.query('select public.finish_character_checkin($1,$2,$3,$4,$5) as v',[p.p_job,p.p_actor,p.p_lease,p.p_text,p.p_failure])).rows[0].v}};
 await actor('', 'service_role');assert.equal(await runCheckin(client,a,settings,{fetcher:async(...args)=>{calls++;return response('Hey, did you get back to that novel?')(...args);}}),'completed');assert.equal(calls,1);
 assert.equal(await finish(job),'completed');await actor(a);
 const thread=(await db.query('select public.conversation_thread($1) as v',[c])).rows[0].v;assert.equal(thread.messages.length,9);assert.equal(thread.messages.filter(m=>m.role==='user').length,4);
 assert.equal((await claim()).state,'cooldown');await clearCooldown();assert.equal((await claim()).state,'not_due','Do not repeat an unanswered check-in');
 await actor(a);await assert.rejects(db.query('select public.claim_character_checkin($1,$2,false)',[a,'synthetic']),/permission denied/);
 await actor(b);assert.equal((await db.query('select public.checkin_settings() as v')).rows[0].v.frequency,'off');await assert.rejects(db.query('select * from private.checkin_preferences'),/permission denied/);
 await preference('twice_weekly');await db.exec('reset role');await db.query("update private.checkin_preferences set last_attempt_at=now()-interval '60 hours' where user_id=$1",[a]);assert.equal((await claim()).state,'cooldown');
 await preference('on_return');await clearCooldown();assert.equal((await claim()).state,'disabled');
 await actor('', 'service_role');assert.deepEqual((await db.query('select public.checkin_candidates(3) as v')).rows[0].v,[]);
 const returnChat=await seed();const onReturn=await claim(true);assert.equal(onReturn.state,'claimed');await preference('off');assert.equal(await finish(onReturn),'discarded');
 for(const scenario of ['new-message','archive','reset','pause']){
  await preference();await clearCooldown();const chat=await seed();const pending=await claim();assert.equal(pending.state,'claimed');
  if(scenario==='new-message'){await actor(a);await db.query("select public.save_user_message($1,gen_random_uuid(),1,'Hello again')",[chat]);}
  if(['archive','reset'].includes(scenario)){await actor(a);const v=(await db.query('select version from public.conversations where id=$1',[chat])).rows[0].version;await db.query('select public.manage_conversation($1,$2,$3)',[chat,v,scenario]);}
  if(scenario==='pause'){await db.exec('reset role');await db.exec("update private.capability_controls set chat=false where scope='global'");}
  assert.equal(await finish(pending),'discarded',scenario+' must invalidate the check-in');
  if(scenario==='pause'){await db.exec('reset role');await db.exec("update private.capability_controls set chat=true where scope='global'");}
 }
 await preference();await clearCooldown();await seed();await db.exec('reset role');await db.exec('update private.ai_configuration set user_daily_micro_usd=1');assert.equal((await claim()).state,'budget_exhausted');
 await actor('', 'anon');await assert.rejects(db.query('select public.checkin_settings()'),/permission denied/);
 // A new, user-opened chat can receive one opt-in hello, including at night
 // while the user is present. Background follow-ups still respect quiet hours.
 await db.exec('reset role');await db.exec('update private.ai_configuration set user_daily_micro_usd=10000000');
 await preference('off',nighttime);await clearCooldown();const openingChat=await seed(0);
 assert.equal((await claim(true)).state,'disabled');
 await preference('daily',nighttime);assert.equal((await claim(false)).state,'quiet_hours');
 const opener=await claim(true,openingChat);assert.equal(opener.state,'claimed');assert.equal(opener.initiative,'opener');assert.deepEqual(opener.history,[]);
 assert.equal(opener.character.gender,'woman');
 const openingInput=buildInput(opener);assert(openingInput[0].content.includes('NO shared conversation history'));assert(openingInput[1].content.includes('"defaultCounterpart":"man"'));
 assert.equal(await finish(opener,'Hey, how are you?'),'completed');assert.equal(await finish(opener,'Hey, how are you?'),'completed');
 await actor(a);const openingThread=(await db.query('select public.conversation_thread($1) as v',[openingChat])).rows[0].v;
 assert.equal(openingThread.messages.length,1);assert.equal(openingThread.messages[0].role,'character');
 assert.equal((await claim(true)).state,'cooldown');await clearCooldown();assert.equal((await claim(true,openingChat)).state,'not_due');
 const racedChat=await seed(0);const racingOpener=await claim(true,racedChat);assert.equal(racingOpener.initiative,'opener');
 await actor(a);await db.query("select public.save_user_message($1,gen_random_uuid(),1,'Hi, I got here first')",[racedChat]);
 assert.equal(await finish(racingOpener),'discarded','A new user message must cancel the stale first hello');
 assert(returnChat);
 console.log('Check-ins passed: opt-in first hellos, user-first race cancellation, frequency, quiet hours, ownership, no fake user messages, context, bounded text output, shared budgets, idempotence, no unanswered repeats, opt-out/new-message/archive/reset/pause invalidation. No provider/network calls.');
}finally{await db.close();}
