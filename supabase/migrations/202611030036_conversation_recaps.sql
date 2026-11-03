begin;

-- Founder request, 3 November 2026: per user, per character chat memory with real continuity.
-- 1. A running recap per conversation, rewritten by the model every 12 new messages from the
--    previous recap plus the new messages. It survives payments, requests and status changes;
--    it is cleared by a reset, deletion, deleting a memory fact or turning memory off.
-- 2. Questions the character already asked, read straight from the whole chat (no model call),
--    so a long chat never circles back to the same questions.
-- Both reach every reply through claim_reply. This replaces the excerpt summary in replies.

create table private.conversation_recaps (
 conversation_id uuid primary key references public.conversations(id) on delete cascade,
 generation bigint not null,
 recap text not null default '' check(char_length(recap)<=1200),
 topics text[] not null default '{}' check(cardinality(topics)<=12),
 through_sequence bigint not null default 0,
 pending_through bigint,
 lease uuid, lease_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table private.conversation_recaps enable row level security;
revoke all on private.conversation_recaps from public,anon,authenticated,service_role;

-- Reset and deletion start a fresh memory.
create function private.clear_conversation_recap() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.generation is distinct from old.generation or new.deleted_at is distinct from old.deleted_at then
  delete from private.conversation_recaps where conversation_id=new.id;
 end if;
 return null;
end;$$;
revoke all on function private.clear_conversation_recap() from public,anon,authenticated,service_role;
create trigger clear_conversation_recap after update on public.conversations for each row execute function private.clear_conversation_recap();

-- Deleting or editing a memory fact, or turning memory off, also drops the recap that may repeat it.
create or replace function private.invalidate_memory_context() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('talkingstage.memory_note',true)='on' then return null;end if;
 update public.conversations set context_revision=context_revision+1
 where user_id=coalesce(new.user_id,old.user_id) and character_id=coalesce(new.character_id,old.character_id);
 delete from private.conversation_recaps where conversation_id in(select id from public.conversations
  where user_id=coalesce(new.user_id,old.user_id) and character_id=coalesce(new.character_id,old.character_id));
 return null;
end;$$;
revoke all on function private.invalidate_memory_context() from public,anon,authenticated;

-- Short questions the character asked anywhere in this chat, newest first.
create function private.character_questions(p_conversation uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(q order by last desc),'[]'::jsonb) from (
  select min(q) q,max(seq) last from (
   select trim(found[1]) q,msg.sequence seq
   from (select text,sequence from public.messages where conversation_id=p_conversation and role='character' and kind='text'
         order by sequence desc limit 400) msg,
   regexp_matches(msg.text,'([^.!?\n]{6,140}\?)','g') found
  ) x where char_length(q) between 8 and 140 group by lower(q) order by max(seq) desc limit 25
 ) y;
$$;
revoke all on function private.character_questions(uuid) from public,anon,authenticated,service_role;

alter function public.claim_reply(uuid,uuid,text) rename to claim_before_recap;
alter function public.claim_before_recap(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_recap(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;c public.conversations;r private.conversation_recaps;remembered boolean;exchanges integer;
begin
 result:=private.claim_before_recap(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id where m.id=p_message;
 remembered:=not exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and not enabled);
 select * into r from private.conversation_recaps where conversation_id=c.id and generation=c.generation;
 select count(*) into exchanges from private.reply_jobs where conversation_id=c.id and generation=c.generation and state='completed' and origin='reply';
 return result||jsonb_build_object('chatMemory',jsonb_build_object(
  'recap',case when remembered and r.recap<>'' then r.recap end,
  'topicsCovered',case when remembered then to_jsonb(coalesce(r.topics,'{}'::text[])) else '[]'::jsonb end,
  'questionsYouAlreadyAsked',private.character_questions(c.id),
  'exchanges',exchanges));
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;

-- After a completed reply: rewrite the recap once 12 new messages exist beyond it.
create function public.claim_recap(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;cfg private.ai_configuration;r private.conversation_recaps;
 newest bigint;fresh integer;sources jsonb;token uuid:=gen_random_uuid();cost bigint;usage_day date:=(now() at time zone 'UTC')::date;total bigint;personal bigint;
begin
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id
 where m.id=p_message and m.role='user' and c0.user_id=p_actor and c0.deleted_at is null for update of c0;
 if not found or c.status<>'active' then return jsonb_build_object('state','unavailable');end if;
 select * into j from private.reply_jobs where user_message_id=p_message;
 if j.state is distinct from 'completed' or j.generation<>c.generation then return jsonb_build_object('state','unavailable');end if;
 if exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and not enabled)
 or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then return jsonb_build_object('state','unavailable');end if;
 select * into r from private.conversation_recaps where conversation_id=c.id for update;
 if found and r.generation<>c.generation then delete from private.conversation_recaps where conversation_id=c.id;r:=null;end if;
 if r.lease is not null and r.lease_until>now() then return jsonb_build_object('state','generating');end if;
 select max(sequence),count(*) filter(where sequence>coalesce(r.through_sequence,0)) into newest,fresh
 from public.messages where conversation_id=c.id and kind='text';
 if coalesce(fresh,0)<12 then return jsonb_build_object('state','not_needed');end if;
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
 select coalesce(jsonb_agg(jsonb_build_object('role',role,'text',left(text,600)) order by sequence),'[]'::jsonb) into sources
 from (select role,text,sequence from public.messages where conversation_id=c.id and kind='text' and sequence>coalesce(r.through_sequence,0) and sequence<=newest
       order by sequence desc limit 40) m;
 insert into private.conversation_recaps(conversation_id,generation,pending_through,lease,lease_until)
 values(c.id,c.generation,newest,token,now()+interval '60 seconds')
 on conflict(conversation_id) do update set pending_through=excluded.pending_through,lease=excluded.lease,lease_until=excluded.lease_until;
 return jsonb_build_object('state','claimed','conversation',c.id,'lease',token,'actor',p_actor,
  'character',(select name from public.characters where id=c.character_id),
  'userName',(select nullif(trim(display_name),'') from public.profiles where id=p_actor),
  'previousRecap',coalesce(r.recap,''),'previousTopics',to_jsonb(coalesce(r.topics,'{}'::text[])),'sources',sources,
  'maxInputTokens',cfg.max_input_tokens,'maxOutputTokens',cfg.max_output_tokens);
end;$$;

create function public.finish_recap(p_conversation uuid,p_actor uuid,p_lease uuid,p_recap text default null,p_topics jsonb default null,p_failure text default null) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;r private.conversation_recaps;clean_topics text[];
begin
 select * into c from public.conversations where id=p_conversation and user_id=p_actor for update;
 if not found then return 'discarded';end if;
 select * into r from private.conversation_recaps where conversation_id=c.id for update;
 if not found or r.lease is distinct from p_lease then return 'discarded';end if;
 if r.generation<>c.generation or c.deleted_at is not null or r.lease_until<=now() or p_failure is not null
 or p_recap is null or char_length(trim(p_recap)) not between 20 and 1200
 or regexp_replace(p_recap,'[\s().+-]','','g') ~ '\d{7,}' or p_recap ~* '(@|https?:|password|\mbvn\M|account number|card number)'
 or jsonb_typeof(p_topics) is distinct from 'array' or jsonb_array_length(p_topics)>12 then
  update private.conversation_recaps set lease=null,lease_until=null,pending_through=null where conversation_id=c.id;
  return case when p_failure is not null then 'failed' else 'discarded' end;
 end if;
 select coalesce(array_agg(left(trim(value),40)),'{}') into clean_topics from jsonb_array_elements_text(p_topics) where char_length(trim(value)) between 2 and 40;
 update private.conversation_recaps set recap=trim(p_recap),topics=clean_topics,through_sequence=r.pending_through,pending_through=null,lease=null,lease_until=null,updated_at=now()
 where conversation_id=c.id;
 return 'completed';
end;$$;
revoke all on function public.claim_recap(uuid,uuid,text),public.finish_recap(uuid,uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_recap(uuid,uuid,text),public.finish_recap(uuid,uuid,uuid,text,jsonb,text) to service_role;

commit;
