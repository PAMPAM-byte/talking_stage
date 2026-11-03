begin;

-- Founder request, 3 November 2026: long-term memory per user and character. Users must feel
-- continuity across months or years of chat, so memory is compacted, never discarded.
-- * story: durable key points of the whole relationship. Each refresh merges new facts and
--   compresses older detail instead of dropping it.
-- * recent: the latest chapter, mood and open threads.
-- * topics: cumulative subjects already covered.
-- * conversation_questions: every question the character has ever asked in the chat, kept for good.
-- Long existing chats catch up chunk by chunk from the first message.
-- Only a chat reset or deletion clears memory. Deleting a memory fact removes just that fact
-- (the story is hidden until it is rewritten without it); turning memory off hides memory
-- without deleting it. Payments, requests and status changes never touch it.

create table private.conversation_recaps (
 conversation_id uuid primary key references public.conversations(id) on delete cascade,
 generation bigint not null,
 story text not null default '' check(char_length(story)<=2400),
 recent text not null default '' check(char_length(recent)<=1000),
 topics text[] not null default '{}' check(cardinality(topics)<=40),
 through_sequence bigint not null default 0,
 pending_through bigint,
 scrub text[] not null default '{}',
 lease uuid, lease_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table private.conversation_recaps enable row level security;
revoke all on private.conversation_recaps from public,anon,authenticated,service_role;

create table private.conversation_questions (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 question_key text not null,
 question text not null check(char_length(question) between 8 and 140),
 first_sequence bigint not null, last_sequence bigint not null, times integer not null default 1,
 primary key(conversation_id,question_key)
);
create index conversation_questions_recent on private.conversation_questions(conversation_id,last_sequence desc);
alter table private.conversation_questions enable row level security;
revoke all on private.conversation_questions from public,anon,authenticated,service_role;

-- Questions are short sentences ending in "?", keyed case- and punctuation-insensitively.
create function private.record_character_questions(p_conversation uuid,p_text text,p_sequence bigint) returns void
language sql security definer set search_path='' as $$
 insert into private.conversation_questions as q(conversation_id,question_key,question,first_sequence,last_sequence)
 select p_conversation,key,min(question),p_sequence,p_sequence from (
  select trim(found[1]) question,regexp_replace(lower(trim(found[1])),'[^a-z0-9 ]','','g') key
  from regexp_matches(p_text,'([^.!?\n]{6,140}\?)','g') found
 ) x where char_length(question) between 8 and 140 and char_length(key)>=6 group by key
 on conflict(conversation_id,question_key) do update set question=excluded.question,last_sequence=greatest(q.last_sequence,excluded.last_sequence),times=q.times+1;
$$;
revoke all on function private.record_character_questions(uuid,text,bigint) from public,anon,authenticated,service_role;

create function private.capture_character_questions() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.role='character' and new.kind='text' and position('?' in new.text)>0 then
  perform private.record_character_questions(new.conversation_id,new.text,new.sequence);
 end if;
 return null;
end;$$;
revoke all on function private.capture_character_questions() from public,anon,authenticated,service_role;
create trigger capture_character_questions after insert on public.messages for each row execute function private.capture_character_questions();

-- Existing chats keep the questions already asked.
do $$declare m record;begin
 for m in select conversation_id,text,sequence from public.messages where role='character' and kind='text' and position('?' in text)>0 order by sequence loop
  perform private.record_character_questions(m.conversation_id,m.text,m.sequence);
 end loop;
end;$$;

-- Only an explicit reset or deletion starts a fresh memory.
create function private.clear_conversation_memory() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.generation is distinct from old.generation or (new.deleted_at is not null and old.deleted_at is null) then
  delete from private.conversation_recaps where conversation_id=new.id;
  delete from private.conversation_questions where conversation_id=new.id;
 end if;
 return null;
end;$$;
revoke all on function private.clear_conversation_memory() from public,anon,authenticated,service_role;
create trigger clear_conversation_memory after update on public.conversations for each row execute function private.clear_conversation_memory();

-- A deleted or edited memory fact is scrubbed from the story on the next refresh.
create or replace function private.invalidate_memory_context() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('talkingstage.memory_note',true)='on' then return null;end if;
 update public.conversations set context_revision=context_revision+1
 where user_id=coalesce(new.user_id,old.user_id) and character_id=coalesce(new.character_id,old.character_id);
 -- Nested checks: memory_preferences rows share this trigger but have no content column.
 if tg_table_name='memories' and tg_op in ('UPDATE','DELETE') then
  if old.deleted_at is null and (tg_op='DELETE' or new.deleted_at is not null or new.content is distinct from old.content) then
   update private.conversation_recaps r set scrub=(r.scrub||left(old.content,200))[greatest(1,cardinality(r.scrub)-18):]
   where conversation_id in(select id from public.conversations where user_id=old.user_id and character_id=old.character_id);
  end if;
 end if;
 return null;
end;$$;
revoke all on function private.invalidate_memory_context() from public,anon,authenticated;

alter function public.claim_reply(uuid,uuid,text) rename to claim_before_recap;
alter function public.claim_before_recap(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_recap(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;c public.conversations;r private.conversation_recaps;remembered boolean;visible boolean;exchanges integer;
begin
 result:=private.claim_before_recap(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id where m.id=p_message;
 remembered:=not exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and not enabled);
 select * into r from private.conversation_recaps where conversation_id=c.id and generation=c.generation;
 -- A story awaiting a scrub stays hidden until it is rewritten without the deleted fact.
 visible:=remembered and found and cardinality(r.scrub)=0;
 select count(*) into exchanges from private.reply_jobs where conversation_id=c.id and generation=c.generation and state='completed' and origin='reply';
 return result||jsonb_build_object('chatMemory',jsonb_build_object(
  'story',case when visible and r.story<>'' then r.story end,
  'recent',case when visible and r.recent<>'' then r.recent end,
  'topicsCovered',case when visible then to_jsonb(r.topics) else '[]'::jsonb end,
  'questionsYouAlreadyAsked',coalesce((select jsonb_agg(question order by last_sequence desc) from (select question,last_sequence from private.conversation_questions
    where conversation_id=c.id order by last_sequence desc limit 40) q),'[]'::jsonb),
  'questionsAskedTotal',(select count(*) from private.conversation_questions where conversation_id=c.id),
  'exchanges',exchanges));
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;

-- After a completed reply: fold the oldest unsummarised messages (up to 60) into memory once
-- 12 exist, or immediately when a deleted fact must be scrubbed. Long chats catch up chunk by chunk.
create function public.claim_recap(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;cfg private.ai_configuration;r private.conversation_recaps;
 fresh integer;chunk_end bigint;remaining integer;sources jsonb;token uuid:=gen_random_uuid();cost bigint;usage_day date:=(now() at time zone 'UTC')::date;total bigint;personal bigint;
begin
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id
 where m.id=p_message and m.role='user' and c0.user_id=p_actor and c0.deleted_at is null for update of c0;
 if not found or c.status<>'active' then return jsonb_build_object('state','unavailable');end if;
 select * into j from private.reply_jobs where user_message_id=p_message;
 if j.state is distinct from 'completed' or j.generation<>c.generation then return jsonb_build_object('state','unavailable');end if;
 if exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and not enabled)
 or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then return jsonb_build_object('state','unavailable');end if;
 insert into private.conversation_recaps(conversation_id,generation) values(c.id,c.generation) on conflict(conversation_id) do nothing;
 select * into r from private.conversation_recaps where conversation_id=c.id for update;
 if r.lease is not null and r.lease_until>now() then return jsonb_build_object('state','generating');end if;
 select count(*) into fresh from public.messages where conversation_id=c.id and kind='text' and sequence>r.through_sequence;
 if fresh<12 and cardinality(r.scrub)=0 then return jsonb_build_object('state','not_needed');end if;
 select * into cfg from private.ai_configuration where singleton for share;
 if not cfg.enabled or cfg.model is distinct from p_model or cfg.input_micro_usd_per_million<=0 or cfg.output_micro_usd_per_million<=0 then return jsonb_build_object('state','blocked_provider');end if;
 cost:=ceil((cfg.max_input_tokens::numeric*cfg.input_micro_usd_per_million+cfg.max_output_tokens::numeric*cfg.output_micro_usd_per_million)/1000000)::bigint;
 perform pg_catalog.pg_advisory_xact_lock(781046211);
 select amount_micro_usd into total from private.ai_daily_usage where day=usage_day and scope='project';
 select amount_micro_usd into personal from private.ai_daily_usage where day=usage_day and scope=p_actor::text;
 if coalesce(total,0)+cost>cfg.project_daily_micro_usd or coalesce(personal,0)+cost>cfg.user_daily_micro_usd then return jsonb_build_object('state','budget_exhausted');end if;
 insert into private.ai_daily_usage as u(day,scope,amount_micro_usd) values(usage_day,'project',cost),(usage_day,p_actor::text,cost)
 on conflict(day,scope) do update set amount_micro_usd=u.amount_micro_usd+excluded.amount_micro_usd;
 insert into private.summary_reservations(lease,actor_id,amount_micro_usd) values(token,p_actor,cost);
 select coalesce(jsonb_agg(jsonb_build_object('role',role,'text',left(text,600),'sentAt',created_at) order by sequence),'[]'::jsonb),max(sequence) into sources,chunk_end
 from (select role,text,sequence,created_at from public.messages where conversation_id=c.id and kind='text' and sequence>r.through_sequence order by sequence limit 60) m;
 select count(*) into remaining from public.messages where conversation_id=c.id and kind='text' and sequence>coalesce(chunk_end,r.through_sequence);
 update private.conversation_recaps set pending_through=coalesce(chunk_end,r.through_sequence),lease=token,lease_until=now()+interval '90 seconds' where conversation_id=c.id;
 return jsonb_build_object('state','claimed','conversation',c.id,'lease',token,'actor',p_actor,
  'character',(select name from public.characters where id=c.character_id),
  'userName',(select nullif(trim(display_name),'') from public.profiles where id=p_actor),
  'previousStory',r.story,'previousRecent',r.recent,'previousTopics',to_jsonb(r.topics),'removeFacts',to_jsonb(r.scrub),
  'sources',sources,'catchingUp',remaining>=12,
  'maxInputTokens',cfg.max_input_tokens,'maxOutputTokens',cfg.max_output_tokens);
end;$$;

create function public.finish_recap(p_conversation uuid,p_actor uuid,p_lease uuid,p_story text default null,p_recent text default null,p_topics jsonb default null,p_failure text default null) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;r private.conversation_recaps;clean_topics text[];
begin
 select * into c from public.conversations where id=p_conversation and user_id=p_actor for update;
 if not found then return 'discarded';end if;
 select * into r from private.conversation_recaps where conversation_id=c.id for update;
 if not found or r.lease is distinct from p_lease then return 'discarded';end if;
 if r.generation<>c.generation or c.deleted_at is not null or r.lease_until<=now() or p_failure is not null
 or p_story is null or char_length(trim(p_story)) not between 20 and 2400 or char_length(coalesce(p_recent,''))>1000
 or regexp_replace(p_story||' '||coalesce(p_recent,''),'[\s().+-]','','g') ~ '\d{7,}'
 or (p_story||' '||coalesce(p_recent,'')) ~* '(@|https?:|password|\mbvn\M|account number|card number)'
 or jsonb_typeof(p_topics) is distinct from 'array' or jsonb_array_length(p_topics)>40 then
  update private.conversation_recaps set lease=null,lease_until=null,pending_through=null where conversation_id=c.id;
  return case when p_failure is not null then 'failed' else 'discarded' end;
 end if;
 -- Deduplicated case-insensitively, keeping the model's order.
 select coalesce(array_agg(t order by n),'{}') into clean_topics from (
  select t,n from (select distinct on (lower(trim(value))) left(trim(value),40) t,n
   from jsonb_array_elements_text(p_topics) with ordinality e(value,n) where char_length(trim(value)) between 2 and 40
   order by lower(trim(value)),n) d order by n limit 40) x;
 update private.conversation_recaps set story=trim(p_story),recent=trim(coalesce(p_recent,'')),topics=clean_topics,
  through_sequence=coalesce(r.pending_through,r.through_sequence),pending_through=null,scrub='{}',lease=null,lease_until=null,updated_at=now()
 where conversation_id=c.id;
 return 'completed';
end;$$;
revoke all on function public.claim_recap(uuid,uuid,text),public.finish_recap(uuid,uuid,uuid,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_recap(uuid,uuid,text),public.finish_recap(uuid,uuid,uuid,text,text,jsonb,text) to service_role;

commit;
