import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {approvedRequestPolicy,approvedRequestPolicySql} from '../lib/payments/request-policy.mjs';
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
 assert.equal(policy.enabled,true);assert.equal(policy.minimum_completed_exchanges,20);assert.equal(policy.cooldown_seconds,604800);
 assert.equal(Number(policy.minimum_amount_minor),approvedRequestPolicy.minimumAmountMinor);assert.equal(Number(policy.maximum_amount_minor),approvedRequestPolicy.maximumAmountMinor);
 // A completed reply job is one exchange; insert the minimum rows the counter reads.
 const exchange=async c=>{
  const row=(await db.query('select generation,next_sequence from public.conversations where id=$1',[c])).rows[0];
  const message=(await db.query("insert into public.messages(conversation_id,sequence,role,kind,text) values($1,$2,'user','text','hello') returning id",[c,row.next_sequence])).rows[0].id;
  await db.query('update public.conversations set next_sequence=next_sequence+1 where id=$1',[c]);
  await db.query("insert into private.reply_jobs(conversation_id,user_message_id,generation,state) values($1,$2,$3,'completed')",[c,message,row.generation]);
 };
 const reason=async c=>(await db.query('select private.monetary_request_eligibility($1,$2) v',[c,a])).rows[0].v.reason;
 for(let i=0;i<19;i++)await exchange(withWoman);
 assert.equal(await reason(withWoman),'early_chat','19 exchanges must be too early');
 await exchange(withWoman);
 assert.equal(await reason(withWoman),null,'20 completed exchanges must be eligible');
 await db.query("update public.conversations set last_monetary_request_at=now()-interval '6 days' where id=$1",[withWoman]);
 assert.equal(await reason(withWoman),'cooldown','a request within 7 days must be blocked');
 await db.query("update public.conversations set last_monetary_request_at=now()-interval '7 days 1 minute' where id=$1",[withWoman]);
 assert.equal(await reason(withWoman),null,'a request after 7 days must be allowed again');
 // Mirrors the claim condition in migration 017: policy eligibility AND a female character.
 for(let i=0;i<20;i++)await exchange(withMan);
 assert.equal(await reason(withMan),null,'the pacing policy itself is gender-neutral');
 const offered=async c=>(await db.query("select ch.gender='woman' and (private.monetary_request_eligibility(v.id,$2)->>'eligible')::boolean ok from public.conversations v join public.characters ch on ch.id=v.character_id where v.id=$1",[c,a])).rows[0].ok;
 assert.equal(await offered(withWoman),true);
 assert.equal(await offered(withMan),false,'male characters must never be offered money requests');
 const genderRule=(await readFile('supabase/migrations/202610190017_bachs_payments.sql','utf8')).match(/gender='woman'/g)?.length??0;
 assert(genderRule>=2,'claim and finish must both keep the female-character rule');
 console.log('Request policy passed: approved 20-exchange minimum, 7-day cooldown, NGN 2,000-1,000,000 limits, opted-in user, female-character-only offers.');
}finally{await db.close();}
