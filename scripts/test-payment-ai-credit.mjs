import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${a}','{"adult_declaration":"18-plus-v1"}');update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;`);
 const char=(await db.query("insert into public.characters(name,age,gender,status) values('Synthetic adult',28,'woman','published') returning id")).rows[0].id;
 for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash) values($1,$2,$3,true,'approved',true,$4)",[char,slot,`${char}/${slot}.webp`,'a'.repeat(64)]);
 await db.query("insert into private.character_direction(character_id,direction) values($1,'Synthetic adult direction')",[char]);
 const actor=async(id=a,role='authenticated')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 await actor();const c=(await db.query('select public.start_conversation($1) id',[char])).rows[0].id;
 // $2 a day per person; each reply reserves a small worst case.
 await db.exec("reset role;update private.bachs_configuration set enabled=true,recipient_name='Synthetic operator',organization_id='acct_synthetic',environment='production';update private.ai_configuration set enabled=true,model='synthetic',project_daily_micro_usd=100000000,user_daily_micro_usd=2000000,input_micro_usd_per_million=1,output_micro_usd_per_million=1;");
 const cost=Number((await db.query('select ceil((max_input_tokens::numeric+max_output_tokens)/1000000)::bigint v from private.ai_configuration')).rows[0].v);
 const today="(now() at time zone 'UTC')::date";
 const personal=async()=>{await db.exec('reset role');return Number((await db.query(`select amount_micro_usd v from private.ai_daily_usage where day=${today} and scope=$1`,[a])).rows[0]?.v);};
 const send=async(text='Hello')=>{await actor();return (await db.query('select public.save_user_message($1,gen_random_uuid(),1,$2) v',[c,text])).rows[0].v.id;};
 const claim=async message=>{await actor('','service_role');return (await db.query("select public.claim_reply($1,$2,'synthetic') v",[message,a])).rows[0].v;};
 const pay=async(amount,environment='production',state='paid')=>{
  await actor('','service_role');
  const row=(await db.query("select public.reserve_gift($1,$2,$3,gen_random_uuid(),$4,'acct_synthetic') v",[a,c,amount,environment])).rows[0].v;
  const suffix=row.id.replaceAll('-','');
  await db.query("select public.bind_gift_checkout($1,$2,$3,now()+interval '1 hour')",[row.id,`chk_${suffix}`,`https://checkout.bachs.io/c/${suffix}`]);
  const verify=s=>db.query("select public.apply_gift_verification($1,$2,$3,$4,now(),$5)",[row.id,`chk_${suffix}`,`pay_${suffix}`,s,`evt_${s}_${suffix}`]);
  await verify(state);return {id:row.id,verify};
 };
 // The person has used their whole day: replies stop.
 await db.exec(`reset role;insert into private.ai_daily_usage(day,scope,amount_micro_usd) values(${today},'${a}',2000000);`);
 const blocked=await send('Are you there?');assert.equal((await claim(blocked)).state,'budget_exhausted');
 // ₦2,000 (200,000 kobo) unlocks $0.80 for today, and the waiting message can be answered.
 const first=await pay(200000);assert.equal(await personal(),1200000);
 const job=await claim(blocked);assert.equal(job.state,'claimed','A paying person can chat again straight away');
 await db.query("select public.finish_reply($1,$2,$3,'I am here!')",[job.job,a,job.lease]);
 // Webhook replays and repeated paid events never credit twice.
 await actor('','service_role');await first.verify('paid');await first.verify('paid');assert.equal(await personal(),1200000+cost);
 // Sandbox, failed and review payments give nothing.
 await db.exec("reset role;update private.bachs_configuration set environment='sandbox';");await pay(500000,'sandbox');
 await db.exec("reset role;update private.bachs_configuration set environment='production';");await pay(500000,'production','failed');await pay(500000,'production','review');
 assert.equal(await personal(),1200000+cost);
 // ₦10,000 unlocks $4.00; personal usage may go below zero while credit remains.
 await pay(1000000);assert.equal(await personal(),-2800000+cost);
 // Settlement refunds keep that credit: only the site total floors at zero.
 const next=await claim(await send('Tell me more'));assert.equal(next.state,'claimed');assert.equal(await personal(),-2800000+2*cost);
 await db.exec(`reset role;update private.ai_daily_usage set amount_micro_usd=0 where day=${today} and scope='project';`);
 await actor('','service_role');assert.equal((await db.query('select public.settle_ai_usage($1,$2,0,0,0,0) v',[next.lease,a])).rows[0].v,'settled');
 assert.equal(await personal(),-2800000+cost);
 await db.exec('reset role');assert.equal(Number((await db.query(`select amount_micro_usd v from private.ai_daily_usage where day=${today} and scope='project'`)).rows[0].v),0);
 assert.equal(Number((await db.query('select count(*) n from private.ai_payment_credits')).rows[0].n),2);
 await actor();await assert.rejects(db.query('select * from private.ai_payment_credits'),/permission denied/);
 console.log('Payment AI credit passed: ₦1,000 adds $0.40 to today\'s personal limit, unblocks a waiting reply, once per payment, live and confirmed only, survives settlement, site limit untouched, private ledger.');
}finally{await db.close();}
