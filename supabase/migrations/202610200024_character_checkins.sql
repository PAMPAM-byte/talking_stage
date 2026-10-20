begin;
create table private.checkin_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 frequency text not null default 'off' check(frequency in ('off','daily','twice_weekly','on_return')),
 timezone text not null default 'Africa/Lagos',version integer not null default 1,
 last_attempt_at timestamptz,last_checked_at timestamptz
);
alter table private.checkin_preferences enable row level security;
revoke all on private.checkin_preferences from public,anon,authenticated,service_role;
alter table private.reply_jobs alter column user_message_id drop not null;
alter table private.reply_jobs add column origin text not null default 'reply' check(origin in ('reply','checkin'));
alter table private.reply_jobs add column anchor_message_id uuid references public.messages(id) on delete cascade;
alter table private.reply_jobs add column checkin_sequence bigint;
alter table private.reply_jobs add column checkin_preference_version integer;
create unique index one_checkin_per_user_turn on private.reply_jobs(conversation_id,generation,anchor_message_id) where origin='checkin';
create function public.checkin_settings() returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 return coalesce((select jsonb_build_object('frequency',frequency,'timezone',timezone) from private.checkin_preferences where user_id=auth.uid()),jsonb_build_object('frequency','off'));
end;$$;
create function public.set_checkin_preference(p_frequency text,p_timezone text) returns void
language plpgsql security definer set search_path='' as $$begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 if p_frequency is null or p_frequency not in ('off','daily','twice_weekly','on_return') or char_length(p_timezone)>80 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'invalid_preference';end if;
 perform private.limit_conversation_mutation();
 insert into private.checkin_preferences(user_id,frequency,timezone) values(auth.uid(),p_frequency,p_timezone)
 on conflict(user_id) do update set frequency=excluded.frequency,timezone=excluded.timezone,version=private.checkin_preferences.version+1;
 update private.reply_jobs j set state='cancelled',lease_until=null from public.conversations c where c.id=j.conversation_id and c.user_id=auth.uid() and j.origin='checkin' and j.state not in ('completed','cancelled');
end;$$;
revoke all on function public.checkin_settings(),public.set_checkin_preference(text,text) from public,anon;
grant execute on function public.checkin_settings(),public.set_checkin_preference(text,text) to authenticated;

create function public.claim_character_checkin(p_actor uuid,p_model text,p_on_return boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pref private.checkin_preferences;c public.conversations;cfg private.ai_configuration;d private.character_direction;anchor public.messages;
 token uuid:=gen_random_uuid();job uuid;cost bigint;usage_day date:=(now() at time zone 'UTC')::date;total bigint;personal bigint;history jsonb;
begin
 select * into pref from private.checkin_preferences where user_id=p_actor for update;
 if not found or pref.frequency='off' or (pref.frequency='on_return' and not p_on_return) then return jsonb_build_object('state','disabled');end if;
 update private.checkin_preferences set last_checked_at=now() where user_id=p_actor;
 if not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null) then return jsonb_build_object('state','unavailable');end if;
 if extract(hour from now() at time zone pref.timezone) not between 9 and 20 then return jsonb_build_object('state','quiet_hours');end if;
 if pref.last_attempt_at>now()-(case when pref.frequency='twice_weekly' then interval '84 hours' else interval '24 hours' end) then return jsonb_build_object('state','cooldown');end if;
 select c0.* into c from public.conversations c0
 where c0.user_id=p_actor and c0.deleted_at is null and c0.status='active'
 and private.compute_capabilities(c0.character_id)->>'chat'='true'
 and c0.last_message_at<now()-interval '12 hours'
 and (select count(*) from public.messages where conversation_id=c0.id and role='user' and kind='text')>=4
 and (select count(*) from public.messages where conversation_id=c0.id and role='character' and kind='text')>=4
 and (select role from public.messages where conversation_id=c0.id order by sequence desc limit 1)='character'
 and not exists(select 1 from private.reply_jobs where conversation_id=c0.id and state not in ('completed','cancelled') and (origin='reply' or (state='generating' and lease_until>now())))
 and not exists(select 1 from private.reply_jobs j where j.conversation_id=c0.id and j.origin='checkin' and j.anchor_message_id=(select id from public.messages where conversation_id=c0.id and role='user' order by sequence desc limit 1))
 order by c0.last_message_at desc,c0.id limit 1 for update of c0 skip locked;
 if not found then return jsonb_build_object('state','not_due');end if;
 select * into anchor from public.messages where conversation_id=c.id and role='user' order by sequence desc limit 1;
 if anchor.text ~* '(leave me alone|stop (messaging|texting)|do not (message|text)|don.t (message|text) me)' then return jsonb_build_object('state','not_due');end if;
 select * into cfg from private.ai_configuration where singleton for share;
 if not cfg.enabled or cfg.model is distinct from p_model or cfg.input_micro_usd_per_million<=0 or cfg.output_micro_usd_per_million<=0 then return jsonb_build_object('state','blocked_provider');end if;
 select * into d from private.character_direction where character_id=c.character_id;
 if not found then return jsonb_build_object('state','unavailable');end if;
 cost:=ceil((cfg.max_input_tokens::numeric*cfg.input_micro_usd_per_million+cfg.max_output_tokens::numeric*cfg.output_micro_usd_per_million)/1000000)::bigint;
 perform pg_catalog.pg_advisory_xact_lock(781046211);
 select coalesce(amount_micro_usd,0) into total from private.ai_daily_usage where day=usage_day and scope='project';
 select coalesce(amount_micro_usd,0) into personal from private.ai_daily_usage where day=usage_day and scope=p_actor::text;
 if coalesce(total,0)+cost>cfg.project_daily_micro_usd or coalesce(personal,0)+cost>cfg.user_daily_micro_usd then return jsonb_build_object('state','budget_exhausted');end if;
 insert into private.reply_jobs(conversation_id,generation,origin,anchor_message_id,checkin_sequence,checkin_preference_version,state,lease,lease_until,attempts,context_revision,direction_version,configuration_version)
 values(c.id,c.generation,'checkin',anchor.id,c.next_sequence,pref.version,'generating',token,now()+interval '45 seconds',1,c.context_revision,d.version,cfg.version) returning id into job;
 insert into private.ai_daily_usage as u(day,scope,amount_micro_usd) values(usage_day,'project',cost),(usage_day,p_actor::text,cost) on conflict(day,scope) do update set amount_micro_usd=u.amount_micro_usd+excluded.amount_micro_usd;
 insert into private.ai_reservations(job_id,actor_id,lease,amount_micro_usd) values(job,p_actor,token,cost);
 update private.checkin_preferences set last_attempt_at=now() where user_id=p_actor;
 select coalesce(jsonb_agg(to_jsonb(h) order by sequence),'[]'::jsonb) into history from(select id,sequence,role,text,created_at from public.messages where conversation_id=c.id and kind='text' order by sequence desc limit 20)h;
 return jsonb_build_object('state','claimed','job',job,'lease',token,'replyMode','checkin','userTimeZone',pref.timezone,'maxInputTokens',cfg.max_input_tokens,'maxOutputTokens',cfg.max_output_tokens,
 'character',jsonb_build_object('name',(select name from public.characters where id=c.character_id),'direction',d.direction),'preferences',jsonb_build_object('language',(select language from public.profiles where id=p_actor)),
 'history',history,'memories',coalesce((select jsonb_agg(content order by saved_at,id) from public.memories where user_id=p_actor and character_id=c.character_id and deleted_at is null and exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and enabled)),'[]'::jsonb));
end;$$;
create function public.finish_character_checkin(p_job uuid,p_actor uuid,p_lease uuid,p_text text default null,p_failure text default null) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;pref private.checkin_preferences;
begin
 select * into pref from private.checkin_preferences where user_id=p_actor for share;
 select c0.* into c from public.conversations c0 join private.reply_jobs j0 on j0.conversation_id=c0.id where j0.id=p_job and c0.user_id=p_actor for update of c0;
 if not found then return 'discarded';end if;
 select * into j from private.reply_jobs where id=p_job for update;
 if j.origin<>'checkin' then return 'discarded';end if;
 if j.state='completed' then return public.finish_reply(p_job,p_actor,p_lease,p_text,p_failure,null);end if;
 if pref.user_id is null or pref.frequency='off' or pref.version<>j.checkin_preference_version or c.next_sequence<>j.checkin_sequence then
 update private.reply_jobs set state='cancelled',lease_until=null where id=p_job and state<>'completed';return 'discarded';end if;
 if p_failure is null and (p_text is null or char_length(p_text)>280 or p_text like '%[[ts:%' or p_text like '%[[gift%') then return public.finish_reply(p_job,p_actor,p_lease,null,'invalid_output',null);end if;
 return public.finish_reply(p_job,p_actor,p_lease,p_text,p_failure,null);
end;$$;
create function public.checkin_candidates(p_limit integer default 1) returns jsonb
language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(user_id),'[]'::jsonb) from(select user_id from private.checkin_preferences where frequency in ('daily','twice_weekly') and (last_attempt_at is null or last_attempt_at<now()-interval '24 hours') order by last_checked_at nulls first,user_id limit least(greatest(p_limit,1),3))p;$$;
revoke all on function public.claim_character_checkin(uuid,text,boolean),public.finish_character_checkin(uuid,uuid,uuid,text,text),public.checkin_candidates(integer) from public,anon,authenticated;
grant execute on function public.claim_character_checkin(uuid,text,boolean),public.finish_character_checkin(uuid,uuid,uuid,text,text),public.checkin_candidates(integer) to service_role;
commit;
