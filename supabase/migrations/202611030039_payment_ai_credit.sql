begin;

-- Founder decision, 3 November 2026: a confirmed live payment raises that person's AI
-- limit for the same UTC day by $0.40 per ₦1,000 (4 micro-USD per kobo), roughly 16
-- replies per ₦1,000. The credit lowers the personal usage row, so every existing
-- claim's limit check honours it unchanged. The site-wide limit is never credited.
create table private.ai_payment_credits (
 intent_id uuid primary key references public.payment_intents(id) on delete cascade,
 user_id uuid not null, day date not null,
 amount_micro_usd bigint not null check(amount_micro_usd>0),
 created_at timestamptz not null default now()
);
alter table private.ai_payment_credits enable row level security;
revoke all on private.ai_payment_credits from public,anon,authenticated,service_role;

create function private.credit_paid_ai_allowance() returns trigger
language plpgsql security definer set search_path='' as $$
declare credit bigint:=new.amount_minor*4;usage_day date:=(now() at time zone 'UTC')::date;granted uuid;
begin
 if new.status<>'paid' or old.status='paid' or new.needs_review or new.gateway_environment is distinct from 'production' then return new;end if;
 -- Once per intent, even if a payment later leaves and re-enters paid.
 insert into private.ai_payment_credits(intent_id,user_id,day,amount_micro_usd) values(new.id,new.user_id,usage_day,credit)
 on conflict do nothing returning intent_id into granted;
 if granted is null then return new;end if;
 -- Same lock as claims and settlement, so a concurrent reservation cannot race the credit.
 perform pg_catalog.pg_advisory_xact_lock(781046211);
 insert into private.ai_daily_usage as u(day,scope,amount_micro_usd) values(usage_day,new.user_id::text,-credit)
 on conflict(day,scope) do update set amount_micro_usd=u.amount_micro_usd-credit;
 return new;
end;$$;
revoke all on function private.credit_paid_ai_allowance() from public,anon,authenticated,service_role;
create trigger credit_paid_ai_allowance after update of status on public.payment_intents
 for each row execute function private.credit_paid_ai_allowance();

-- A personal row may sit below zero only by that day's paid credit; the site row still floors at zero.
create or replace function public.settle_ai_usage(p_lease uuid,p_actor uuid,p_input bigint,p_cache_write bigint,p_cache_read bigint,p_output bigint) returns text
language plpgsql security definer set search_path='' as $$
declare cfg private.ai_configuration;reserved bigint;reserved_day date;actual bigint;refund bigint;
begin
 if p_lease is null or p_actor is null or least(p_input,p_cache_write,p_cache_read,p_output) is null or least(p_input,p_cache_write,p_cache_read,p_output)<0
 then return 'unavailable';end if;
 perform pg_catalog.pg_advisory_xact_lock(781046211);
 select amount_micro_usd,(reserved_at at time zone 'UTC')::date into reserved,reserved_day from private.ai_reservations
 where lease=p_lease and actor_id=p_actor and settled_micro_usd is null for update;
 if not found then
  select amount_micro_usd,(reserved_at at time zone 'UTC')::date into reserved,reserved_day from private.summary_reservations
  where lease=p_lease and actor_id=p_actor and settled_micro_usd is null for update;
  if not found then return 'unavailable';end if;
 end if;
 select * into cfg from private.ai_configuration where singleton;
 -- 5-minute cache writes cost 1.25x input and cache reads 0.1x on the supported Claude models.
 actual:=least(reserved,ceil((p_input::numeric*cfg.input_micro_usd_per_million+p_cache_write::numeric*cfg.input_micro_usd_per_million*1.25
  +p_cache_read::numeric*cfg.input_micro_usd_per_million*0.1+p_output::numeric*cfg.output_micro_usd_per_million)/1000000)::bigint);
 refund:=reserved-actual;
 -- Same UTC day and scopes the claim incremented.
 update private.ai_daily_usage set amount_micro_usd=greatest(amount_micro_usd-refund,case when scope='project' then 0
  else -coalesce((select sum(k.amount_micro_usd) from private.ai_payment_credits k where k.user_id=p_actor and k.day=reserved_day),0) end)
 where day=reserved_day and scope in ('project',p_actor::text);
 update private.ai_reservations set settled_micro_usd=actual where lease=p_lease;
 update private.summary_reservations set settled_micro_usd=actual where lease=p_lease;
 return 'settled';
end $$;
revoke all on function public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint) from public,anon,authenticated;
grant execute on function public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint) to service_role;

commit;
