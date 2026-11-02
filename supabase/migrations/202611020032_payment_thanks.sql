begin;

-- Founder request, 2 November 2026: after a verified payment the character's AI
-- writes its own thank-you beneath the receipt. The trait-based wording from
-- 202610200019 remains the fallback when AI is unavailable, over budget or fails.
-- thanked_at, not message_id, records completion: a chat reset may delete the
-- message, and replaying a webhook must never bring the thanks back.
alter table private.payment_acknowledgements add column thanked_at timestamptz;
update private.payment_acknowledgements set thanked_at=created_at;

create function private.payment_thanks_text(p_intent uuid) returns text
language sql stable security definer set search_path='' as $$
 select case
  when i.gateway_environment='sandbox' then 'Test payment confirmed. Thank you for testing this with me! No real money was transferred.'
  when 'playful'=any(ch.personality) then 'Payment confirmed! That was such a sweet surprise. Thank you, you really made me smile.'
  when 'reserved'=any(ch.personality) then 'Payment confirmed. Thank you, that was really thoughtful of you. I appreciate it more than you know.'
  when 'romantic'=any(ch.personality) then 'Payment confirmed. That was so thoughtful of you. Thank you for the lovely gesture, I really appreciate it.'
  when 'witty'=any(ch.personality) then 'Payment confirmed. Well, you have officially made me smile. Thank you, that was really kind of you.'
  when 'confident'=any(ch.personality) then 'Payment confirmed. You are very thoughtful, thank you. I really appreciate you doing that.'
  else 'Payment confirmed. Thank you so much, that was very kind and thoughtful of you. I really appreciate it.'
 end
 from public.payment_intents i join public.characters ch on ch.id=i.character_id where i.id=p_intent;
$$;

-- Shared eligibility: the same conditions the 202610200019 acknowledgement used.
create function private.payment_thanks_eligible(c public.conversations,intent public.payment_intents) returns boolean
language sql stable security definer set search_path='' as $$
 select intent.status='paid' and not intent.needs_review and intent.gateway_payment_id is not null and intent.verified_at is not null
  and intent.conversation_generation is not distinct from c.generation and c.deleted_at is null and c.status='active'
  and exists(select 1 from public.profiles where id=c.user_id and onboarding_complete and adult_declared_at is not null and ai_consent_at is not null)
  and exists(select 1 from public.characters where id=c.character_id and status='published');
$$;

-- Posts the fixed thank-you once. Callers hold no locks; this takes conversation then acknowledgement.
create function private.post_payment_thanks(p_intent uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.conversations;intent public.payment_intents;reply text;out_id uuid;
begin
 select c0.* into c from public.conversations c0 join public.payment_intents i on i.conversation_id=c0.id where i.id=p_intent for update of c0;
 if not found then return null;end if;
 perform 1 from private.payment_acknowledgements where intent_id=p_intent and thanked_at is null for update;
 if not found then return null;end if;
 select * into intent from public.payment_intents where id=p_intent;
 if not private.payment_thanks_eligible(c,intent) then return null;end if;
 -- A live AI attempt owns the thanks until its lease ends.
 if exists(select 1 from private.reply_jobs j join public.messages m on m.id=j.anchor_message_id
  where j.conversation_id=c.id and j.origin='checkin' and j.state='generating' and j.lease_until>now() and m.payment_intent_id=p_intent) then return null;end if;
 reply:=private.payment_thanks_text(p_intent);
 insert into public.messages(conversation_id,sequence,role,kind,text)
 values(c.id,c.next_sequence,'character','text',reply) returning id into out_id;
 update private.payment_acknowledgements set message_id=out_id,thanked_at=now() where intent_id=p_intent;
 update public.conversations set next_sequence=next_sequence+1,context_revision=context_revision+1,updated_at=now(),last_message_at=now(),last_message_preview=reply where id=c.id;
 return out_id;
end;$$;

-- Verification records the receipt and a pending acknowledgement; the thanks follows separately.
create or replace function public.apply_gift_verification(p_intent uuid,p_checkout text,p_payment text,p_state text,p_verified_at timestamptz,p_event text default null,p_event_type text default 'reconciliation') returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;before_status text;intent public.payment_intents;result text;
begin
 -- Same conversation-then-intent lock order as the ledger and chat lifecycle.
 select c0.* into c from public.conversations c0 join public.payment_intents i on i.conversation_id=c0.id where i.id=p_intent for update of c0;
 if not found then raise exception 'not_found';end if;
 select status into before_status from public.payment_intents where id=p_intent for update;
 result:=private.apply_before_payment_acknowledgement(p_intent,p_checkout,p_payment,p_state,p_verified_at,p_event,p_event_type);
 select * into intent from public.payment_intents where id=p_intent;
 select * into c from public.conversations where id=c.id;
 if before_status='paid' or result<>'paid' or p_state<>'paid' or not private.payment_thanks_eligible(c,intent) then return result;end if;
 -- One acknowledgement per intent, even across webhook retries and chat resets.
 insert into private.payment_acknowledgements(intent_id) values(intent.id) on conflict do nothing;
 return result;
end;$$;

-- Reserves AI budget and a check-in job anchored to the receipt, so one intent gets one attempt.
create function public.claim_payment_thanks(p_intent uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations;intent public.payment_intents;cfg private.ai_configuration;d private.character_direction;receipt uuid;existing private.reply_jobs;
 token uuid:=gen_random_uuid();job uuid;cost bigint;usage_day date:=(now() at time zone 'UTC')::date;total bigint;personal bigint;history jsonb;
begin
 select c0.* into c from public.conversations c0 join public.payment_intents i on i.conversation_id=c0.id where i.id=p_intent for update of c0;
 if not found then return jsonb_build_object('state','unavailable');end if;
 perform 1 from private.payment_acknowledgements where intent_id=p_intent and thanked_at is null for update;
 if not found then return jsonb_build_object('state','done');end if;
 select * into intent from public.payment_intents where id=p_intent;
 if not private.payment_thanks_eligible(c,intent) then return jsonb_build_object('state','unavailable');end if;
 select id into receipt from public.messages where conversation_id=c.id and kind='payment' and payment_intent_id=intent.id order by sequence desc limit 1;
 if receipt is null then return jsonb_build_object('state','fallback');end if;
 select * into existing from private.reply_jobs where conversation_id=c.id and generation=c.generation and origin='checkin' and anchor_message_id=receipt;
 if found then return jsonb_build_object('state',case when existing.state='generating' and existing.lease_until>now() then 'generating' else 'fallback' end);end if;
 if private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then return jsonb_build_object('state','fallback');end if;
 select * into cfg from private.ai_configuration where singleton for share;
 if not cfg.enabled or cfg.model is distinct from p_model or cfg.input_micro_usd_per_million<=0 or cfg.output_micro_usd_per_million<=0 then return jsonb_build_object('state','fallback');end if;
 select * into d from private.character_direction where character_id=c.character_id;
 if not found then return jsonb_build_object('state','fallback');end if;
 cost:=ceil((cfg.max_input_tokens::numeric*cfg.input_micro_usd_per_million+cfg.max_output_tokens::numeric*cfg.output_micro_usd_per_million)/1000000)::bigint;
 perform pg_catalog.pg_advisory_xact_lock(781046211);
 select coalesce(amount_micro_usd,0) into total from private.ai_daily_usage where day=usage_day and scope='project';
 select coalesce(amount_micro_usd,0) into personal from private.ai_daily_usage where day=usage_day and scope=c.user_id::text;
 if coalesce(total,0)+cost>cfg.project_daily_micro_usd or coalesce(personal,0)+cost>cfg.user_daily_micro_usd then return jsonb_build_object('state','fallback');end if;
 insert into private.reply_jobs(conversation_id,generation,origin,anchor_message_id,checkin_sequence,state,lease,lease_until,attempts,context_revision,direction_version,configuration_version)
 values(c.id,c.generation,'checkin',receipt,c.next_sequence,'generating',token,now()+interval '45 seconds',1,c.context_revision,d.version,cfg.version) returning id into job;
 insert into private.ai_daily_usage as u(day,scope,amount_micro_usd) values(usage_day,'project',cost),(usage_day,c.user_id::text,cost) on conflict(day,scope) do update set amount_micro_usd=u.amount_micro_usd+excluded.amount_micro_usd;
 insert into private.ai_reservations(job_id,actor_id,lease,amount_micro_usd) values(job,c.user_id,token,cost);
 select coalesce(jsonb_agg(to_jsonb(h) order by sequence),'[]'::jsonb) into history from(select id,sequence,role,text,created_at from public.messages where conversation_id=c.id and kind='text' order by sequence desc limit 20)h;
 return jsonb_build_object('state','claimed','job',job,'lease',token,'actor',c.user_id,'replyMode','checkin','initiative','payment_thanks',
 'payment',jsonb_build_object('amountMinor',intent.amount_minor,'currency',intent.currency,'environment',intent.gateway_environment),
 'userTimeZone',coalesce((select timezone from private.checkin_preferences where user_id=c.user_id),'Africa/Lagos'),'maxInputTokens',cfg.max_input_tokens,'maxOutputTokens',cfg.max_output_tokens,
 'character',jsonb_build_object('name',(select name from public.characters where id=c.character_id),'gender',(select gender from public.characters where id=c.character_id),'direction',d.direction),'preferences',jsonb_build_object('language',(select language from public.profiles where id=c.user_id)),
 'history',history,'memories',coalesce((select jsonb_agg(content order by saved_at,id) from public.memories where user_id=c.user_id and character_id=c.character_id and deleted_at is null and exists(select 1 from public.memory_preferences where user_id=c.user_id and character_id=c.character_id and enabled)),'[]'::jsonb));
end;$$;

-- Saves the AI thanks, or posts the fixed thanks when the attempt fails or the chat moved on.
create function public.finish_payment_thanks(p_job uuid,p_lease uuid,p_intent uuid,p_text text default null,p_failure text default null) returns text
language plpgsql security definer set search_path='' as $$
declare j private.reply_jobs;actor uuid;result text;
begin
 select * into j from private.reply_jobs where id=p_job;
 if not found or j.origin<>'checkin' or not exists(select 1 from public.messages where id=j.anchor_message_id and kind='payment' and payment_intent_id=p_intent) then return 'discarded';end if;
 select user_id into actor from public.conversations where id=j.conversation_id;
 if p_failure is null and (p_text is null or char_length(p_text)>280 or p_text like '%[[ts:%' or p_text like '%[[talkingstage:%') then
  result:=public.finish_reply(p_job,actor,p_lease,null,'invalid_output',null);
 else result:=public.finish_reply(p_job,actor,p_lease,p_text,p_failure,null);end if;
 if result='completed' then
  update private.payment_acknowledgements set message_id=(select output_message_id from private.reply_jobs where id=p_job),thanked_at=now() where intent_id=p_intent and thanked_at is null;
 else perform private.post_payment_thanks(p_intent);end if;
 return result;
end;$$;

create function public.payment_thanks_fallback(p_intent uuid) returns text
language sql security definer set search_path='' as $$select case when private.post_payment_thanks(p_intent) is null then 'skipped' else 'posted' end;$$;

revoke all on function private.payment_thanks_text(uuid),private.payment_thanks_eligible(public.conversations,public.payment_intents),private.post_payment_thanks(uuid) from public,anon,authenticated,service_role;
revoke all on function public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text),public.claim_payment_thanks(uuid,text),public.finish_payment_thanks(uuid,uuid,uuid,text,text),public.payment_thanks_fallback(uuid) from public,anon,authenticated;
grant execute on function public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text),public.claim_payment_thanks(uuid,text),public.finish_payment_thanks(uuid,uuid,uuid,text,text),public.payment_thanks_fallback(uuid) to service_role;

commit;
