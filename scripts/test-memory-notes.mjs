import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {runReply} from '../lib/ai/reply-pipeline.mjs';
import {cleanMemoryNotes} from '../lib/ai/memory-notes.mjs';
// Light knowledge base (3 Nov): notes ride on a saved reply, stay private and never clear chat context.
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
 const send=async text=>{await actor();return (await db.query('select public.save_user_message($1,gen_random_uuid(),1,$2) v',[c,text])).rows[0].v.id;};
 const claim=async message=>{await actor('','service_role');return (await db.query("select public.claim_reply($1,$2,'synthetic') v",[message,a])).rows[0].v;};
 const finish=async job=>{await actor('','service_role');return (await db.query("select public.finish_reply($1,$2,$3,'Nice to meet you!') v",[job.job,a,job.lease])).rows[0].v;};
 const save=async(job,notes,owner=a)=>{await actor('','service_role');return (await db.query('select public.save_memory_notes($1,$2,$3) v',[job.job,owner,JSON.stringify(notes)])).rows[0].v;};
 const active=async()=>{await db.exec('reset role');return (await db.query('select content,consent from public.memories where user_id=$1 and deleted_at is null order by saved_at,id',[a])).rows;};
 const revision=async()=>{await db.exec('reset role');return Number((await db.query('select context_revision v from public.conversations where id=$1',[c])).rows[0].v);};

 // On by default: a fresh chat may take notes without any prior memory setting.
 const first=await claim(await send('I am Tolu and I work at a bank in Lekki'));assert.equal(first.memoryNotes,true);
 assert.equal(await save(first,['Name is Tolu']),0,'Notes are saved only after the reply is saved');
 assert.equal(await finish(first),'completed');const before=await revision();
 assert.equal(await save(first,['Name is Tolu','Works at a bank in Lekki','A third note']),2,'At most two notes per reply');
 assert.equal(await revision(),before,'Adding a note never clears chat context or the older-chat summary');
 assert.deepEqual((await active()).map(n=>[n.content,n.consent]).sort(),[['Name is Tolu','ordinary_shared'],['Works at a bank in Lekki','ordinary_shared']]);

 // Duplicates and sensitive details are refused by the database as well.
 const second=await claim(await send('My number is 0803 123 4567'));await finish(second);
 assert.equal(await save(second,['name is tolu','Phone is 0803 123 4567']),0);
 assert.equal(await save(second,['Email tolu@example.com','Bank PIN 1234']),0);

 // The next reply sees the notes.
 const third=await claim(await send('Do you remember me?'));assert.deepEqual([...third.memories].sort(),['Name is Tolu','Works at a bank in Lekki']);await finish(third);

 // Owner and role isolation.
 assert.equal(await save(third,['Likes jollof'],b),0,'Another user cannot write notes through this job');
 await actor();await assert.rejects(db.query('select public.save_memory_notes($1,$2,$3)',[third.job,a,'["Likes jollof"]']),/permission denied/);

 // Users still see, delete and turn notes off; deleting still invalidates context.
 const listed=(await db.query('select id,content from public.memories order by content')).rows;assert.equal(listed.length,2);
 const beforeDelete=await revision();
 await actor();await db.query("select public.manage_memory($1,'delete',null,$2)",[char,listed[1].id]);assert((await revision())>beforeDelete,'Deleting a fact still invalidates older context');
 await actor();await db.query("select public.manage_memory($1,'disable')",[char]);
 const off=await claim(await send('I also love Afrobeats'));assert.equal(off.memoryNotes,false);assert.deepEqual(off.memories,[],'Memory off keeps saved facts out of replies');await finish(off);
 assert.equal(await save(off,['Loves Afrobeats']),0,'Memory off means no notes');

 // Saving by hand works once memory is on.
 await actor();await db.query("select public.manage_memory($1,'enable')",[char]);await db.query("select public.manage_memory($1,'save',$2,null,true)",[char,'Birthday is 12 March']);

 // Cap: the newest 30 notes are kept and the user's own saves are never pruned.
 await db.exec('reset role');
 for(let i=0;i<34;i++)await db.query("insert into public.memories(user_id,character_id,content,consent,saved_at) values($1,$2,$3,'ordinary_shared',now()-interval '1 day'+$4*interval '1 minute')",[a,char,`Synthetic fact ${i}`,i]);
 const capped=await claim(await send('Hello again'));await finish(capped);assert.equal(await save(capped,['Plays five-a-side on Sundays']),1);
 await db.exec('reset role');
 assert.equal(Number((await db.query("select count(*) n from public.memories where user_id=$1 and consent='ordinary_shared' and deleted_at is null",[a])).rows[0].n),30);
 assert.equal(Number((await db.query("select count(*) n from public.memories where user_id=$1 and consent='explicit' and deleted_at is null",[a])).rows[0].n),1);

 // Pipeline: notes returned with the model reply are saved after the reply commits.
 assert.deepEqual(cleanMemoryNotes(['  Name   is  Ada ','Name is ada',7,'OTP is 1234']),['Name is Ada']);
 const message=await send('I just moved to Abuja');
 const calls={claim_reply:['select public.claim_reply($1,$2,$3) v',x=>[x.p_message,x.p_actor,x.p_model]],finish_reply:['select public.finish_reply($1,$2,$3,$4,$5,$6) v',x=>[x.p_job,x.p_actor,x.p_lease,x.p_text,x.p_failure,x.p_asset]],save_memory_notes:['select public.save_memory_notes($1,$2,$3) v',x=>[x.p_job,x.p_actor,JSON.stringify(x.p_notes)]]};
 const client={rpc:async(name,args)=>{const call=calls[name];if(!call)return {data:null};await actor('','service_role');try{return {data:(await db.query(call[0],call[1](args))).rows[0].v};}catch(error){return {error};}}};
 const fetcher=async(_url,options)=>{const schema=JSON.parse(options.body).text.format.schema;assert(schema.required.includes('rememberFacts'));const out={text:'Abuja! How are you finding it?',photoAssetId:null,rememberFacts:['Recently moved to Abuja']};for(const key of schema.required)if(!(key in out))out[key]=key==='giftLink'?false:null;return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(out)}]}]});};
 assert.equal(await runReply(client,message,a,{key:'SYNTHETIC',model:'synthetic'},{fetcher}),'completed');
 await db.exec('reset role');assert.equal(Number((await db.query("select count(*) n from public.memories where content='Recently moved to Abuja' and deleted_at is null")).rows[0].n),1);
 console.log('Memory notes passed: on by default, saved only with a completed reply, two per reply, deduplicated, sensitive details refused, owner-only and service-only, no context reset on add, delete still invalidates, memory off stops notes, newest 30 kept, own saves kept, pipeline saves model notes.');
}finally{await db.close();}
