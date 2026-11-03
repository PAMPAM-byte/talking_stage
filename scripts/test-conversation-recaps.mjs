import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Long-term memory (3 Nov): compacted story, recent chapter and an all-time question log; only a reset clears it.
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${a}','{"adult_declaration":"18-plus-v1"}'),('${b}','{"adult_declaration":"18-plus-v1"}');update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;`);
 const char=(await db.query("insert into public.characters(name,age,gender,status) values('Synthetic adult',28,'woman','published') returning id")).rows[0].id;
 for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[char,slot,`${char}/${slot}.webp`,'a'.repeat(64)]);
 await db.query("insert into private.character_direction(character_id,direction) values($1,'Synthetic adult direction')",[char]);
 await db.exec("update private.ai_configuration set enabled=true,model='synthetic',project_daily_micro_usd=100000,user_daily_micro_usd=100000,input_micro_usd_per_million=1,output_micro_usd_per_million=1");
 const actor=async(id=a,role='authenticated')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 await actor();const c=(await db.query('select public.start_conversation($1) id',[char])).rows[0].id;
 const claim=async message=>{await actor('','service_role');return (await db.query("select public.claim_reply($1,$2,'synthetic') v",[message,a])).rows[0].v;};
 // Long chats exceed the 30-a-minute send limit in a test; clear the window between messages.
 const send=async text=>{await db.exec('reset role;delete from private.request_limits');await actor();return (await db.query('select public.save_user_message($1,gen_random_uuid(),1,$2) v',[c,text])).rows[0].v.id;};
 const answer=async(job,text)=>{await actor('','service_role');assert.equal((await db.query('select public.finish_reply($1,$2,$3,$4) v',[job.job,a,job.lease,text])).rows[0].v,'completed');};
 const reply=async(text,response)=>{const job=await claim(await send(text));await answer(job,response);return job;};
 const lastUser=async()=>{await db.exec('reset role');return (await db.query("select id from public.messages where conversation_id=$1 and role='user' order by sequence desc limit 1",[c])).rows[0].id;};
 const claimRecap=async()=>{const message=await lastUser();await actor('','service_role');return (await db.query("select public.claim_recap($1,$2,'synthetic') v",[message,a])).rows[0].v;};
 const finishRecap=async(job,story,recent='They are chatting about weekends.',topics=['work'],failure=null)=>{await actor('','service_role');return (await db.query('select public.finish_recap($1,$2,$3,$4,$5,$6,$7) v',[c,a,job.lease,story,recent,JSON.stringify(topics),failure])).rows[0].v;};
 const row=async()=>{await db.exec('reset role');return (await db.query('select * from private.conversation_recaps where conversation_id=$1',[c])).rows[0];};
 // Every question is logged for good, deduplicated, newest first.
 await reply('Hi','Hey! What do you do for work? I teach dance.');
 await reply('I work at a bank','A banker! Where do you stay?');
 await reply('Lekki','Nice. what do you do for WORK?');
 let job=await claim(await send('Haha I told you'));
 assert.deepEqual(job.chatMemory.questionsYouAlreadyAsked,['what do you do for WORK?','Where do you stay?'],'A repeat is merged and moves to the top');
 assert.equal(job.chatMemory.questionsAskedTotal,2);assert.equal(job.chatMemory.exchanges,3);assert.equal(job.chatMemory.story,null);
 await answer(job,'Sorry o, my memory!');
 // Nothing to fold until 12 messages exist; then the oldest messages are folded first.
 assert.equal((await claimRecap()).state,'not_needed');
 for(let i=0;i<40;i++)await reply(`Message ${i}`,'Tell me more.');
 const first=await claimRecap();assert.equal(first.state,'claimed');assert.equal(first.sources.length,60);assert.equal(first.sources[0].text,'Hi');assert.equal(first.catchingUp,true,'A long chat catches up chunk by chunk');
 assert.equal((await claimRecap()).state,'generating','One refresh at a time');
 {const latest=await lastUser();await actor();await assert.rejects(db.query("select public.claim_recap($1,$2,'synthetic')",[latest,a]),/permission denied/);}
 assert.equal(await finishRecap(first,'Call 08031234567 anytime'),'discarded','Contact details are never stored');
 const retry=await claimRecap();assert.equal(retry.sources[0].text,'Hi','A rejected refresh is retried from the same place');
 assert.equal(await finishRecap(retry,'Synthetic works at a bank in Lekki. Amara teaches dance.','They are swapping stories.',['work','where they live']),'completed');
 const second=await claimRecap();assert.equal(second.state,'claimed');assert.equal(second.previousStory,'Synthetic works at a bank in Lekki. Amara teaches dance.');assert.notEqual(second.sources[0].text,'Hi');assert.equal(second.catchingUp,false);
 await finishRecap(second,'Synthetic works at a bank in Lekki. Amara teaches dance. They joke about memory.','Light banter.',['work','where they live','jokes']);
 job=await claim(await send('Hello again'));
 assert.equal(job.chatMemory.story,'Synthetic works at a bank in Lekki. Amara teaches dance. They joke about memory.');assert.equal(job.chatMemory.recent,'Light banter.');assert.deepEqual(job.chatMemory.topicsCovered,['work','where they live','jokes']);
 await answer(job,'Welcome back!');
 // Payments, requests and archive/restore never touch memory.
 await db.exec('reset role');await db.query("update public.conversations set context_revision=context_revision+5,status='archived' where id=$1",[c]);await db.query("update public.conversations set status='active' where id=$1",[c]);
 assert((await row()).story.startsWith('Synthetic works'));
 // Turning memory off hides it without deleting; turning it back on restores it.
 await actor();await db.query("select public.manage_memory($1,'disable')",[char]);
 job=await claim(await send('Still there?'));assert.equal(job.chatMemory.story,null);assert(job.chatMemory.questionsYouAlreadyAsked.length>0,'Questions come from the visible chat');
 await answer(job,'Yes!');
 assert.equal((await claimRecap()).state,'unavailable','No refresh while memory is off');
 assert((await row()).story.startsWith('Synthetic works'),'Memory off keeps the stored memory');
 await actor();await db.query("select public.manage_memory($1,'enable')",[char]);
 job=await claim(await send('Back on'));assert(job.chatMemory.story.startsWith('Synthetic works'),'Memory comes back when turned on');
 await answer(job,'Yay');
 // Deleting a memory fact hides the story until it is rewritten without that fact; nothing else is lost.
 await actor();await db.query("select public.manage_memory($1,'save',$2,null,true)",[char,'Works at a bank in Lekki']);
 const fact=(await db.query('select id from public.memories where deleted_at is null')).rows[0].id;
 await db.query("select public.manage_memory($1,'delete',null,$2)",[char,fact]);
 assert.deepEqual((await row()).scrub,['Works at a bank in Lekki']);
 job=await claim(await send('Hmm'));assert.equal(job.chatMemory.story,null,'Hidden while the deleted fact is scrubbed');
 await answer(job,'Okay');
 const scrub=await claimRecap();assert.equal(scrub.state,'claimed','A scrub runs without waiting for 12 messages');assert.deepEqual(scrub.removeFacts,['Works at a bank in Lekki']);
 await finishRecap(scrub,'Synthetic lives in Lekki. Amara teaches dance. They joke about memory.','Catching up.',['where they live','jokes']);
 assert.deepEqual((await row()).scrub,[]);
 job=await claim(await send('Ok'));assert.equal(job.chatMemory.story,'Synthetic lives in Lekki. Amara teaches dance. They joke about memory.');
 await answer(job,'Ok!');
 // Only an explicit reset clears memory and the question log.
 await db.exec('reset role');await db.query('update public.conversations set generation=generation+1 where id=$1',[c]);
 assert.equal(Number((await db.query('select count(*) n from private.conversation_recaps')).rows[0].n),0);
 assert.equal(Number((await db.query('select count(*) n from private.conversation_questions')).rows[0].n),0);
 console.log('Long-term memory passed: all-time question log, oldest-first catch-up in 60-message chunks, one refresh at a time, contact details refused, carry-forward, untouched by payments/requests/archive, memory off hides and restores, deleted facts scrubbed without losing the rest, only reset clears, service-only.');
}finally{await db.close();}
