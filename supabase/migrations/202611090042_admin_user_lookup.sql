begin;

-- Founder request, 9 November 2026: look up one person on the admin Operations screen
-- (spend, daily limit, payments, activity) without asking for a database query.
-- Search by email, name or account ID; at most 5 matches. No message text is returned.
-- Every lookup is written to the administrator activity log, without the search text.
create function public.admin_user_lookup(p_query text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare q text:=lower(trim(coalesce(p_query,'')));
 pattern text;cfg private.ai_configuration;cost bigint;
 utc_day date:=(now() at time zone 'UTC')::date;
 today timestamptz:=(date_trunc('day',now() at time zone 'Africa/Lagos')) at time zone 'Africa/Lagos';
 found_ids uuid[];result jsonb;
begin
 perform private.require_cast_admin();
 if char_length(q)<3 or char_length(q)>254 then raise exception 'query_length';end if;
 pattern:='%'||replace(replace(replace(q,'\','\\'),'%','\%'),'_','\_')||'%';
 select * into cfg from private.ai_configuration where singleton;
 -- The same worst case the reply claim reserves: below this, the next reply is refused.
 cost:=ceil((cfg.max_input_tokens::numeric*cfg.input_micro_usd_per_million+cfg.max_output_tokens::numeric*cfg.output_micro_usd_per_million)/1000000)::bigint;
 select coalesce(array_agg(m.id order by m.exact desc,m.last_sign_in_at desc nulls last),'{}') into found_ids from (
  select u.id,(lower(u.email)=q or u.id::text=q) as exact,u.last_sign_in_at from auth.users u join public.profiles p on p.id=u.id
  where lower(u.email)=q or u.id::text=q or lower(u.email) like pattern or lower(p.display_name) like pattern
  order by 2 desc,3 desc nulls last limit 5) m;
 select coalesce(jsonb_agg(x.v order by array_position(found_ids,x.id)),'[]'::jsonb) into result from (
  select u.id,jsonb_build_object(
   'id',u.id,'email',u.email,'name',p.display_name,'joinedAt',p.created_at,'lastSignInAt',u.last_sign_in_at,
   'signInMethods',coalesce(u.raw_app_meta_data->'providers','[]'::jsonb),
   'isAdmin',exists(select 1 from private.user_roles r where r.user_id=u.id and r.role='admin'),
   'onboardingComplete',p.onboarding_complete,'bannedUntil',u.banned_until,'deletionScheduledFor',p.deletion_scheduled_for,
   -- AI spend uses the UTC day, matching the limit itself (it resets at 1am in Lagos).
   'ai',(select jsonb_build_object('usedMicroUsd',usage+credit,'limitMicroUsd',cfg.user_daily_micro_usd+credit,'creditMicroUsd',credit,
     'baseLimitMicroUsd',cfg.user_daily_micro_usd,'replyCostMicroUsd',cost,'atLimit',usage+cost>cfg.user_daily_micro_usd,
     'callsToday',(select count(*) from private.ai_reservations a where a.actor_id=u.id and a.reserved_at>=utc_day::timestamp at time zone 'UTC'))
    from (select coalesce((select d.amount_micro_usd from private.ai_daily_usage d where d.day=utc_day and d.scope=u.id::text),0) as usage,
     coalesce((select sum(k.amount_micro_usd) from private.ai_payment_credits k where k.user_id=u.id and k.day=utc_day),0) as credit) s),
   'payments',(select jsonb_build_object('paidMinor',coalesce(sum(i.amount_minor),0),'payments',count(*),'lastPaidAt',max(coalesce(i.verified_at,i.created_at)))
    from public.payment_intents i where i.user_id=u.id and i.gateway_environment='production' and i.status='paid' and not i.needs_review),
   'activity',(select jsonb_build_object('messagesSent',count(*),'messagesToday',count(*) filter(where m.created_at>=today),'lastMessageAt',max(m.created_at),
     'characters',(select count(*) from public.conversations c2 where c2.user_id=u.id))
    from public.messages m join public.conversations c on c.id=m.conversation_id where c.user_id=u.id and m.role='user'),
   'topCharacters',coalesce((select jsonb_agg(t.name order by t.n desc,t.name) from (
     select ch.name,count(*) as n from public.messages m join public.conversations c on c.id=m.conversation_id join public.characters ch on ch.id=c.character_id
     where c.user_id=u.id and m.role='user' group by ch.id,ch.name order by count(*) desc,ch.name limit 3) t),'[]'::jsonb)) as v
  from auth.users u join public.profiles p on p.id=u.id where u.id=any(found_ids)) x;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome)
  select auth.uid(),'user.lookup','user',t.id,'succeeded' from unnest(found_ids) t(id);
 if cardinality(found_ids)=0 then
  insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome) values(auth.uid(),'user.lookup','user',null,'succeeded');
 end if;
 return jsonb_build_object('users',result,'checkedAt',now());
end;$$;
revoke all on function public.admin_user_lookup(text) from public,anon;
grant execute on function public.admin_user_lookup(text) to authenticated;

commit;
