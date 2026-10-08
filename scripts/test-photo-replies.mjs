import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {runReply} from '../lib/ai/reply-pipeline.mjs';
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${a}','{"adult_declaration":"18-plus-v1"}'),('${b}','{"adult_declaration":"18-plus-v1"}');update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;`);
 const cast=[];const galleries=[];
 for(let i=0;i<2;i++){
  const id=(await db.query("insert into public.characters(name,age,gender,status) values($1,28,'woman','published') returning id",[`Synthetic ${i}`])).rows[0].id;cast.push(id);
  await db.query("insert into private.character_direction(character_id,direction) values($1,'SYNTHETIC PRIVATE PHOTO DIRECTION')",[id]);
  for(const slot of ['portrait','gallery']){
   const asset=(await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash,alt_text) values($1,$2,$3,true,'approved',true,$4,'Synthetic approved character photo') returning id",[id,slot,`${id}/${slot}.webp`,'a'.repeat(64)])).rows[0].id;
   if(slot==='gallery')galleries.push(asset);
  }
 }
 await db.exec("update private.ai_configuration set enabled=true,model='synthetic',project_daily_micro_usd=100,user_daily_micro_usd=100,input_micro_usd_per_million=1,output_micro_usd_per_million=1");
 const actor=async(id,role='authenticated')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 await actor(a);const c=(await db.query('select public.start_conversation($1) as id',[cast[0]])).rows[0].id;
 const send=async()=>{await actor(a);const id=(await db.query("select public.save_user_message($1,gen_random_uuid(),1,'Synthetic photo request') as v",[c])).rows[0].v.id;await actor('', 'service_role');return id;};
 const claim=async(id)=>(await db.query("select public.claim_reply($1,$2,'synthetic') as v",[id,a])).rows[0].v;
 const finish=async(job,asset)=>(await db.query('select public.finish_reply($1,$2,$3,$4,null,$5) as v',[job.job,a,job.lease,'Synthetic approved-photo reply',asset])).rows[0].v;
 const cancel=async(id)=>{await actor(a);await db.query('select public.cancel_reply($1)',[id]);await actor('', 'service_role');};
 const client={rpc:async(name,p)=>({error:null,data:name==='claim_reply'?(await db.query('select public.claim_reply($1,$2,$3) as v',[p.p_message,p.p_actor,p.p_model])).rows[0].v:
 (await db.query('select public.finish_reply($1,$2,$3,$4,$5,$6) as v',[p.p_job,p.p_actor,p.p_lease,p.p_text,p.p_failure,p.p_asset])).rows[0].v})};
 let calls=0;const settings={model:'synthetic',key:'SYNTHETIC-NOT-A-KEY'};
 const fetcher=async(_url,options)=>{calls++;const body=JSON.parse(options.body);assert.deepEqual(body.text.format.schema.properties.photoAssetId.enum,[null,galleries[0]]);
 return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text:'Synthetic approved-photo reply',photoAssetId:galleries[0]})}]}]}));};
 const first=await send();assert.equal(await runReply(client,first,a,settings,{fetcher}),'completed');assert.equal(await runReply(client,first,a,settings,{fetcher}),'completed');assert.equal(calls,1);
 await actor(a);const messages=(await db.query('select sequence,kind,asset_id from public.messages where conversation_id=$1 order by sequence',[c])).rows;
 assert.deepEqual(messages.map(m=>m.kind),['text','text','photo']);assert.deepEqual(messages.map(m=>Number(m.sequence)),[1,2,3]);assert.equal(messages[2].asset_id,galleries[0]);
 await actor(b);assert.equal((await db.query('select * from public.messages where conversation_id=$1',[c])).rows.length,0);await assert.rejects(db.query('select public.finish_reply(gen_random_uuid(),$1,gen_random_uuid(),null,null,$2)',[a,galleries[0]]),/permission denied/);
 await actor('', 'service_role');await assert.rejects(db.query('select private.finish_text_reply(gen_random_uuid(),$1,gen_random_uuid(),null,null)',[a]),/permission denied/);
 const foreign=await send();const foreignJob=await claim(foreign);assert.equal(await finish(foreignJob,galleries[1]),'failed');await cancel(foreign);
 const withdrawn=await send();const withdrawnJob=await claim(withdrawn);
 await db.exec('reset role');await db.query("update public.character_assets set review_state='rejected',published=false,version=version+1 where id=$1",[galleries[0]]);await actor('', 'service_role');assert.equal(await finish(withdrawnJob,galleries[0]),'discarded');await cancel(withdrawn);
 await db.exec('reset role');await db.query("update public.character_assets set review_state='approved',published=true,version=version+1 where id=$1",[galleries[0]]);
 const paused=await send();const pausedJob=await claim(paused);await db.exec('reset role');await db.exec("update private.capability_controls set photos=false where scope='global'");await actor('', 'service_role');assert.equal(await finish(pausedJob,galleries[0]),'failed');await cancel(paused);
 const off=await send();const offJob=await claim(off);assert.deepEqual(offJob.photos,[]);assert.equal(await finish(offJob,null),'completed');
 await db.exec('reset role');await db.exec("update private.capability_controls set photos=true where scope='global'");
 const changed=await send();const changedJob=await claim(changed);await db.exec('reset role');await db.query('update public.character_assets set version=version+1 where id=$1',[galleries[0]]);await actor('', 'service_role');assert.equal(await finish(changedJob,galleries[0]),'failed');await cancel(changed);
 const added=await send();const addedJob=await claim(added);await db.exec('reset role');
 const newAsset=(await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,'chat',$2,true,'approved',true,$3) returning id",[cast[0],`${cast[0]}/new-chat.webp`,'b'.repeat(64)])).rows[0].id;
 await actor('', 'service_role');assert.equal(await finish(addedJob,newAsset),'failed');await cancel(added);
 await db.exec('reset role');assert.equal(Number((await db.query("select count(*) as n from public.messages where kind='photo'")).rows[0].n),1);
 console.log('Photo reply checks passed: bounded same-character approved candidates, nullable output, private legacy boundary, atomic ordered text/photo persistence, transport/output idempotency, foreign actor/asset denial, withdrawal, global pause, changed asset version and unadvertised asset rejection. No network calls made.');
}finally{await db.close();}
