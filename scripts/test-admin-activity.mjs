import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Admin users and activity (3 Nov): counts only, admins only, active now = a message in the last 10 minutes.
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
 const send=async text=>{await db.exec('reset role;delete from private.request_limits');await actor();return (await db.query('select public.save_user_message($1,gen_random_uuid(),1,$2) v',[c,text])).rows[0].v.id;};
 await send('Hello');await send('Are you there?');
 await db.exec('reset role');await db.query("insert into public.messages(conversation_id,sequence,role,kind,text) values($1,99,'character','text','Hey!')",[c]);
 // A message from an hour ago counts as active today (when still the same Lagos day) but not active now.
 await db.query("update public.messages set created_at=now()-interval '20 minutes' where text='Hello'");
 await actor();await assert.rejects(db.query('select public.admin_activity_stats()'),/forbidden|admin/,'Only administrators can read activity');
 await db.exec(`reset role;insert into private.user_roles(user_id,role) values('${b}','admin');`);
 await actor(b);const stats=(await db.query('select public.admin_activity_stats() v')).rows[0].v;
 assert.equal(stats.users,2);assert.equal(stats.newToday,2);assert.equal(stats.messagesSent,2);assert.equal(stats.characterReplies,1);
 assert.equal(stats.activeNow,1,'One person sent a message in the last 10 minutes');assert(stats.activeToday>=1);assert(stats.messagesToday>=1);
 await db.exec(`reset role;update public.messages set created_at=now()-interval '11 minutes' where role='user';update public.profiles set deletion_scheduled_for=now()+interval '30 days' where id='${a}';`);
 await actor(b);const later=(await db.query('select public.admin_activity_stats() v')).rows[0].v;
 assert.equal(later.activeNow,0,'Older than 10 minutes is not active now');assert.equal(later.users,1,'Accounts scheduled for deletion are not counted');
 assert.deepEqual(Object.keys(later).sort(),['activeNow','activeToday','characterReplies','checkedAt','messagesSent','messagesToday','newToday','users'],'Counts only');
 // Most popular characters: published only, ranked by people this week, counts only.
 await db.exec('reset role');const quiet=(await db.query("insert into public.characters(name,age,gender,status) values('Quiet character',30,'man','published') returning id")).rows[0].id;
 await actor(b);const popular=(await db.query('select public.admin_character_popularity() v')).rows[0].v;
 assert.deepEqual(popular.map(r=>r.name),['Synthetic adult','Quiet character']);
 assert.deepEqual([popular[0].people,popular[0].messages,popular[0].thisWeek],[1,2,1]);assert(popular[0].minutesSinceLast>=11);
 assert.deepEqual([popular[1].people,popular[1].messages,popular[1].minutesSinceLast],[0,0,null]);assert.equal(popular[1].id,quiet);
 await actor();await assert.rejects(db.query('select public.admin_character_popularity()'),/forbidden|admin/,'Only administrators');
 // Money received (4 Nov): live confirmed payments only, gross, admins only.
 await db.exec('reset role');
 const intent=(amount,status,environment='production',review=false,ago='0 minutes')=>db.query(`insert into public.payment_intents(user_id,conversation_id,character_id,amount_minor,reference,idempotency_key,recipient_disclosure,status,gateway_environment,needs_review,verified_at)
  values($1,$2,$3,$4,gen_random_uuid()::text,gen_random_uuid()::text,'Synthetic operator',$5,$6,$7,now()-$8::interval)`,[a,c,char,amount,status,environment,review,ago]);
 await intent(200000,'paid');await intent(500000,'paid','production',false,'10 days');await intent(900000,'paid','sandbox');
 await intent(300000,'failed');await intent(400000,'paid','production',true);await intent(700000,'refunded');
 await actor();await assert.rejects(db.query('select public.admin_payment_totals()'),/forbidden|admin/,'Only administrators see money');
 await actor(b);const money=(await db.query('select public.admin_payment_totals() v')).rows[0].v;
 assert.deepEqual([money.totalMinor,money.payments,money.payers,money.largestMinor],[700000,2,1,500000],'Live confirmed payments only: no sandbox, failed, review or refunds');
 assert.deepEqual([money.todayMinor,money.todayPayments,money.weekMinor],[200000,1,200000]);
 assert.deepEqual([money.needsReview,money.refunds,money.refundedMinor],[1,1,700000]);
 assert.deepEqual(money.topCharacters,[{name:'Synthetic adult',amountMinor:700000,payments:2}]);
 console.log('Money received passed: live confirmed totals, today/week, review and refunds kept apart, sandbox excluded, top characters, admins only.');
 console.log('Admin activity passed: character popularity ranking, admins only, users excluding scheduled deletions, new today, active now (10 minutes), active today, messages sent and today, character replies, counts only.');
}finally{await db.close();}
