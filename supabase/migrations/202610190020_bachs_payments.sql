begin;
create table private.bachs_configuration (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 environment text not null default 'sandbox' check(environment in ('sandbox','production')),
 organization_id text, recipient_name text,
 minimum_amount_minor bigint check(minimum_amount_minor>0), maximum_amount_minor bigint check(maximum_amount_minor>=minimum_amount_minor and maximum_amount_minor<=9007199254740991),
 check(not enabled or (organization_id ~ '^acct_[A-Za-z0-9]+$' and organization_id is not null and recipient_name is not null and length(trim(recipient_name)) between 1 and 120 and minimum_amount_minor is not null and maximum_amount_minor is not null))
);
insert into private.bachs_configuration(singleton) values(true);
alter table private.bachs_configuration enable row level security;
revoke all on private.bachs_configuration from public,anon,authenticated,service_role;
alter table public.payment_intents add column gateway_environment text check(gateway_environment in ('sandbox','production')),
 add column gateway_organization_id text, add column gateway_checkout_id text, add column gateway_payment_id text,
 add column checkout_url text, add column gateway_updated_at timestamptz, add column needs_review boolean not null default false;
create unique index bachs_checkout_binding on public.payment_intents(gateway_environment,gateway_organization_id,gateway_checkout_id) where gateway_checkout_id is not null;
create trigger bachs_policy_context_changed after update on private.bachs_configuration for each row execute function private.invalidate_request_policy_context();
create table public.gift_proposals (
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null,user_id uuid not null,
 message_id uuid not null unique references public.messages(id) on delete cascade,
 amount_minor bigint not null check(amount_minor>0),state text not null default 'open' check(state in ('open','declined')),
 created_at timestamptz not null default now(),foreign key(conversation_id,user_id) references public.conversations(id,user_id)
);
alter table public.gift_proposals enable row level security;
revoke all on public.gift_proposals from public,anon,authenticated,service_role;
grant select on public.gift_proposals to authenticated;
create policy own_gift_proposals on public.gift_proposals for select to authenticated using(public.has_adult_access() and user_id=(select auth.uid()) and exists(select 1 from public.conversations where id=conversation_id and deleted_at is null));
create function public.decline_gift_proposal(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare proposal public.gift_proposals;c public.conversations;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 select c0.* into c from public.conversations c0 join public.gift_proposals p on p.conversation_id=c0.id where p.id=p_id and c0.user_id=auth.uid() and c0.deleted_at is null for update of c0;
 if not found then raise exception 'not_found';end if;
 select * into proposal from public.gift_proposals where id=p_id for update;
 if proposal.state='declined' then return;end if;
 update public.gift_proposals set state='declined' where id=p_id;
 update public.conversations set requests_refused=true,context_revision=context_revision+1,version=version+1,updated_at=now() where id=c.id;
end;$$;

create function public.gift_settings(p_conversation uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.conversations;cfg private.bachs_configuration;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 select * into c from public.conversations where id=p_conversation and user_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'not_found';end if;
 select * into cfg from private.bachs_configuration where singleton;
 return jsonb_build_object('available',cfg.enabled and c.status='active' and private.compute_capabilities(c.character_id)->>'payments'='true',
 'recipient',cfg.recipient_name,'environment',cfg.environment,'minimum',cfg.minimum_amount_minor,'maximum',cfg.maximum_amount_minor,
 'characterName',(select name from public.characters where id=c.character_id));
end;$$;

create function private.stop_declined_gift() returns trigger
language plpgsql security definer set search_path='' as $$
declare proposal uuid;
begin
 if new.role<>'user' or new.kind<>'text' then return new;end if;
 if lower(trim(new.text)) !~ '^(no([, ]+thanks|[, ]+thank you)?|not now|no money|i can.?t afford (it|that)|stop asking( me)?( for money)?|don.?t ask( me)?( for money)?)[.! ]*$' then return new;end if;
 select p.id into proposal from public.gift_proposals p where p.conversation_id=new.conversation_id and p.state='open'
 and p.message_id=(select id from public.messages where conversation_id=new.conversation_id and role='character' and kind='text' and sequence<new.sequence order by sequence desc limit 1);
 if proposal is not null then
  update public.gift_proposals set state='declined' where id=proposal;
  update public.conversations set requests_refused=true,context_revision=context_revision+1,version=version+1 where id=new.conversation_id;
 end if;
 return new;
end;$$;
revoke all on function private.stop_declined_gift() from public,anon,authenticated,service_role;
create trigger stop_declined_gift after insert on public.messages for each row execute function private.stop_declined_gift();

create function public.reserve_gift(p_actor uuid,p_conversation uuid,p_amount bigint,p_operation uuid,p_environment text,p_organization text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations;cfg private.bachs_configuration;intent public.payment_intents;
begin
 select * into cfg from private.bachs_configuration where singleton for share;
 select * into c from public.conversations where id=p_conversation and user_id=p_actor and deleted_at is null for update;
 if not found or not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null) then raise exception 'not_found';end if;
 if not cfg.enabled or cfg.environment is distinct from p_environment or cfg.organization_id is distinct from p_organization
 or c.status<>'active' or private.compute_capabilities(c.character_id)->>'payments' is distinct from 'true' then raise exception 'payments_paused';end if;
 if p_amount is null or p_amount<cfg.minimum_amount_minor or p_amount>cfg.maximum_amount_minor or p_operation is null then raise exception 'invalid_amount';end if;
 select * into intent from public.payment_intents where user_id=p_actor and idempotency_key=p_operation::text;
 if found then
  if intent.conversation_id<>c.id or intent.amount_minor<>p_amount or intent.gateway_environment<>p_environment or intent.gateway_organization_id<>p_organization then raise exception 'conflict';end if;
  return to_jsonb(intent);
 end if;
 if (select count(*) from public.payment_intents where user_id=p_actor and created_at>now()-interval '1 minute')>=10 then raise exception 'rate_limited';end if;
 insert into public.payment_intents(user_id,conversation_id,character_id,amount_minor,reference,idempotency_key,recipient_disclosure,gateway_environment,gateway_organization_id)
 values(p_actor,c.id,c.character_id,p_amount,'TS-'||gen_random_uuid()::text,p_operation::text,cfg.recipient_name,p_environment,p_organization) returning * into intent;
 return to_jsonb(intent);
end;$$;

create function public.bind_gift_checkout(p_intent uuid,p_checkout text,p_url text,p_expires timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare intent public.payment_intents;
begin
 select * into intent from public.payment_intents where id=p_intent for update;
 if not found then raise exception 'not_found';end if;
 if intent.gateway_checkout_id is not null then
  if intent.gateway_checkout_id<>p_checkout or intent.checkout_url<>p_url then raise exception 'conflict';end if;return;
 end if;
 if p_checkout !~ '^chk_[A-Za-z0-9]+$' or p_url !~ '^https://(sandbox-checkout[.]bachs[.]io|checkout[.]bachs[.]io)/' or p_expires is null then raise exception 'invalid_checkout';end if;
 update public.payment_intents set gateway_checkout_id=p_checkout,checkout_url=p_url,expires_at=p_expires,status='pending' where id=intent.id;
end;$$;

create function public.apply_gift_verification(p_intent uuid,p_checkout text,p_payment text,p_state text,p_verified_at timestamptz,p_event text default null,p_event_type text default 'reconciliation') returns text
language plpgsql security definer set search_path='' as $$
declare intent public.payment_intents;c public.conversations;new_state text;review boolean;changed boolean;event_id uuid;
begin
 -- Consistent conversation-then-intent lock order serializes receipts with chat lifecycle actions.
 select c0.* into c from public.conversations c0 join public.payment_intents i on i.conversation_id=c0.id where i.id=p_intent for update of c0;
 if not found then raise exception 'not_found';end if;
 select * into intent from public.payment_intents where id=p_intent for update;
 if intent.gateway_checkout_id is distinct from p_checkout or p_verified_at is null or p_verified_at>now()+interval '5 minutes'
 or p_state is null or p_state not in ('pending','paid','failed','cancelled','expired','refunded','review') then raise exception 'invalid_verification';end if;
 if intent.gateway_payment_id is not null and p_payment is distinct from intent.gateway_payment_id then raise exception 'payment_mismatch';end if;
 if p_event is not null then
  insert into private.payment_events(intent_id,gateway_event_id,event_type,verification_result,processed_at)
  values(intent.id,intent.gateway_environment||':'||intent.gateway_organization_id||':'||p_event,p_event_type,'verified',now()) on conflict(gateway_event_id) do nothing returning id into event_id;
  if event_id is null then return intent.status;end if;
 end if;
 if intent.gateway_updated_at is not null and p_verified_at<intent.gateway_updated_at then return intent.status;end if;
 -- A late failure/pending event cannot undo confirmed money or a refund.
 if intent.status in ('paid','refunded','disputed') and p_state in ('pending','failed','cancelled','expired') then return intent.status;end if;
 if intent.status in ('refunded','disputed') and p_state='paid' then return intent.status;end if;
 new_state:=case when p_state='review' then case when intent.status='paid' then 'paid' else 'pending' end else p_state end;
 review:=p_state='review';changed:=new_state<>intent.status or review<>intent.needs_review;
 update public.payment_intents set status=new_state,needs_review=review,gateway_payment_id=coalesce(p_payment,gateway_payment_id),gateway_updated_at=p_verified_at,
 verified_at=case when p_state in ('paid','refunded','failed','cancelled','expired') then p_verified_at else verified_at end where id=intent.id;
 if changed and c.deleted_at is null then
  insert into public.messages(conversation_id,sequence,role,kind,payment_intent_id,text)
  values(c.id,c.next_sequence,'system','payment',intent.id,case when review then 'Payment needs review.' when new_state='paid' then 'Gift payment confirmed.' when new_state='refunded' then 'Gift refunded.' when new_state='failed' then 'Payment failed.' when new_state='expired' then 'Checkout expired.' when new_state='cancelled' then 'Checkout cancelled.' else 'Payment verification pending.' end);
  update public.conversations set next_sequence=next_sequence+1,context_revision=context_revision+1,updated_at=now(),last_message_at=now(),last_message_preview=case when new_state='paid' then 'Gift payment confirmed.' else 'Payment status updated.' end where id=c.id;
 end if;
 return new_state;
end;$$;

-- The provider sees only bounded, owned ledger facts, never gateway credentials or payer bank data.
alter function public.claim_reply(uuid,uuid,text) rename to claim_before_payments;
alter function public.claim_before_payments(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_payments(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;c public.conversations;cfg private.bachs_configuration;recent jsonb;eligible boolean;policy private.monetary_request_policy;
begin
 result:=private.claim_before_payments(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id where m.id=p_message;
 select * into cfg from private.bachs_configuration where singleton;
 select * into policy from private.monetary_request_policy where singleton;
 eligible:=cfg.enabled and (private.monetary_request_eligibility(c.id,p_actor)->>'eligible')::boolean and exists(select 1 from public.characters where id=c.character_id and gender='woman');
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into recent from
 (select id,amount_minor as "amountMinor",currency,case when needs_review then 'review' else status end as status,verified_at as "verifiedAt",gateway_environment as environment
  from public.payment_intents where user_id=p_actor and conversation_id=c.id order by created_at desc,id limit 5) r;
 return result||jsonb_build_object('requestControls',(result->'requestControls')||jsonb_build_object('actionsEnabled',eligible),'payments',jsonb_build_object('available',cfg.enabled and c.status='active' and private.compute_capabilities(c.character_id)->>'payments'='true',
 'recipient',cfg.recipient_name,'giftPath','/gifts/'||c.id::text,'environment',cfg.environment,'recent',recent,'requestsEligible',eligible,
 'requestMinimum',greatest(cfg.minimum_amount_minor,policy.minimum_amount_minor),'requestMaximum',least(cfg.maximum_amount_minor,policy.maximum_amount_minor)));
end;$$;
create function public.finish_gift_reply(p_job uuid,p_actor uuid,p_lease uuid,p_text text,p_failure text,p_asset uuid,p_request_amount bigint) returns text
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
 or p_request_amount<greatest(cfg.minimum_amount_minor,policy.minimum_amount_minor) or p_request_amount>least(cfg.maximum_amount_minor,policy.maximum_amount_minor)
 or not exists(select 1 from public.characters where id=c.character_id and gender='woman') then
  return public.finish_reply(p_job,p_actor,p_lease,null,'invalid_output',null);
 end if;
 result:=public.finish_reply(p_job,p_actor,p_lease,p_text,null,p_asset);
 if result<>'completed' then return result;end if;
 insert into public.gift_proposals(conversation_id,user_id,message_id,amount_minor)
 values(c.id,p_actor,(select output_message_id from private.reply_jobs where id=p_job),p_request_amount);
 update public.conversations set last_monetary_request_at=now(),context_revision=context_revision+1 where id=c.id;
 return result;
end;$$;
revoke all on function public.decline_gift_proposal(uuid) from public,anon;
grant execute on function public.decline_gift_proposal(uuid) to authenticated;
revoke all on function public.finish_gift_reply(uuid,uuid,uuid,text,text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.finish_gift_reply(uuid,uuid,uuid,text,text,uuid,bigint) to service_role;
create function public.admin_gift_ledger(p_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_adult_access() or not public.is_admin() then raise exception 'forbidden';end if;
 return jsonb_build_object('payments',coalesce((select jsonb_agg(to_jsonb(r)) from
 (select i.*,ch.name as character_name from public.payment_intents i join public.characters ch on ch.id=i.character_id where p_id is null or i.id=p_id order by i.created_at desc,i.id limit 50) r),'[]'::jsonb),
 'events',case when p_id is null then '[]'::jsonb else coalesce((select jsonb_agg(to_jsonb(e)) from
 (select id,gateway_event_id,event_type,verification_result,received_at,processed_at from private.payment_events where intent_id=p_id order by received_at desc,id limit 50) e),'[]'::jsonb) end);
end;$$;
revoke all on function public.admin_gift_ledger(uuid) from public,anon;
grant execute on function public.admin_gift_ledger(uuid) to authenticated;
revoke all on function public.gift_settings(uuid) from public,anon;
grant execute on function public.gift_settings(uuid) to authenticated;
revoke all on function public.reserve_gift(uuid,uuid,bigint,uuid,text,text),public.bind_gift_checkout(uuid,text,text,timestamptz),public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text),public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_gift(uuid,uuid,bigint,uuid,text,text),public.bind_gift_checkout(uuid,text,text,timestamptz),public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text),public.claim_reply(uuid,uuid,text) to service_role;
commit;
