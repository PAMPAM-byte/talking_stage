begin;
-- Extractive conversation context, never an automatically saved factual memory.
alter table private.ai_configuration add column summaries_enabled boolean not null default false;
alter table public.conversations add column summary_after_sequence bigint not null default 0;
create table private.conversation_summaries (
 conversation_id uuid primary key references public.conversations(id) on delete cascade,
 generation bigint not null, context_revision bigint not null, direction_version integer not null,
 configuration_version integer not null, through_sequence bigint not null default 0,
 excerpts jsonb not null default '[]', state text not null check(state in ('generating','completed','failed')),
 lease uuid not null, lease_until timestamptz, source_ids uuid[] not null,
 source_job uuid references private.reply_jobs(id) on delete cascade, failure_code text
);
create table private.summary_reservations (
 lease uuid primary key, actor_id uuid not null references public.profiles(id),
 amount_micro_usd bigint not null check(amount_micro_usd>0), reserved_at timestamptz not null default now()
);
alter table private.conversation_summaries enable row level security;
alter table private.summary_reservations enable row level security;
revoke all on private.conversation_summaries,private.summary_reservations from public,anon,authenticated,service_role;

-- Advance the source barrier as well as erasing old context. Rebuilding a summary
-- must not reintroduce pre-change facts from older chat or a copied summary.
create function private.invalidate_summary_context() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.context_revision is distinct from old.context_revision or new.generation is distinct from old.generation
 or new.deleted_at is distinct from old.deleted_at then
  new.summary_after_sequence:=case when new.generation<>old.generation then 0 else new.next_sequence-1 end;
  delete from private.conversation_summaries where conversation_id=new.id;
 end if;
 return new;
end;$$;
revoke all on function private.invalidate_summary_context() from public,anon,authenticated,service_role;
-- Runs after the status trigger that advances context_revision.
create trigger zz_summary_context_changed before update on public.conversations for each row execute function private.invalidate_summary_context();

alter function public.claim_reply(uuid,uuid,text) rename to claim_photo_reply;
alter function public.claim_photo_reply(uuid,uuid,text) set schema private;
revoke all on function private.claim_photo_reply(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;c public.conversations;summary jsonb;
begin
 result:=private.claim_photo_reply(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id where m.id=p_message;
 select s.excerpts into summary from private.conversation_summaries s
 where s.conversation_id=c.id and s.state='completed' and s.generation=c.generation and s.context_revision=c.context_revision
 and s.direction_version=(result->'character'->>'version')::integer
 and s.configuration_version=(select version from private.ai_configuration where singleton and summaries_enabled)
 and s.through_sequence<(select sequence from public.messages where id=p_message)
 and exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and enabled);
 return result||jsonb_build_object('summary',coalesce(summary,'[]'::jsonb));
end;$$;

create function public.claim_summary(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;s private.conversation_summaries;cfg private.ai_configuration;d private.character_direction;
 cutoff bigint;sources jsonb;token uuid;cost bigint;usage_day date:=(now() at time zone 'UTC')::date;total bigint;personal bigint;
begin
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id
 where m.id=p_message and m.role='user' and c0.user_id=p_actor and c0.deleted_at is null for update of c0;
 if not found then return jsonb_build_object('state','unavailable');end if;
 select * into j from private.reply_jobs where user_message_id=p_message;
 if j.state is distinct from 'completed' or c.status<>'active' or j.generation<>c.generation or j.context_revision<>c.context_revision
 or not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null)
 or not exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and enabled)
 or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then return jsonb_build_object('state','unavailable');end if;
 select * into cfg from private.ai_configuration where singleton for share;
 if not cfg.enabled or not cfg.summaries_enabled or cfg.model='' or cfg.model is distinct from p_model
 or cfg.version<>j.configuration_version or cfg.input_micro_usd_per_million<=0 or cfg.output_micro_usd_per_million<=0
 or cfg.project_daily_micro_usd<=0 or cfg.user_daily_micro_usd<=0 then return jsonb_build_object('state','blocked_provider');end if;
 select * into d from private.character_direction where character_id=c.character_id for share;
 if not found or d.version<>j.direction_version then return jsonb_build_object('state','unavailable');end if;
 select * into s from private.conversation_summaries where conversation_id=c.id;
 if s.source_job=j.id then return jsonb_build_object('state',s.state);end if;
 if s.state='generating' and s.lease_until>now() then return jsonb_build_object('state','generating');end if;
 -- Leave the latest twenty text messages to the normal reply history window.
 select sequence into cutoff from public.messages where conversation_id=c.id and kind='text'
 and sequence<=(select sequence from public.messages where id=j.output_message_id) order by sequence desc offset 20 limit 1;
 if cutoff is null or cutoff<=c.summary_after_sequence then return jsonb_build_object('state','not_needed');end if;
 if s.state='completed' and s.generation=c.generation and s.context_revision=c.context_revision
 and s.direction_version=d.version and s.configuration_version=cfg.version and cutoff<=s.through_sequence then return jsonb_build_object('state','not_needed');end if;
 select coalesce(jsonb_agg(to_jsonb(m) order by m.sequence),'[]'::jsonb) into sources from
 (select id,sequence,role,text from public.messages where conversation_id=c.id and kind='text'
 and sequence>c.summary_after_sequence and sequence<=cutoff
 and (sequence>case when s.state='completed' and s.generation=c.generation and s.context_revision=c.context_revision and s.direction_version=d.version and s.configuration_version=cfg.version then s.through_sequence else 0 end
 or id in(select (e->>'messageId')::uuid from jsonb_array_elements(case when s.state='completed' and s.generation=c.generation and s.context_revision=c.context_revision and s.direction_version=d.version and s.configuration_version=cfg.version then s.excerpts else '[]'::jsonb end) e))
 order by sequence desc limit 40) m;
 if jsonb_array_length(sources)=0 then return jsonb_build_object('state','not_needed');end if;
 -- Independent reservation, shared atomic daily counters, never a second call
 -- hidden inside the reply's reservation. No automatic retry of this job.
 cost:=ceil((cfg.max_input_tokens::numeric*cfg.input_micro_usd_per_million+cfg.max_output_tokens::numeric*cfg.output_micro_usd_per_million)/1000000)::bigint;
 perform pg_catalog.pg_advisory_xact_lock(781046211);
 select amount_micro_usd into total from private.ai_daily_usage where day=usage_day and scope='project';
 select amount_micro_usd into personal from private.ai_daily_usage where day=usage_day and scope=p_actor::text;
 if coalesce(total,0)+cost>cfg.project_daily_micro_usd or coalesce(personal,0)+cost>cfg.user_daily_micro_usd then return jsonb_build_object('state','budget_exhausted');end if;
 token:=gen_random_uuid();
 insert into private.ai_daily_usage as u(day,scope,amount_micro_usd) values(usage_day,'project',cost),(usage_day,p_actor::text,cost)
 on conflict(day,scope) do update set amount_micro_usd=u.amount_micro_usd+excluded.amount_micro_usd;
 insert into private.summary_reservations(lease,actor_id,amount_micro_usd) values(token,p_actor,cost);
 insert into private.conversation_summaries(conversation_id,generation,context_revision,direction_version,configuration_version,through_sequence,excerpts,state,lease,lease_until,source_ids,source_job)
 values(c.id,c.generation,c.context_revision,d.version,cfg.version,cutoff,'[]','generating',token,now()+interval '45 seconds',array(select (e->>'id')::uuid from jsonb_array_elements(sources) e),j.id)
 on conflict(conversation_id) do update set generation=excluded.generation,context_revision=excluded.context_revision,direction_version=excluded.direction_version,configuration_version=excluded.configuration_version,
 through_sequence=excluded.through_sequence,excerpts='[]',state='generating',lease=excluded.lease,lease_until=excluded.lease_until,source_ids=excluded.source_ids,source_job=excluded.source_job,failure_code=null;
 return jsonb_build_object('state','claimed','conversation',c.id,'lease',token,'sources',sources,'maxInputTokens',cfg.max_input_tokens,'maxOutputTokens',cfg.max_output_tokens);
end;$$;

create function public.finish_summary(p_conversation uuid,p_actor uuid,p_lease uuid,p_excerpts jsonb default null,p_failure text default null) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;s private.conversation_summaries;e jsonb;valid boolean:=true;
begin
 select * into c from public.conversations where id=p_conversation and user_id=p_actor for update;
 if not found then return 'discarded';end if;
 select * into s from private.conversation_summaries where conversation_id=c.id for update;
 if not found or s.lease is distinct from p_lease then return 'discarded';end if;
 if s.state='completed' then return 'completed';end if;
 if s.state<>'generating' then return 'discarded';end if;
 perform 1 from private.capability_controls where scope='global' or character_id=c.character_id for share;
 perform 1 from public.characters where id=c.character_id for share;
 perform 1 from public.character_assets where character_id=c.character_id for share;
 perform 1 from private.character_direction where character_id=c.character_id for share;
 perform 1 from private.ai_configuration where singleton for share;
 if s.lease_until<=now() or c.deleted_at is not null or c.status<>'active' or s.generation<>c.generation or s.context_revision<>c.context_revision
 or not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null)
 or not exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and enabled)
 or not exists(select 1 from private.character_direction where character_id=c.character_id and version=s.direction_version)
 or not exists(select 1 from private.ai_configuration where singleton and enabled and summaries_enabled and version=s.configuration_version)
 or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then
 delete from private.conversation_summaries where conversation_id=c.id;return 'discarded';end if;
 if p_failure is not null then
 update private.conversation_summaries set state='failed',lease_until=null,failure_code=case when p_failure in ('timeout','provider_error','invalid_output','context_limit') then p_failure else 'provider_error' end where conversation_id=c.id;return 'failed';end if;
 if p_excerpts is null or jsonb_typeof(p_excerpts)<>'array' then valid:=false;
 elsif jsonb_array_length(p_excerpts)>8 or (select count(distinct item->>'messageId') from jsonb_array_elements(p_excerpts) item)<>jsonb_array_length(p_excerpts) then valid:=false;
 else
  for e in select value from jsonb_array_elements(p_excerpts) loop
   if jsonb_typeof(e)<>'object' then valid:=false;exit;end if;
   if (select count(*) from jsonb_object_keys(e))<>2 or jsonb_typeof(e->'messageId') is distinct from 'string' or jsonb_typeof(e->'text') is distinct from 'string'
   or char_length(e->>'text') not between 1 and 240 then valid:=false;exit;end if;
   if not exists(select 1 from public.messages where conversation_id=c.id and id::text=e->>'messageId' and id=any(s.source_ids)
    and kind='text' and sequence>c.summary_after_sequence and sequence<=s.through_sequence and position(e->>'text' in text)>0) then valid:=false;exit;end if;
  end loop;
 end if;
 if not valid then update private.conversation_summaries set state='failed',lease_until=null,failure_code='invalid_output' where conversation_id=c.id;return 'failed';end if;
 -- Role/sequence come from the source, never from model-authored identity.
 update private.conversation_summaries set excerpts=coalesce((select jsonb_agg(jsonb_build_object('messageId',m.id,'role',m.role,'text',item->>'text') order by m.sequence)
 from jsonb_array_elements(p_excerpts) item join public.messages m on m.id::text=item->>'messageId'),'[]'::jsonb),state='completed',lease_until=null,failure_code=null where conversation_id=c.id;
 return 'completed';
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text),public.claim_summary(uuid,uuid,text),public.finish_summary(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text),public.claim_summary(uuid,uuid,text),public.finish_summary(uuid,uuid,uuid,jsonb,text) to service_role;
commit;
