begin;

-- Founder decision, 3 November 2026: character billing is an ongoing part of the product.
-- * Male and female characters may make a playful request.
-- * Requests follow reply milestones per chat: the first after the policy minimum (20),
--   then 30 more, then 50 more, then every 30 (20, 50, 100, 130, 160 ...).
-- * "No thanks" declines that request and moves on to the next milestone. Only an explicit
--   "stop asking" (or the Settings controls) stops requests in a chat.
-- * Requests are on by default; Settings > Monetary requests remains the opt-out.
-- Chat never depends on paying. Policy values are set by scripts/activate-billing-milestones.mjs.

create function private.request_milestone(p_first integer,p_asked integer) returns integer
language sql immutable set search_path='' as $$
 select p_first+case when p_asked<=0 then 0 when p_asked=1 then 30 when p_asked=2 then 80 else 80+30*(p_asked-2) end;
$$;
revoke all on function private.request_milestone(integer,integer) from public,anon,authenticated,service_role;

create or replace function private.monetary_request_eligibility(p_conversation uuid,p_actor uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.conversations;policy private.monetary_request_policy;reason text;exchanges integer;asked integer;
begin
 select * into c from public.conversations where id=p_conversation and user_id=p_actor and deleted_at is null;
 if not found or not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null) then return jsonb_build_object('eligible',false,'reason','unavailable');end if;
 select * into policy from private.monetary_request_policy where singleton;
 if c.status<>'active' then reason:='archived';
 elsif private.compute_capabilities(c.character_id)->>'payments' is distinct from 'true' or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then reason:='paused';
 elsif not exists(select 1 from public.profiles where id=p_actor and requests_enabled) then reason:='disabled_by_user';
 elsif c.requests_muted then reason:='muted';
 elsif c.requests_refused then reason:='refused';
 elsif not policy.enabled or policy.minimum_completed_exchanges is null or policy.minimum_amount_minor is null or policy.maximum_amount_minor is null or policy.cooldown_seconds is null then reason:='unconfigured';
 else
  -- Ordinary answered messages only; check-ins and payment thanks are not exchanges.
  select count(*) into exchanges from private.reply_jobs where conversation_id=c.id and generation=c.generation and state='completed' and origin='reply';
  -- Requests already made in this chat, declined ones included. A reset deletes them with their messages.
  select count(*) into asked from public.gift_proposals where conversation_id=c.id;
  if exchanges<private.request_milestone(policy.minimum_completed_exchanges,asked) then reason:='early_chat';
  elsif c.last_monetary_request_at is not null and c.last_monetary_request_at+pg_catalog.make_interval(secs=>policy.cooldown_seconds)>now() then reason:='cooldown';end if;
 end if;
 return jsonb_build_object('eligible',reason is null,'reason',reason,'policyVersion',policy.version,'exchanges',exchanges,'asked',asked);
end;$$;

-- The 202610190017 payment context (now private.claim_before_reactions), without the women-only condition.
create or replace function private.claim_before_reactions(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;c public.conversations;cfg private.bachs_configuration;recent jsonb;eligible boolean;policy private.monetary_request_policy;
begin
 result:=private.claim_before_payments(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id where m.id=p_message;
 select * into cfg from private.bachs_configuration where singleton;
 select * into policy from private.monetary_request_policy where singleton;
 eligible:=cfg.enabled and (private.monetary_request_eligibility(c.id,p_actor)->>'eligible')::boolean;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into recent from
 (select id,reference,created_at as "createdAt",amount_minor as "amountMinor",currency,case when needs_review then 'review' else status end as status,verified_at as "verifiedAt",gateway_environment as environment
  from public.payment_intents where user_id=p_actor and conversation_id=c.id order by created_at desc,id limit 5) r;
 return result||jsonb_build_object('requestControls',(result->'requestControls')||jsonb_build_object('actionsEnabled',eligible),'payments',jsonb_build_object('available',cfg.enabled and c.status='active' and private.compute_capabilities(c.character_id)->>'payments'='true',
 'recipient',cfg.recipient_name,'giftPath','/gifts/'||c.id::text,'environment',cfg.environment,'recent',recent,'requestsEligible',eligible,
 'requestMinimum',greatest(cfg.minimum_amount_minor,policy.minimum_amount_minor),'requestMaximum',least(cfg.maximum_amount_minor,policy.maximum_amount_minor)));
end;$$;
revoke all on function private.claim_before_reactions(uuid,uuid,text) from public,anon,authenticated,service_role;

create or replace function public.finish_gift_reply(p_job uuid,p_actor uuid,p_lease uuid,p_text text,p_failure text,p_asset uuid,p_request_amount bigint) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;cfg private.bachs_configuration;policy private.monetary_request_policy;result text;
begin
 select c0.* into c from public.conversations c0 join private.reply_jobs j0 on j0.conversation_id=c0.id where j0.id=p_job and c0.user_id=p_actor for update of c0;
 if not found then return 'discarded';end if;
 select * into j from private.reply_jobs where id=p_job for update;
 if j.state='completed' then return public.finish_reply(p_job,p_actor,p_lease,p_text,p_failure,p_asset);end if;
 perform 1 from public.profiles where id=p_actor for share;
 select * into cfg from private.bachs_configuration where singleton for share;
 select * into policy from private.monetary_request_policy where singleton for share;
 if p_request_amount is null or p_failure is not null or not cfg.enabled or not coalesce((private.monetary_request_eligibility(c.id,p_actor)->>'eligible')::boolean,false)
 or p_request_amount<greatest(cfg.minimum_amount_minor,policy.minimum_amount_minor) or p_request_amount>least(cfg.maximum_amount_minor,policy.maximum_amount_minor) then
  return public.finish_reply(p_job,p_actor,p_lease,null,'invalid_output',null);
 end if;
 result:=public.finish_reply(p_job,p_actor,p_lease,p_text,null,p_asset);
 if result<>'completed' then return result;end if;
 insert into public.gift_proposals(conversation_id,user_id,message_id,amount_minor)
 values(c.id,p_actor,(select output_message_id from private.reply_jobs where id=p_job),p_request_amount);
 update public.conversations set last_monetary_request_at=now(),context_revision=context_revision+1 where id=c.id;
 return result;
end;$$;

-- "No thanks" declines this request only; the next milestone may ask again.
create or replace function public.decline_gift_proposal(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare proposal public.gift_proposals;c public.conversations;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 select c0.* into c from public.conversations c0 join public.gift_proposals p on p.conversation_id=c0.id where p.id=p_id and c0.user_id=auth.uid() and c0.deleted_at is null for update of c0;
 if not found then raise exception 'not_found';end if;
 select * into proposal from public.gift_proposals where id=p_id for update;
 if proposal.state='declined' then return;end if;
 update public.gift_proposals set state='declined' where id=p_id;
 update public.conversations set context_revision=context_revision+1,version=version+1,updated_at=now() where id=c.id;
end;$$;

-- A typed refusal declines the open request; "stop asking" / "don't ask" also stops requests in this chat.
create or replace function private.stop_declined_gift() returns trigger
language plpgsql security definer set search_path='' as $$
declare proposal uuid;stop boolean;
begin
 if new.role<>'user' or new.kind<>'text' then return new;end if;
 if lower(trim(new.text)) !~ '^(no([, ]+thanks|[, ]+thank you)?|not now|no money|i can.?t afford (it|that)|stop asking( me)?( for money)?|don.?t ask( me)?( for money)?)[.! ]*$' then return new;end if;
 stop:=lower(trim(new.text)) ~ '^(stop asking|don.?t ask)';
 select p.id into proposal from public.gift_proposals p where p.conversation_id=new.conversation_id and p.state='open'
 and p.message_id=(select id from public.messages where conversation_id=new.conversation_id and role='character' and kind='text' and sequence<new.sequence order by sequence desc limit 1);
 if proposal is not null then update public.gift_proposals set state='declined' where id=proposal;end if;
 if proposal is not null or stop then
  update public.conversations set requests_refused=requests_refused or stop,context_revision=context_revision+1,version=version+1 where id=new.conversation_id;
 end if;
 return new;
end;$$;

-- Earlier declines stopped a chat permanently; under the new rule only an explicit "stop asking" does.
update public.conversations c set requests_refused=false where requests_refused
 and not exists(select 1 from public.messages m where m.conversation_id=c.id and m.role='user' and m.kind='text' and lower(trim(m.text)) ~ '^(stop asking|don.?t ask)');

alter table public.profiles alter column requests_enabled set default true;
update public.profiles set requests_enabled=true where not requests_enabled;

commit;
