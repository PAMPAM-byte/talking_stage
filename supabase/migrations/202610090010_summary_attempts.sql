begin;
-- Preserve attempt identity after a newer turn replaces or invalidates the cache.
-- Deleting a reply job removes its identity, retaining text-free usage metadata.
alter table private.summary_reservations add column source_job uuid unique references private.reply_jobs(id) on delete set null;
update private.summary_reservations r set source_job=s.source_job from private.conversation_summaries s where s.lease=r.lease;
create or replace function public.claim_summary(p_message uuid,p_actor uuid,p_model text) returns jsonb
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
 if exists(select 1 from private.summary_reservations where source_job=j.id) then return jsonb_build_object('state','already_attempted');end if;
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
 insert into private.summary_reservations(lease,actor_id,amount_micro_usd,source_job) values(token,p_actor,cost,j.id);
 insert into private.conversation_summaries(conversation_id,generation,context_revision,direction_version,configuration_version,through_sequence,excerpts,state,lease,lease_until,source_ids,source_job)
 values(c.id,c.generation,c.context_revision,d.version,cfg.version,cutoff,'[]','generating',token,now()+interval '45 seconds',array(select (e->>'id')::uuid from jsonb_array_elements(sources) e),j.id)
 on conflict(conversation_id) do update set generation=excluded.generation,context_revision=excluded.context_revision,direction_version=excluded.direction_version,configuration_version=excluded.configuration_version,
 through_sequence=excluded.through_sequence,excerpts='[]',state='generating',lease=excluded.lease,lease_until=excluded.lease_until,source_ids=excluded.source_ids,source_job=excluded.source_job,failure_code=null;
 return jsonb_build_object('state','claimed','conversation',c.id,'lease',token,'sources',sources,'maxInputTokens',cfg.max_input_tokens,'maxOutputTokens',cfg.max_output_tokens);
end;$$;


commit;
