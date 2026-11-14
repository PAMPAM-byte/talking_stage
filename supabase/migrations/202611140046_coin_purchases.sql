-- Buying coins through Bachs (founder decision, 14 November 2026): ₦50 per coin, at least 10.
-- Kept apart from gifts (payment_intents belong to a chat and post receipts into it). The same
-- verification rules apply: the server confirms each payment with Bachs, events are deduplicated,
-- a late failure cannot undo confirmed money. Coins are added exactly once, when a purchase is
-- first confirmed paid. A refund removes them again (as far as the balance allows) and flags review.
begin;

create table private.coin_purchases (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 coins integer not null check(coins between 10 and 1000),
 amount_minor bigint not null check(amount_minor=coins*5000),
 currency text not null default 'NGN' check(currency='NGN'),
 reference text not null unique check(reference ~ '^TC-'),
 idempotency_key text not null,
 recipient_disclosure text not null,
 status text not null default 'awaiting_checkout' check(status in ('awaiting_checkout','pending','paid','failed','cancelled','expired','refunded')),
 needs_review boolean not null default false,
 gateway_environment text not null check(gateway_environment in ('sandbox','production')),
 gateway_organization_id text not null,
 gateway_checkout_id text, checkout_url text, expires_at timestamptz,
 gateway_payment_id text, gateway_updated_at timestamptz, verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(user_id,idempotency_key)
);
create unique index coin_purchase_checkout on private.coin_purchases(gateway_environment,gateway_organization_id,gateway_checkout_id) where gateway_checkout_id is not null;
create index coin_purchases_user on private.coin_purchases(user_id,created_at desc);
create table private.coin_purchase_events (
 gateway_event_id text primary key,
 purchase_id uuid not null references private.coin_purchases(id) on delete cascade,
 event_type text not null, processed_at timestamptz not null default now()
);
alter table private.coin_ledger add column coin_purchase_id uuid references private.coin_purchases(id) on delete set null;
create unique index one_credit_per_purchase on private.coin_ledger(coin_purchase_id) where kind='purchase';
create unique index one_refund_per_purchase on private.coin_ledger(coin_purchase_id) where kind='admin' and coin_purchase_id is not null;
alter table private.coin_purchases enable row level security;
alter table private.coin_purchase_events enable row level security;
revoke all on private.coin_purchases,private.coin_purchase_events from public,anon,authenticated,service_role;

-- Server only (service role, after the app has checked the signed-in account).
create function public.reserve_coin_purchase(p_actor uuid,p_coins integer,p_operation uuid,p_environment text,p_organization text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg private.bachs_configuration;purchase private.coin_purchases;amount bigint;
begin
 select * into cfg from private.bachs_configuration where singleton for share;
 if not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null) then raise exception 'not_found';end if;
 if not private.likes_on() or not cfg.enabled or cfg.environment is distinct from p_environment or cfg.organization_id is distinct from p_organization then raise exception 'payments_paused';end if;
 if p_coins is null or p_coins<10 or p_coins>1000 or p_operation is null then raise exception 'invalid_amount';end if;
 amount:=p_coins::bigint*5000;
 if amount>cfg.maximum_amount_minor then raise exception 'invalid_amount';end if;
 select * into purchase from private.coin_purchases where user_id=p_actor and idempotency_key=p_operation::text;
 if found then
  if purchase.coins<>p_coins or purchase.gateway_environment<>p_environment or purchase.gateway_organization_id<>p_organization then raise exception 'conflict';end if;
  return to_jsonb(purchase);
 end if;
 if (select count(*) from private.coin_purchases where user_id=p_actor and created_at>now()-interval '1 minute')>=10 then raise exception 'rate_limited';end if;
 insert into private.coin_purchases(user_id,coins,amount_minor,reference,idempotency_key,recipient_disclosure,gateway_environment,gateway_organization_id)
 values(p_actor,p_coins,amount,'TC-'||gen_random_uuid()::text,p_operation::text,cfg.recipient_name,p_environment,p_organization) returning * into purchase;
 return to_jsonb(purchase);
end;$$;

create function public.bind_coin_checkout(p_purchase uuid,p_checkout text,p_url text,p_expires timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare purchase private.coin_purchases;
begin
 select * into purchase from private.coin_purchases where id=p_purchase for update;
 if not found then raise exception 'not_found';end if;
 if purchase.gateway_checkout_id is not null then
  if purchase.gateway_checkout_id<>p_checkout or purchase.checkout_url<>p_url then raise exception 'conflict';end if;return;
 end if;
 if p_checkout !~ '^chk_[A-Za-z0-9]+$' or p_url !~ '^https://(sandbox-checkout[.]bachs[.]io|checkout[.]bachs[.]io)/' or p_expires is null then raise exception 'invalid_checkout';end if;
 update private.coin_purchases set gateway_checkout_id=p_checkout,checkout_url=p_url,expires_at=p_expires,status='pending' where id=p_purchase;
end;$$;

-- Checked-out purchase for the server (verification and webhook lookup).
create function public.coin_purchase_for_checkout(p_environment text,p_organization text,p_checkout text,p_reference text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(p) from private.coin_purchases p where p.gateway_environment=p_environment and p.gateway_organization_id=p_organization
  and (p.gateway_checkout_id=p_checkout or (p_reference is not null and p.reference=p_reference)) order by p.gateway_checkout_id is null limit 1
$$;
create function public.coin_purchase_by_id(p_purchase uuid,p_actor uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(p) from private.coin_purchases p where p.id=p_purchase and (p_actor is null or p.user_id=p_actor)
$$;

create function public.apply_coin_verification(p_purchase uuid,p_checkout text,p_payment text,p_state text,p_verified_at timestamptz,p_event text default null,p_event_type text default 'reconciliation') returns text
language plpgsql security definer set search_path='' as $$
declare purchase private.coin_purchases;new_state text;review boolean;inserted text;balance integer;
begin
 select * into purchase from private.coin_purchases where id=p_purchase for update;
 if not found then raise exception 'not_found';end if;
 if purchase.gateway_checkout_id is distinct from p_checkout or p_verified_at is null or p_verified_at>now()+interval '5 minutes'
 or p_state is null or p_state not in ('pending','paid','failed','cancelled','expired','refunded','review') then raise exception 'invalid_verification';end if;
 if purchase.gateway_payment_id is not null and p_payment is distinct from purchase.gateway_payment_id then raise exception 'payment_mismatch';end if;
 if p_event is not null then
  insert into private.coin_purchase_events(gateway_event_id,purchase_id,event_type) values(purchase.gateway_environment||':'||purchase.gateway_organization_id||':'||p_event,purchase.id,p_event_type)
  on conflict do nothing returning gateway_event_id into inserted;
  if inserted is null then return purchase.status;end if;
 end if;
 if purchase.gateway_updated_at is not null and p_verified_at<purchase.gateway_updated_at then return purchase.status;end if;
 -- A late failure/pending event cannot undo confirmed money or a refund.
 if purchase.status in ('paid','refunded') and p_state in ('pending','failed','cancelled','expired') then return purchase.status;end if;
 if purchase.status='refunded' and p_state='paid' then return purchase.status;end if;
 new_state:=case when p_state='review' then case when purchase.status='paid' then 'paid' else 'pending' end else p_state end;
 review:=p_state='review' or (purchase.needs_review and p_state<>'refunded');
 update private.coin_purchases set status=new_state,needs_review=review,gateway_payment_id=coalesce(p_payment,gateway_payment_id),gateway_updated_at=p_verified_at,
  verified_at=case when p_state in ('paid','refunded','failed','cancelled','expired') then p_verified_at else verified_at end where id=purchase.id;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('coins:'||purchase.user_id::text,0));
 if new_state='paid' and not review then
  perform private.ensure_welcome_coins(purchase.user_id);
  insert into private.coin_ledger(user_id,delta,kind,coin_purchase_id) values(purchase.user_id,purchase.coins,'purchase',purchase.id) on conflict do nothing;
 elsif new_state='refunded' and exists(select 1 from private.coin_ledger where coin_purchase_id=purchase.id and kind='purchase') then
  balance:=private.coin_balance(purchase.user_id);
  if least(balance,purchase.coins)>0 then
   insert into private.coin_ledger(user_id,delta,kind,coin_purchase_id) values(purchase.user_id,-least(balance,purchase.coins),'admin',purchase.id) on conflict do nothing;
  end if;
  if balance<purchase.coins then update private.coin_purchases set needs_review=true where id=purchase.id;end if;
 end if;
 return new_state;
end;$$;

-- The buyer's own view on return from checkout.
create function public.my_coin_purchase(p_purchase uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 return (select jsonb_build_object('id',p.id,'coins',p.coins,'amountMinor',p.amount_minor,'status',case when p.needs_review then 'review' else p.status end,
  'reference',p.reference,'recipient',p.recipient_disclosure,'createdAt',p.created_at,'verifiedAt',p.verified_at,'balance',private.coin_balance(p.user_id))
  from private.coin_purchases p where p.id=p_purchase and p.user_id=auth.uid());
end;$$;
-- Whether buying is open, and its limits, for the Buy coins page.
create function public.coin_shop() returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg private.bachs_configuration;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 -- Someone who opens Buy coins before Likes still sees their 10 welcome coins.
 if private.likes_on() then perform private.ensure_welcome_coins(auth.uid());end if;
 select * into cfg from private.bachs_configuration where singleton;
 return jsonb_build_object('open',private.likes_on() and cfg.enabled,'recipient',cfg.recipient_name,'environment',cfg.environment,
  'maxCoins',least(1000,coalesce(cfg.maximum_amount_minor,0)/5000),'balance',private.coin_balance(auth.uid()));
end;$$;

revoke all on function public.reserve_coin_purchase(uuid,integer,uuid,text,text),public.bind_coin_checkout(uuid,text,text,timestamptz),public.coin_purchase_for_checkout(text,text,text,text),public.coin_purchase_by_id(uuid,uuid),public.apply_coin_verification(uuid,text,text,text,timestamptz,text,text),public.my_coin_purchase(uuid),public.coin_shop() from public,anon,authenticated;
grant execute on function public.reserve_coin_purchase(uuid,integer,uuid,text,text),public.bind_coin_checkout(uuid,text,text,timestamptz),public.coin_purchase_for_checkout(text,text,text,text),public.coin_purchase_by_id(uuid,uuid),public.apply_coin_verification(uuid,text,text,text,timestamptz,text,text) to service_role;
grant execute on function public.my_coin_purchase(uuid),public.coin_shop() to authenticated;
commit;
