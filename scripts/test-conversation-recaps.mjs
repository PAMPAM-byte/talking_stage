import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Conversation memory (3 Nov): running recap per chat plus the questions already asked.
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${a}','{"adult_declaration":"18-plus-v1"}'),('${b}','{"adult_declaration":"18-plus-v1"}');update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;`);
 const char=(await db.query("insert into public.characters(name,age,gender,status) values('Synthetic adult',28,'woman','published') returning id")).rows[0].id;
 for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[char,slot,`${char}/${slot}.webp`,'a'.repeat(64)]);
 await db.query("insert into private.character_direction(character_id,direction) values($1,'Synthetic adult direction')",[char]);
 await db.exec("update private.ai_configuration set enabled=true,model='synthetic',project_daily_micro_usd=1000,user_daily_micro_usd=1000,input_micro_usd_per_million=1,output_micro_usd_per_million=1");
 const actor=async(id=a,role='authenticated')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 await actor();const c=(await db.query('select public.start_conversation($1) id',[char])).rows[0].id;
 const claim=async message=>{await actor('','service_role');return (await db.query("select public.claim_reply($1,$2,'synthetic') v",[message,a])).rows[0].v;};
 const send=async text=>{await actor();return (await db.query('select public.save_user_message($1,gen_random_uuid(),1,$2) v',[c,text])).rows[0].v.id;};
 const reply=async(text,answer)=>{const job=await claim(await send(text));await actor('','service_role');assert.equal((await db.query('select public.finish_reply($1,$2,$3,$4) v',[job.job,a,job.lease,answer])).rows[0].v,'completed');return job;};
 const lastUser=async()=>{await db.exec('reset role');return (await db.query("select id from public.messages where conversation_id=$1 and role='user' order by sequence desc limit 1",[c])).rows[0].id;};
 const claimRecap=async()=>{await actor('','service_role');return (await db.query("select public.claim_recap($1,$2,'synthetic') v",[await lastUser(),a])).rows[0].v;};
 const finishRecap=async(job,recap,topics=['work'],failure=null)=>{await actor('','service_role');return (await db.query('select public.finish_recap($1,$2,$3,$4,$5,$6) v',[c,a,job.lease,recap,JSON.stringify(topics),failure])).rows[0].v;};
 // Questions the character asked anywhere in the chat are listed for every reply.
 await reply('Hi','Hey! What do you do for work? I teach dance.');
 let job=await reply('I work at a bank','A banker! Where do you stay?');
 assert.deepEqual(job.chatMemory.questionsYouAlreadyAsked,['What do you do for work?']);
 job=await claim(await send('Lekki'));assert.deepEqual(job.chatMemory.questionsYouAlreadyAsked,['Where do you stay?','What do you do for work?']);
 assert.equal(job.chatMemory.exchanges,2);assert.equal(job.chatMemory.recap,null);
 await actor('','service_role');await db.query("select public.finish_reply($1,$2,$3,'Nice area.')",[job.job,a,job.lease]);
 // No recap until 12 new messages exist.
 assert.equal((await claimRecap()).state,'not_needed');
 for(let i=0;i<3;i++)await reply(`Message ${i}`,'Tell me more.');
 const recapJob=await claimRecap();assert.equal(recapJob.state,'claimed');assert.equal(recapJob.sources.length,12);assert.equal(recapJob.previousRecap,'');
 assert.equal((await claimRecap()).state,'generating','One recap at a time');
 {const latest=await lastUser();await actor();await assert.rejects(db.query("select public.claim_recap($1,$2,'synthetic')",[latest,a]),/permission denied/);}
 // Invalid recaps keep the previous memory.
 assert.equal(await finishRecap(recapJob,'Call 08031234567 anytime'),'discarded');
 let next=await claimRecap();assert.equal(next.state,'claimed');
 assert.equal(await finishRecap(next,'Synthetic works at a bank and lives in Lekki; Amara teaches dance.',['work','where they live']),'completed');
 job=await claim(await send('Hello again'));assert.equal(job.chatMemory.recap,'Synthetic works at a bank and lives in Lekki; Amara teaches dance.');assert.deepEqual(job.chatMemory.topicsCovered,['work','where they live']);
 await actor('','service_role');await db.query("select public.finish_reply($1,$2,$3,'Welcome back!')",[job.job,a,job.lease]);
 // The recap survives payment and request events (context revision bumps).
 await db.exec('reset role');await db.query('update public.conversations set context_revision=context_revision+1 where id=$1',[c]);
 assert.equal((await db.query('select recap from private.conversation_recaps where conversation_id=$1',[c])).rows[0].recap.startsWith('Synthetic works'),true);
 // The next recap starts after the covered messages and carries the previous one forward.
 for(let i=0;i<6;i++)await reply(`Later ${i}`,'Haha true.');
 const second=await claimRecap();assert.equal(second.state,'claimed');assert.equal(second.previousRecap,'Synthetic works at a bank and lives in Lekki; Amara teaches dance.');assert(second.sources.length>=12&&second.sources.length<=14);
 await finishRecap(second,'Recap two: still chatting about work and Lekki.',['work']);
 // Memory off hides the recap; deleting a fact or turning memory off clears it.
 await actor();await db.query("select public.manage_memory($1,'disable')",[char]);
 await db.exec('reset role');assert.equal((await db.query('select count(*) n from private.conversation_recaps')).rows[0].n,0);
 job=await claim(await send('Still there?'));assert.equal(job.chatMemory.recap,null);assert.deepEqual(job.chatMemory.topicsCovered,[]);assert(job.chatMemory.questionsYouAlreadyAsked.length>0,'Questions come from the visible chat');
 await actor('','service_role');await db.query("select public.finish_reply($1,$2,$3,'Yes!')",[job.job,a,job.lease]);
 assert.equal((await claimRecap()).state,'unavailable','No recap while memory is off');
 await actor();await db.query("select public.manage_memory($1,'enable')",[char]);
 // A reset starts a fresh memory.
 for(let i=0;i<6;i++)await reply(`Again ${i}`,'Okay.');
 const third=await claimRecap();await finishRecap(third,'Third recap after memory was turned back on.',[]);
 await db.exec('reset role');await db.query('update public.conversations set generation=generation+1 where id=$1',[c]);
 assert.equal((await db.query('select count(*) n from private.conversation_recaps')).rows[0].n,0);
 console.log('Conversation recaps passed: questions already asked from the whole chat, recap every 12 messages, one at a time, invalid recaps rejected, survives context bumps, carries forward, memory off hides and clears, reset clears, service-only.');
}finally{await db.close();}
