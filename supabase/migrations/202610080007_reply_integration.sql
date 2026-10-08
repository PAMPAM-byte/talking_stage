begin;
-- Shared permission calculation; ordinary callers still require adult Auth access.
create function private.compute_capabilities(p_character uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare g private.capability_controls;c private.capability_controls;available boolean;
begin
 select * into g from private.capability_controls where scope='global';
 select * into c from private.capability_controls where character_id=p_character;
 select exists(select 1 from public.characters where id=p_character and status='published' and public.cast_has_eligible_assets(id)) into available;
 return jsonb_build_object('chat',available and g.chat and coalesce(c.chat,true),'photos',available and g.photos and coalesce(c.photos,true),'payments',available and g.payments and coalesce(c.payments,true));
end;$$;
revoke all on function private.compute_capabilities(uuid) from public,anon,authenticated;
create or replace function public.effective_capabilities(p_character uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 return private.compute_capabilities(p_character);
end;$$;
alter table public.conversations add column context_revision bigint not null default 1;
alter table private.reply_jobs add column lease uuid;
alter table private.reply_jobs add column lease_until timestamptz;
alter table private.reply_jobs add column attempts integer not null default 0;
alter table private.reply_jobs add column context_revision bigint;
alter table private.reply_jobs add column direction_version integer;
alter table private.reply_jobs add column configuration_version integer;
alter table private.reply_jobs add column output_message_id uuid references public.messages(id) on delete set null;
alter table private.reply_jobs add column failure_code text;
-- Defaults authorize no spend. Only an operator may configure these private rows.
create table private.ai_configuration (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 model text not null default '', version integer not null default 1,
 project_daily_micro_usd bigint not null default 0 check(project_daily_micro_usd>=0),
 user_daily_micro_usd bigint not null default 0 check(user_daily_micro_usd>=0),
 input_micro_usd_per_million bigint not null default 0 check(input_micro_usd_per_million>=0),
 output_micro_usd_per_million bigint not null default 0 check(output_micro_usd_per_million>=0),
 max_input_tokens integer not null default 48000 check(max_input_tokens between 1024 and 48000),
 max_output_tokens integer not null default 1024 check(max_output_tokens between 128 and 2048)
);
insert into private.ai_configuration(singleton) values(true);
create table private.ai_reservations (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references private.reply_jobs(id) on delete cascade,
 actor_id uuid not null references public.profiles(id), lease uuid not null unique,
 amount_micro_usd bigint not null check(amount_micro_usd>0), reserved_at timestamptz not null default now()
);
-- Daily totals outlive message deletion; contain no prompt/reply text.
create table private.ai_daily_usage (
 day date not null, scope text not null, amount_micro_usd bigint not null default 0,
 primary key(day,scope)
);
do $$declare t text;begin
 foreach t in array array['ai_configuration','ai_reservations','ai_daily_usage'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;
end;$$;
create function private.invalidate_memory_context() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.conversations set context_revision=context_revision+1
 where user_id=coalesce(new.user_id,old.user_id) and character_id=coalesce(new.character_id,old.character_id);
 return null;
end;$$;
revoke all on function private.invalidate_memory_context() from public,anon,authenticated;
create trigger memory_context_changed after insert or update or delete on public.memories for each row execute function private.invalidate_memory_context();
create trigger memory_permission_changed after insert or update or delete on public.memory_preferences for each row execute function private.invalidate_memory_context();
create function public.manage_memory(p_character uuid,p_operation text,p_content text default null,p_memory uuid default null,p_consent boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_character::text,0));
 if not exists(select 1 from public.conversations where user_id=auth.uid() and character_id=p_character and deleted_at is null)
 and not exists(select 1 from public.memories where user_id=auth.uid() and character_id=p_character and deleted_at is null) then raise exception 'not_found';end if;
 perform private.limit_conversation_mutation();
 if p_operation in ('enable','disable') then
  insert into public.memory_preferences(user_id,character_id,enabled) values(auth.uid(),p_character,p_operation='enable')
  on conflict(user_id,character_id) do update set enabled=excluded.enabled,updated_at=now();
 elsif p_operation='save' then
  if p_consent is distinct from true then raise exception 'consent_required';end if;
  if p_content is null or char_length(trim(p_content)) not between 1 and 500 then raise exception 'invalid_memory';end if;
  if not exists(select 1 from public.memory_preferences where user_id=auth.uid() and character_id=p_character and enabled) then raise exception 'memory_disabled';end if;
  if (select count(*) from public.memories where user_id=auth.uid() and character_id=p_character and deleted_at is null)>=50 then raise exception 'memory_limit';end if;
  insert into public.memories(user_id,character_id,content,consent) values(auth.uid(),p_character,trim(p_content),'explicit');
 elsif p_operation='delete' then
  update public.memories set deleted_at=now() where id=p_memory and user_id=auth.uid() and character_id=p_character and deleted_at is null;
  if not found then raise exception 'not_found';end if;
 else raise exception 'invalid_operation';end if;
end;$$;
revoke all on function public.manage_memory(uuid,text,text,uuid,boolean) from public,anon;
grant execute on function public.manage_memory(uuid,text,text,uuid,boolean) to authenticated;
-- Never callable with an ordinary user's JWT. p_actor comes from verified Auth in the server action.
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;cfg private.ai_configuration;d private.character_direction;
 token uuid;cost bigint;usage_day date:=(now() at time zone 'UTC')::date;total bigint;personal bigint;
begin
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id
 where m.id=p_message and m.role='user' and c0.user_id=p_actor and c0.deleted_at is null for update of c0;
 if not found then return jsonb_build_object('state','unavailable');end if;
 select * into j from private.reply_jobs where user_message_id=p_message for update;
 if not found then return jsonb_build_object('state','unavailable');end if;
 if j.state='completed' then return jsonb_build_object('state','completed');end if;
 if j.generation<>c.generation or c.status<>'active' or not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null)
 or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then return jsonb_build_object('state','unavailable');end if;
 if j.state='cancelled' then return jsonb_build_object('state','cancelled');end if;
 if j.state='generating' and j.lease_until>now() then return jsonb_build_object('state','generating');end if;
 if exists(select 1 from private.reply_jobs older join public.messages m on m.id=older.user_message_id
 where older.conversation_id=c.id and older.state not in ('completed','cancelled') and m.sequence<(select sequence from public.messages where id=p_message)) then return jsonb_build_object('state','earlier_reply_pending');end if;
 if j.attempts>=3 then return jsonb_build_object('state','attempt_limit');end if;
 select * into cfg from private.ai_configuration where singleton for share;
 if not cfg.enabled or cfg.model='' or cfg.model is distinct from p_model or cfg.input_micro_usd_per_million<=0 or cfg.output_micro_usd_per_million<=0
 or cfg.project_daily_micro_usd<=0 or cfg.user_daily_micro_usd<=0 then return jsonb_build_object('state','blocked_provider');end if;
 select * into d from private.character_direction where character_id=c.character_id;
 if not found then return jsonb_build_object('state','unavailable');end if;
 cost:=ceil((cfg.max_input_tokens::numeric*cfg.input_micro_usd_per_million+cfg.max_output_tokens::numeric*cfg.output_micro_usd_per_million)/1000000)::bigint;
 perform pg_catalog.pg_advisory_xact_lock(781046211);
 select coalesce(amount_micro_usd,0) into total from private.ai_daily_usage where day=usage_day and scope='project';
 select coalesce(amount_micro_usd,0) into personal from private.ai_daily_usage where day=usage_day and scope=p_actor::text;
 if coalesce(total,0)+cost>cfg.project_daily_micro_usd or coalesce(personal,0)+cost>cfg.user_daily_micro_usd then return jsonb_build_object('state','budget_exhausted');end if;
 token:=gen_random_uuid();
 insert into private.ai_daily_usage as u(day,scope,amount_micro_usd) values(usage_day,'project',cost),(usage_day,p_actor::text,cost)
 on conflict(day,scope) do update set amount_micro_usd=u.amount_micro_usd+excluded.amount_micro_usd;
 insert into private.ai_reservations(job_id,actor_id,lease,amount_micro_usd) values(j.id,p_actor,token,cost);
 update private.reply_jobs set state='generating',lease=token,lease_until=now()+interval '45 seconds',attempts=attempts+1,
 context_revision=c.context_revision,direction_version=d.version,configuration_version=cfg.version,failure_code=null where id=j.id;
 return jsonb_build_object('state','claimed','job',j.id,'lease',token,'maxInputTokens',cfg.max_input_tokens,'maxOutputTokens',cfg.max_output_tokens,
 'character',jsonb_build_object('name',(select name from public.characters where id=c.character_id),'direction',d.direction,'version',d.version),
 'preferences',jsonb_build_object('language',(select language from public.profiles where id=p_actor),'relationship',c.relationship_stage),
 'memories',coalesce((select jsonb_agg(content order by saved_at,id) from public.memories where user_id=p_actor and character_id=c.character_id and deleted_at is null
 and exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and enabled)),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(to_jsonb(h) order by case when h.id=p_message then 1 else 0 end,sequence) from (select id,sequence,role,text from public.messages
 where conversation_id=c.id and kind='text' and (sequence<=(select sequence from public.messages where id=p_message)
 or id in(select r.output_message_id from private.reply_jobs r join public.messages u on u.id=r.user_message_id where r.conversation_id=c.id and u.sequence<=(select sequence from public.messages where id=p_message))) order by sequence desc limit 20) h),'[]'::jsonb));
end;$$;
create function public.finish_reply(p_job uuid,p_actor uuid,p_lease uuid,p_text text default null,p_failure text default null) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;out_id uuid;
begin
 select c0.* into c from public.conversations c0 join private.reply_jobs j0 on j0.conversation_id=c0.id where j0.id=p_job and c0.user_id=p_actor for update of c0;
 if not found then return 'discarded';end if;
 select * into j from private.reply_jobs where id=p_job for update;
 if j.state='completed' and j.lease=p_lease then return 'completed';end if;
 if j.state<>'generating' or j.lease is distinct from p_lease then return 'discarded';end if;
 -- Serialize final eligibility with operator changes, before accepting output.
 perform 1 from private.capability_controls where scope='global' or character_id=c.character_id for share;
 perform 1 from public.characters where id=c.character_id for share;
 perform 1 from public.character_assets where character_id=c.character_id for share;
 perform 1 from private.character_direction where character_id=c.character_id for share;
 perform 1 from private.ai_configuration where singleton for share;
 if j.lease_until<=now() or c.deleted_at is not null or c.status<>'active' or j.generation<>c.generation
 or j.context_revision<>c.context_revision
 or not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null)
 or not exists(select 1 from private.character_direction where character_id=c.character_id and version=j.direction_version)
 or not exists(select 1 from private.ai_configuration where singleton and enabled and version=j.configuration_version)
 or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then
 update private.reply_jobs set state='failed',failure_code='context_changed',lease_until=null where id=j.id;return 'discarded';end if;
 if p_failure is not null then
 update private.reply_jobs set state='failed',failure_code=case when p_failure in ('timeout','provider_error','invalid_output','context_limit') then p_failure else 'provider_error' end,lease_until=null where id=j.id;return 'failed';end if;
 if p_text is null or char_length(trim(p_text)) not between 1 and 2000 then raise exception 'invalid_output';end if;
 insert into public.messages(conversation_id,sequence,role,kind,text) values(c.id,c.next_sequence,'character','text',trim(p_text)) returning id into out_id;
 update public.conversations set next_sequence=next_sequence+1,last_message_preview=left(trim(p_text),140),last_message_at=now(),updated_at=now(),version=version+1 where id=c.id;
 update private.reply_jobs set state='completed',output_message_id=out_id,lease_until=null where id=j.id;
 return 'completed';
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text),public.finish_reply(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text),public.finish_reply(uuid,uuid,uuid,text,text) to service_role;
-- Client-visible status has no private context or provider diagnostics.
create function public.reply_status(p_conversation uuid,p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_adult_access() or not exists(select 1 from public.conversations where id=p_conversation and user_id=auth.uid() and deleted_at is null) then raise exception 'not_found';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('messageId',j.user_message_id,'state',case when j.state='generating' and j.lease_until<=now() then 'failed' else j.state end,'attempts',j.attempts))
 from private.reply_jobs j join public.messages m on m.id=j.user_message_id where j.conversation_id=p_conversation
 and m.id in(select id from public.messages where conversation_id=p_conversation and (p_before is null or sequence<p_before) order by sequence desc limit 40)),'[]'::jsonb);
end;$$;
revoke all on function public.reply_status(uuid,bigint) from public,anon;
grant execute on function public.reply_status(uuid,bigint) to authenticated;
create function public.cancel_reply(p_message uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.conversations;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id where m.id=p_message and c0.user_id=auth.uid() and c0.deleted_at is null for update of c0;
 if not found then raise exception 'not_found';end if;
 perform private.limit_conversation_mutation();
 update private.reply_jobs set state='cancelled',lease_until=null where user_message_id=p_message and state not in ('completed','cancelled');
end;$$;
revoke all on function public.cancel_reply(uuid) from public,anon;
grant execute on function public.cancel_reply(uuid) to authenticated;
create function public.reply_availability(p_model text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.has_adult_access() and exists(select 1 from private.ai_configuration where singleton and enabled and model<>'' and model=p_model and project_daily_micro_usd>0 and user_daily_micro_usd>0 and input_micro_usd_per_million>0 and output_micro_usd_per_million>0);
$$;
revoke all on function public.reply_availability(text) from public,anon;
grant execute on function public.reply_availability(text) to authenticated;
create function public.memory_characters() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 return coalesce((select jsonb_agg(to_jsonb(ch) order by name,id) from(select id,name from public.characters where id in
 (select character_id from public.conversations where user_id=auth.uid() and deleted_at is null union select character_id from public.memories where user_id=auth.uid() and deleted_at is null)) ch),'[]'::jsonb);
end;$$;
revoke all on function public.memory_characters() from public,anon;
grant execute on function public.memory_characters() to authenticated;
create function private.invalidate_profile_context() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.conversations set context_revision=context_revision+1 where user_id=new.id;
 return null;
end;$$;
revoke all on function private.invalidate_profile_context() from public,anon,authenticated;
create trigger profile_context_changed after update on public.profiles for each row execute function private.invalidate_profile_context();
create function private.version_ai_configuration() returns trigger
language plpgsql set search_path='' as $$begin new.version:=old.version+1;return new;end;$$;
revoke all on function private.version_ai_configuration() from public,anon,authenticated;
create trigger ai_configuration_changed before update on private.ai_configuration for each row execute function private.version_ai_configuration();
create function private.invalidate_archived_context() returns trigger
language plpgsql set search_path='' as $$begin if new.status is distinct from old.status then new.context_revision:=old.context_revision+1;end if;return new;end;$$;
revoke all on function private.invalidate_archived_context() from public,anon,authenticated;
create trigger conversation_status_changed before update on public.conversations for each row execute function private.invalidate_archived_context();
commit;
