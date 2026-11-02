import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {approvedRequestPolicySql} from '../lib/payments/request-policy.mjs';
// Exercises the founder-approved pacing against the full migration chain.
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${a}','{"adult_declaration":"18-plus-v1"}');update public.profiles set display_name='Synthetic',genders=array['woman','man'],ai_consent_at=now(),onboarding_complete=true;`);
 const character=async(name,gender)=>{
  const id=(await db.query("insert into public.characters(name,age,gender,status) values($1,28,$2,'published') returning id",[name,gender])).rows[0].id;
  // Chat is available only with approved photos and a published direction.
  for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[id,slot,`${id}/${slot}.webp`,'a'.repeat(64)]);
  await db.query("insert into private.character_direction(character_id,direction) values($1,'Synthetic direction')",[id]);
  return id;
 };
 const woman=await character('Synthetic woman','woman'),man=await character('Synthetic man','man');
 const actor=async()=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`);
 await actor();
 const view=(await db.query('select public.request_settings(1) v')).rows[0].v;
 await db.query('select public.set_request_preferences(true,$1)',[view.version]);
 const start=async id=>{await actor();return (await db.query('select public.start_conversation($1) id',[id])).rows[0].id;};
 const withWoman=await start(woman),withMan=await start(man);
 await db.exec('reset role');
 await db.exec(approvedRequestPolicySql());
 const policy=(await db.query('select * from private.monetary_request_policy')).rows[0];
 assert.equal(policy.enabled,true);assert.equal(policy.minimum_completed_exchanges,20);assert.equal(policy.cooldown_seconds,3600);
 assert.equal(Number(policy.minimum_amount_minor),200000);assert.equal(Number(policy.maximum_amount_minor),1000000,'Requests suggest at most NGN 10,000');
 // A completed reply job is one exchange; insert the minimum rows the counter reads.
 const exchange=async(c,count=1)=>{for(let i=0;i<count;i++){
  const row=(await db.query('select generation,next_sequence from public.conversations where id=$1',[c])).rows[0];
  const message=(await db.query("insert into public.messages(conversation_id,sequence,role,kind,text) values($1,$2,'user','text','hello') returning id",[c,row.next_sequence])).rows[0].id;
  await db.query('update public.conversations set next_sequence=next_sequence+1 where id=$1',[c]);
  await db.query("insert into private.reply_jobs(conversation_id,user_message_id,generation,state) values($1,$2,$3,'completed')",[c,message,row.generation]);
 }};
 // A request as finish_gift_reply records it: a proposal on a character message.
 const ask=async c=>{
  const row=(await db.query('select next_sequence from public.conversations where id=$1',[c])).rows[0];
  const message=(await db.query("insert into public.messages(conversation_id,sequence,role,kind,text) values($1,$2,'character','text','Shawarma money?') returning id",[c,row.next_sequence])).rows[0].id;
  await db.query('update public.conversations set next_sequence=next_sequence+1,last_monetary_request_at=now()-interval \'2 hours\' where id=$1',[c]);
  await db.query('insert into public.gift_proposals(conversation_id,user_id,message_id,amount_minor) values($1,$2,$3,300000)',[c,a,message]);
 };
 const reason=async c=>(await db.query('select private.monetary_request_eligibility($1,$2) v',[c,a])).rows[0].v.reason;
 // Milestones 20, 50, 100, then every 30 replies, for women and men alike.
 for(const c of [withWoman,withMan]){
  let done=0;
  for(const milestone of [20,50,100,130,160]){
   await exchange(c,milestone-1-done);done=milestone-1;
   assert.equal(await reason(c),'early_chat',`${done} replies must be before the milestone at ${milestone}`);
   await exchange(c);done++;
   assert.equal(await reason(c),null,`${milestone} replies must allow a request`);
   await ask(c);
  }
 }
 await db.query('update public.conversations set last_monetary_request_at=now() where id=$1',[withWoman]);
 await exchange(withWoman,30);
 assert.equal(await reason(withWoman),'cooldown','two requests never land in the same hour');
 const migration=await readFile('supabase/migrations/202611030033_billing_milestones.sql','utf8');
 assert(!/gender='woman'/.test(migration.replace(/^--.*$/gm,'')),'claim and finish must not restrict requests to women');
 console.log('Request policy passed: founder-approved milestones 20/50/100 then every 30 replies, male and female characters, one-hour spacing, NGN 2,000-10,000 suggestions, requests on by default.');
}finally{await db.close();}
