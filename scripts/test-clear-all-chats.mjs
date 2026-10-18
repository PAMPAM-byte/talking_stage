import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const a = '00000000-0000-4000-8000-000000000001', b = '00000000-0000-4000-8000-000000000002', incomplete = '00000000-0000-4000-8000-000000000003';
try {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  await db.exec(`insert into auth.users values('${a}','{"adult_declaration":"18-plus-v1"}'),('${b}','{"adult_declaration":"18-plus-v1"}'),('${incomplete}','{}');
    update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true where id in ('${a}','${b}');
    insert into public.characters(name,age,gender,status) select 'Synthetic '||n,28,'woman','published' from generate_series(1,35) n;
    insert into public.character_assets(character_id,slot,storage_path,published,review_state,review_attested,source_hash)
    select id,slot,id::text||'/'||slot||'.webp',true,'approved',true,repeat('a',64) from public.characters cross join (values('portrait'),('gallery')) slots(slot);
    insert into private.character_direction(character_id,direction) select id,'Synthetic private direction' from public.characters;
    insert into public.conversations(user_id,character_id,status,next_sequence) select '${a}',id,case when row_number() over(order by id)%2=0 then 'archived' else 'active' end,2 from public.characters;
    insert into public.conversations(user_id,character_id,next_sequence) select '${b}',id,2 from public.characters order by id limit 3;
    insert into public.messages(conversation_id,sequence,role,kind,text) select id,1,'user','text','Synthetic history' from public.conversations;
    insert into private.reply_jobs(conversation_id,user_message_id,generation,state) select conversation_id,id,1,'pending' from public.messages;
    insert into public.memories(user_id,character_id,content,consent,source_message_id,source_conversation_id)
    select c.user_id,c.character_id,'Synthetic remembered fact','explicit',m.id,c.id from public.conversations c join public.messages m on m.conversation_id=c.id;
    update private.ai_configuration set enabled=true,model='synthetic',project_daily_micro_usd=1000000,user_daily_micro_usd=1000000,input_micro_usd_per_million=1,output_micro_usd_per_million=1;`);
  const actor = async (id, role = 'authenticated') => db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
  const count = async (sql, params = []) => Number((await db.query(sql, params)).rows[0].n);
  const own = (await db.query("select c.id,c.character_id,m.id as message from public.conversations c join public.messages m on m.conversation_id=c.id where c.user_id=$1 and c.status='active' order by c.id limit 1", [a])).rows[0];
  await db.query(`insert into public.payment_intents(user_id,conversation_id,character_id,amount_minor,reference,idempotency_key,recipient_disclosure,status) values($1,$2,$3,100,'synthetic-clear','synthetic-clear','Synthetic operator','paid')`, [a, own.id, own.character_id]);
  await actor('', 'service_role');
  const lease = (await db.query('select public.claim_reply($1,$2,$3) as value', [own.message, a, 'synthetic'])).rows[0].value;
  assert.equal(lease.state, 'claimed');
  await db.exec('reset role');
  await db.query(`insert into private.conversation_summaries(conversation_id,generation,context_revision,direction_version,configuration_version,through_sequence,excerpts,state,lease,source_ids)
    select id,generation,context_revision,1,(select version from private.ai_configuration where singleton),1,'[]','completed',gen_random_uuid(),array[$2::uuid] from public.conversations where id=$1`, [own.id, own.message]);
  await db.exec("update private.capability_controls set chat=false where scope='global'");
  await actor(incomplete); await assert.rejects(db.query('select public.clear_all_conversations(false)'), /forbidden/);
  await actor('', 'anon'); await assert.rejects(db.query('select public.clear_all_conversations(false)'), /permission denied/);
  await actor(a); await assert.rejects(db.query('select public.clear_all_conversations(null)'), /invalid_operation/);
  // A failure after message deletion must roll back the entire operation.
  await db.exec('reset role');
  await db.exec(`create function private.synthetic_clear_failure() returns trigger language plpgsql as $$begin raise exception 'synthetic_failure';end;$$;
    create trigger synthetic_clear_failure before update on public.conversations for each row execute function private.synthetic_clear_failure();`);
  await actor(a); await assert.rejects(db.query('select public.clear_all_conversations(false)'), /synthetic_failure/);
  await db.exec('reset role');
  assert.equal(await count('select count(*) as n from public.messages'), 38);
  assert.equal(await count('select count(*) as n from public.conversations where deleted_at is not null'), 0);
  await db.exec('drop trigger synthetic_clear_failure on public.conversations;drop function private.synthetic_clear_failure()');
  await actor(a);
  assert.equal((await db.query('select public.clear_all_conversations(false) as n')).rows[0].n, 35);
  for (const archived of [true, false]) assert.equal((await db.query('select public.list_conversations($1,1) as value', [archived])).rows[0].value.total, 0);
  await assert.rejects(db.query('select public.conversation_thread($1)', [own.id]), /not_found/);
  assert.equal(await count('select count(*) as n from public.memories'), 35, 'Keep owned memories by default.');
  assert.equal(await count('select count(*) as n from public.memories where source_message_id is not null'), 0);
  assert.equal((await db.query('select public.clear_all_conversations(false) as n')).rows[0].n, 0, 'Repeat is safe.');
  await actor('', 'service_role');
  assert.equal((await db.query('select public.finish_reply($1,$2,$3,$4) as value', [lease.job, a, lease.lease, 'Stale reply'])).rows[0].value, 'discarded');
  await db.exec('reset role');
  assert.equal(await count('select count(*) as n from public.messages'), 3, 'Other user history survives.');
  assert.equal(await count('select count(*) as n from private.reply_jobs'), 3);
  assert.equal(await count('select count(*) as n from private.conversation_summaries'), 0);
  assert.equal(await count('select count(*) as n from public.payment_intents'), 1, 'Payment history survives.');
  await actor(b);
  assert.equal(await count('select count(*) as n from public.messages'), 3);
  await db.query('select public.clear_all_conversations(true)');
  assert.equal(await count('select count(*) as n from public.memories'), 0, 'Optional clearing removes only affected owned memories.');
  await actor(a); assert.equal(await count('select count(*) as n from public.memories'), 35, 'Other user optional clearing cannot affect this owner.');
  console.log('Clear-all passed: 35 chats across pages/tabs in one mutation, rollback on failure, owner/adult isolation, kept/cleared memories, cancelled jobs, invalidated in-flight reply and summaries, preserved payments, and safe repeat. No network calls.');
} finally { await db.close(); }
