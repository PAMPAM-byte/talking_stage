import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {generateSummary,runSummary} from '../lib/ai/summary-pipeline.mjs';
import {buildInput} from '../lib/ai/provider.mjs';
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const settings={key:'SYNTHETIC-NOT-A-KEY',model:'synthetic'};
const response=value=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]}));
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${a}','{"adult_declaration":"18-plus-v1"}'),('${b}','{"adult_declaration":"18-plus-v1"}');update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;`);
 const char=(await db.query("insert into public.characters(name,age,gender,status) values('Synthetic adult',28,'woman','published') returning id")).rows[0].id;
 await db.query("insert into private.character_direction(character_id,direction) values($1,'PRIVATE VOICE NOT FOR SUMMARY')",[char]);
 for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[char,slot,`${char}/${slot}.webp`,'a'.repeat(64)]);
 const actor=async(id='',role='service_role')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 await actor(a,'authenticated');const c=(await db.query('select public.start_conversation($1) as id',[char])).rows[0].id;
 const memory=async(op,text=null,id=null)=>{await actor(a,'authenticated');await db.query('select public.manage_memory($1,$2,$3,$4,true)',[char,op,text,id]);};
 await memory('enable');await memory('save','SAVED FACT NOT FOR SUMMARY');
 const fact=(await db.query('select id from public.memories')).rows[0].id;
 await db.exec('reset role');await db.exec("update private.ai_configuration set enabled=true,model='synthetic',project_daily_micro_usd=1000,user_daily_micro_usd=1000,input_micro_usd_per_million=1,output_micro_usd_per_million=1");
 // Seed only this isolated synthetic thread. No real cast or provider is touched.
 const turn=async()=>{
  await db.exec('reset role');
  await db.query("insert into public.messages(conversation_id,sequence,role,kind,text) select $1,next_sequence+n,'user','text','Synthetic topic '||n from public.conversations cross join generate_series(0,21) n where id=$1",[c]);
  await db.query('update public.conversations set next_sequence=next_sequence+22 where id=$1',[c]);
  await actor(a,'authenticated');const generation=(await db.query('select generation from public.conversations where id=$1',[c])).rows[0].generation;
  const message=(await db.query("select public.save_user_message($1,gen_random_uuid(),$2,'Synthetic latest question') as v",[c,generation])).rows[0].v.id;
  await actor();const reply=(await db.query("select public.claim_reply($1,$2,'synthetic') as v",[message,a])).rows[0].v;
  assert.equal(reply.state,'claimed');assert.equal((await db.query("select public.finish_reply($1,$2,$3,'Synthetic latest answer') as v",[reply.job,a,reply.lease])).rows[0].v,'completed');return message;
 };
 const claim=async(message,owner=a)=>(await db.query("select public.claim_summary($1,$2,'synthetic') as v",[message,owner])).rows[0].v;
 const finish=async(job,excerpts,owner=a)=>(await db.query('select public.finish_summary($1,$2,$3,$4,null) as v',[c,owner,job.lease,JSON.stringify(excerpts)])).rows[0].v;
 const excerpts=job=>[{messageId:job.sources[0].id,text:job.sources[0].text}];
 let message=await turn();assert.equal((await claim(message)).state,'blocked_provider');
 await db.exec('reset role');await db.exec('update private.ai_configuration set summaries_enabled=true');
 // A reply claimed under the previous configuration cannot initiate a summary.
 await actor();assert.equal((await claim(message)).state,'blocked_provider');message=await turn();
 assert.equal((await claim(message,b)).state,'unavailable');
 await actor(b,'authenticated');await assert.rejects(db.query("select public.claim_summary($1,$2,'synthetic')",[message,a]),/permission denied/);
 await actor();await assert.rejects(db.query('select * from private.conversation_summaries'),/permission denied/);
 const job=await claim(message);assert.equal(job.state,'claimed');assert(job.sources.length<=40);
 assert(!JSON.stringify(job).includes('SAVED FACT'));assert(!JSON.stringify(job).includes('PRIVATE VOICE'));
 assert.equal((await claim(message)).state,'generating');assert.equal(await finish(job,excerpts(job),b),'discarded');
 assert.equal(await finish(job,excerpts(job)),'completed');assert.equal(await finish(job,excerpts(job)),'completed');
 assert.equal((await claim(message)).state,'completed');
 await db.exec('reset role');assert.equal(Number((await db.query('select count(*) n from private.summary_reservations')).rows[0].n),1);
 assert.equal(Number((await db.query("select amount_micro_usd n from private.ai_daily_usage where scope='project'")).rows[0].n),3); // two replies + one summary
 await actor(a,'authenticated');const next=(await db.query("select public.save_user_message($1,gen_random_uuid(),1,'New topic') as v",[c])).rows[0].v.id;
 await actor();const withSummary=(await db.query("select public.claim_reply($1,$2,'synthetic') as v",[next,a])).rows[0].v;
 assert.equal(withSummary.summary.length,1);assert.equal(withSummary.summary[0].role,'user');
 assert(buildInput(withSummary)[1].content.includes('summaryExcerpts'));await db.query("select public.finish_reply($1,$2,$3,'New answer')",[withSummary.job,a,withSummary.lease]);
 const oldThrough=job.sources.at(-1).sequence;
 await memory('delete',null,fact);await db.exec('reset role');assert.equal((await db.query('select * from private.conversation_summaries')).rows.length,0);
 const barrier=Number((await db.query('select summary_after_sequence from public.conversations where id=$1',[c])).rows[0].summary_after_sequence);assert(barrier>Number(oldThrough));
 message=await turn();let pending=await claim(message);assert(pending.sources.every(source=>Number(source.sequence)>barrier));
 await memory('disable');await actor();assert.equal(await finish(pending,excerpts(pending)),'discarded');assert.equal((await claim(message)).state,'unavailable');
 await memory('enable');message=await turn();pending=await claim(message);
 assert.equal(await finish(pending,[{messageId:pending.sources[0].id,text:'Invented source fact'}]),'failed');assert.equal((await claim(message)).state,'failed');
 const failedMessage=message;
 message=await turn();pending=await claim(message);assert.equal(await finish(pending,[{messageId:'00000000-0000-4000-8000-000000000099',text:'Synthetic'}]),'failed');
 assert.equal((await claim(failedMessage)).state,'already_attempted');
 message=await turn();pending=await claim(message);await db.exec('reset role');await db.query("update private.conversation_summaries set lease_until=now()-interval '1 second' where conversation_id=$1",[c]);await actor();assert.equal(await finish(pending,excerpts(pending)),'discarded');
 message=await turn();pending=await claim(message);await db.exec('reset role');await db.query("update public.profiles set language='english_pidgin' where id=$1",[a]);await actor();assert.equal(await finish(pending,excerpts(pending)),'discarded');
 message=await turn();pending=await claim(message);await db.exec('reset role');await db.exec("update private.capability_controls set chat=false where scope='global'");await actor();assert.equal(await finish(pending,excerpts(pending)),'discarded');await db.exec('reset role');await db.exec("update private.capability_controls set chat=true where scope='global'");
 message=await turn();pending=await claim(message);await db.exec('reset role');await db.query('update private.character_direction set version=version+1 where character_id=$1',[char]);await actor();assert.equal(await finish(pending,excerpts(pending)),'discarded');
 message=await turn();pending=await claim(message);await db.exec('reset role');await db.exec('update private.ai_configuration set max_output_tokens=512');await actor();assert.equal(await finish(pending,excerpts(pending)),'discarded');
 // Shared budget exhaustion rejects a summary before any transport call.
 message=await turn();await db.exec('reset role');await db.exec("update private.ai_daily_usage set amount_micro_usd=1000 where scope='project'");await actor();assert.equal((await claim(message)).state,'budget_exhausted');await db.exec('reset role');await db.exec('update private.ai_daily_usage set amount_micro_usd=0');
 const client={rpc:async(name,p)=>({error:null,data:name==='claim_summary'?(await db.query('select public.claim_summary($1,$2,$3) as v',[p.p_message,p.p_actor,p.p_model])).rows[0].v:(await db.query('select public.finish_summary($1,$2,$3,$4,$5) as v',[p.p_conversation,p.p_actor,p.p_lease,JSON.stringify(p.p_excerpts),p.p_failure])).rows[0].v})};
 let calls=0;const fetcher=async(_url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.name,'talkingstage_summary');assert.equal(body.tools,undefined);
 const sources=JSON.parse(body.input[1].content).sources;assert(body.text.format.schema.properties.excerpts.items.properties.messageId.enum.includes(sources[0].id));return response({excerpts:[{messageId:sources[0].id,text:sources[0].text}]});};
 await actor();assert.equal(await runSummary(client,message,a,settings,{fetcher}),'completed');assert.equal(await runSummary(client,message,a,settings,{fetcher}),'completed');assert.equal(calls,1);
 const context={sources:[{id:a,role:'user',text:'Exact source quote'}],maxInputTokens:48000,maxOutputTokens:512};
 await assert.rejects(generateSummary(context,settings,{fetcher:async()=>response({excerpts:[{messageId:a,text:'Invented'}]})}),/invalid_output/);
 await assert.rejects(generateSummary(context,settings,{fetcher:async()=>response({excerpts:[{messageId:b,text:'Exact'}]})}),/invalid_output/);
 await assert.rejects(generateSummary(context,settings,{fetcher:async()=>response({excerpts:[{messageId:a,text:'Exact'},{messageId:a,text:'source'}]})}),/invalid_output/);
 await assert.rejects(generateSummary({...context,maxInputTokens:1024},settings,{fetcher}),/context_limit/);
 // Archive/restore removes summaries; reset clears source history and rejects copied output.
 await actor(a,'authenticated');let version=(await db.query('select version from public.conversations where id=$1',[c])).rows[0].version;
 await db.query("select public.manage_conversation($1,$2,'archive')",[c,version]);await db.exec('reset role');assert.equal((await db.query('select * from private.conversation_summaries')).rows.length,0);
 await actor(a,'authenticated');version=(await db.query('select version from public.conversations where id=$1',[c])).rows[0].version;await db.query("select public.manage_conversation($1,$2,'restore')",[c,version]);
 message=await turn();pending=await claim(message);await actor(a,'authenticated');version=(await db.query('select version from public.conversations where id=$1',[c])).rows[0].version;await db.query("select public.manage_conversation($1,$2,'reset',false)",[c,version]);
 await actor();assert.equal(await finish(pending,excerpts(pending)),'discarded');await db.exec('reset role');assert.equal((await db.query('select * from private.conversation_summaries')).rows.length,0);assert.equal(Number((await db.query('select summary_after_sequence from public.conversations where id=$1',[c])).rows[0].summary_after_sequence),0);
 assert(Number((await db.query('select count(*) n from private.summary_reservations')).rows[0].n)>0);
 console.log('Offline summaries passed: scoped exact excerpts, shared independent budgets, duplicate suppression, ownership/grants, memory deletion/disable barriers, invalid output, lease/profile/direction/config/pause/archive/reset invalidation and DB-to-injected-provider-to-commit processing. No network calls made.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.close();}
