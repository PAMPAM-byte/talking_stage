begin;
-- F14: claims still reserve the worst case so concurrent calls cannot overspend;
-- after the provider responds, the unused part of the reservation is refunded.
alter table private.ai_reservations add column settled_micro_usd bigint check(settled_micro_usd>=0);
alter table private.summary_reservations add column settled_micro_usd bigint check(settled_micro_usd>=0);
create function public.settle_ai_usage(p_lease uuid,p_actor uuid,p_input bigint,p_cache_write bigint,p_cache_read bigint,p_output bigint) returns text
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
 update private.ai_daily_usage set amount_micro_usd=greatest(amount_micro_usd-refund,0)
 where day=reserved_day and scope in ('project',p_actor::text);
 update private.ai_reservations set settled_micro_usd=actual where lease=p_lease;
 update private.summary_reservations set settled_micro_usd=actual where lease=p_lease;
 return 'settled';
end $$;
revoke all on function public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint) from public,anon,authenticated;
grant execute on function public.settle_ai_usage(uuid,uuid,bigint,bigint,bigint,bigint) to service_role;
-- Aggregate spend only: no actor, conversation or message identifiers.
create function public.admin_ai_spend() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cfg private.ai_configuration;
begin
 perform private.require_cast_admin();
 select * into cfg from private.ai_configuration where singleton;
 return jsonb_build_object('model',cfg.model,'enabled',cfg.enabled,'projectDailyMicroUsd',cfg.project_daily_micro_usd,'userDailyMicroUsd',cfg.user_daily_micro_usd,
 'days',coalesce((select jsonb_agg(jsonb_build_object('day',d.day,'charged',coalesce(u.amount_micro_usd,0),'reserved',d.reserved,'settled',d.settled,'calls',d.calls,'unsettled',d.unsettled) order by d.day desc)
 from (select (r.reserved_at at time zone 'UTC')::date as day,sum(r.amount_micro_usd) as reserved,coalesce(sum(r.settled_micro_usd),0) as settled,
  count(*) as calls,count(*) filter(where r.settled_micro_usd is null) as unsettled
  from (select reserved_at,amount_micro_usd,settled_micro_usd from private.ai_reservations
   union all select reserved_at,amount_micro_usd,settled_micro_usd from private.summary_reservations) r
  where r.reserved_at>=now()-interval '14 days' group by 1) d
 left join private.ai_daily_usage u on u.day=d.day and u.scope='project'),'[]'::jsonb));
end $$;
revoke all on function public.admin_ai_spend() from public,anon;
grant execute on function public.admin_ai_spend() to authenticated;
commit;
