begin;
-- One initial character hello per generation, sharing the existing daily cap.
create unique index one_character_opener on private.reply_jobs(conversation_id,generation) where origin='checkin' and anchor_message_id is null;
create function public.claim_character_initiative(p_actor uuid,p_model text,p_on_return boolean,p_conversation uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pref private.checkin_preferences;c public.conversations;cfg private.ai_configuration;d private.character_direction;anchor public.messages;
 token uuid:=gen_random_uuid();job uuid;cost bigint;usage_day date:=(now() at time zone 'UTC')::date;total bigint;personal bigint;history jsonb;opener boolean;
begin
 select * into pref from private.checkin_preferences where user_id=p_actor for update;
 if not found or pref.frequency='off' or (pref.frequency='on_return' and not p_on_return) then return jsonb_build_object('state','disabled');end if;
 update private.checkin_preferences set last_checked_at=now() where user_id=p_actor;
 if not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null) then return jsonb_build_object('state','unavailable');end if;
 if extract(hour from now() at time zone pref.timezone) not between 9 and 20 and not p_on_return then return jsonb_build_object('state','quiet_hours');end if;
 if pref.last_attempt_at>now()-(case when pref.frequency='twice_weekly' then interval '84 hours' else interval '24 hours' end) then return jsonb_build_object('state','cooldown');end if;
 select c0.* into c from public.conversations c0
 where c0.user_id=p_actor and c0.deleted_at is null and c0.status='active'
 and (p_conversation is null or c0.id=p_conversation)
 and private.compute_capabilities(c0.character_id)->>'chat'='true'
 and ((p_on_return and not exists(select 1 from public.messages where conversation_id=c0.id) and not exists(select 1 from private.reply_jobs where conversation_id=c0.id and origin='checkin'))
 or (extract(hour from now() at time zone pref.timezone) between 9 and 20
 and c0.last_message_at<now()-interval '12 hours'
 and (select count(*) from public.messages where conversation_id=c0.id and role='user' and kind='text')>=4
 and (select count(*) from public.messages where conversation_id=c0.id and role='character' and kind='text')>=4
 and (select role from public.messages where conversation_id=c0.id order by sequence desc limit 1)='character'))
 and not exists(select 1 from private.reply_jobs where conversation_id=c0.id and state not in ('completed','cancelled') and (origin='reply' or (state='generating' and lease_until>now())))
 and not exists(select 1 from private.reply_jobs j where j.conversation_id=c0.id and j.origin='checkin' and j.anchor_message_id=(select id from public.messages where conversation_id=c0.id and role='user' order by sequence desc limit 1))
 order by c0.last_message_at desc nulls first,c0.id limit 1 for update of c0 skip locked;
 if not found then return jsonb_build_object('state','not_due');end if;
 opener:=not exists(select 1 from public.messages where conversation_id=c.id);
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
 return jsonb_build_object('state','claimed','job',job,'lease',token,'replyMode','checkin','initiative',case when opener then 'opener' else 'followup' end,'userTimeZone',pref.timezone,'maxInputTokens',cfg.max_input_tokens,'maxOutputTokens',cfg.max_output_tokens,
 'character',jsonb_build_object('name',(select name from public.characters where id=c.character_id),'gender',(select gender from public.characters where id=c.character_id),'direction',d.direction),'preferences',jsonb_build_object('language',(select language from public.profiles where id=p_actor)),
 'history',history,'memories',coalesce((select jsonb_agg(content order by saved_at,id) from public.memories where user_id=p_actor and character_id=c.character_id and deleted_at is null and exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and enabled)),'[]'::jsonb));
end;$$;

create or replace function public.claim_character_checkin(p_actor uuid,p_model text,p_on_return boolean default false) returns jsonb
language sql security definer set search_path='' as $$select public.claim_character_initiative(p_actor,p_model,p_on_return,null);$$;

alter function public.claim_reply(uuid,uuid,text) rename to claim_before_dating_context;
alter function public.claim_before_dating_context(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_dating_context(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;gender text;
begin
 result:=private.claim_before_dating_context(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select ch.gender into gender from public.messages m join public.conversations c on c.id=m.conversation_id join public.characters ch on ch.id=c.character_id where m.id=p_message and c.user_id=p_actor;
 return result||jsonb_build_object('character',(result->'character')||jsonb_build_object('gender',gender));
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text),public.claim_character_checkin(uuid,text,boolean),public.claim_character_initiative(uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text),public.claim_character_checkin(uuid,text,boolean),public.claim_character_initiative(uuid,text,boolean,uuid) to service_role;
commit;
