begin;
-- Recover conversations started before AI activation without replaying every old message.
create or replace function private.claim_text_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
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
 where older.conversation_id=c.id and older.state not in ('completed','cancelled') and not (older.state='blocked_provider' and older.attempts=0) and m.sequence<(select sequence from public.messages where id=p_message)) then return jsonb_build_object('state','earlier_reply_pending');end if;
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
 -- Only supersede replies that have never reached the provider. Keep their user messages.
 -- The conversation row lock above serializes this with claims, sends and cancellations.
 update private.reply_jobs older set state='cancelled'
 from public.messages m where m.id=older.user_message_id and older.conversation_id=c.id
 and older.state='blocked_provider' and older.attempts=0
 and m.sequence<(select sequence from public.messages where id=p_message);
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
revoke all on function private.claim_text_reply(uuid,uuid,text) from public,anon,authenticated,service_role;
commit;
