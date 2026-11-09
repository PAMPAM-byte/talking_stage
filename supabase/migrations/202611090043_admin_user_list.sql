begin;

-- Founder feedback, 9 November 2026: the People page should open on everyone, not a blank
-- search. One row per account, most recently active first, filtered by "limit reached today"
-- or "paid". Figures only; no message text. Each view is logged once, without a target.
create function public.admin_user_list(p_filter text default 'all',p_page integer default 1) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare cfg private.ai_configuration;cost bigint;per_page constant integer:=50;
 utc_day date:=(now() at time zone 'UTC')::date;
 today timestamptz:=(date_trunc('day',now() at time zone 'Africa/Lagos')) at time zone 'Africa/Lagos';
 result jsonb;
begin
 perform private.require_cast_admin();
 if p_filter not in ('all','limit','paid') or p_page is null or p_page<1 or p_page>1000 then raise exception 'invalid_filter';end if;
 select * into cfg from private.ai_configuration where singleton;
 -- Same worst case as the reply claim: below this, the next reply is refused.
 cost:=ceil((cfg.max_input_tokens::numeric*cfg.input_micro_usd_per_million+cfg.max_output_tokens::numeric*cfg.output_micro_usd_per_million)/1000000)::bigint;
 with usage as (select d.scope,d.amount_micro_usd as usage from private.ai_daily_usage d where d.day=utc_day),
 credits as (select k.user_id,sum(k.amount_micro_usd) as credit from private.ai_payment_credits k where k.day=utc_day group by k.user_id),
 paid as (select i.user_id,sum(i.amount_minor) as paid_minor,count(*) as payments from public.payment_intents i
   where i.gateway_environment='production' and i.status='paid' and not i.needs_review group by i.user_id),
 sent as (select c.user_id,count(*) as messages,count(*) filter(where m.created_at>=today) as today,max(m.created_at) as last_at
   from public.messages m join public.conversations c on c.id=m.conversation_id where m.role='user' group by c.user_id),
 people as (select u.id,u.email,p.display_name,p.created_at,u.banned_until,p.deletion_scheduled_for,p.onboarding_complete,
   exists(select 1 from private.user_roles r where r.user_id=u.id and r.role='admin') as is_admin,
   coalesce(us.usage,0)+coalesce(cr.credit,0) as used,cfg.user_daily_micro_usd+coalesce(cr.credit,0) as lim,
   coalesce(us.usage,0)+cost>cfg.user_daily_micro_usd as at_limit,
   coalesce(pd.paid_minor,0) as paid_minor,coalesce(pd.payments,0) as payments,
   coalesce(s.messages,0) as messages,coalesce(s.today,0) as today,s.last_at
  from auth.users u join public.profiles p on p.id=u.id
  left join usage us on us.scope=u.id::text left join credits cr on cr.user_id=u.id
  left join paid pd on pd.user_id=u.id left join sent s on s.user_id=u.id),
 picked as (select * from people where p_filter='all' or (p_filter='limit' and at_limit) or (p_filter='paid' and payments>0))
 select jsonb_build_object(
  'counts',jsonb_build_object('all',(select count(*) from people),'limit',(select count(*) from people where at_limit),'paid',(select count(*) from people where payments>0)),
  'total',(select count(*) from picked),'page',p_page,'perPage',per_page,
  'baseLimitMicroUsd',cfg.user_daily_micro_usd,
  'users',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'email',x.email,'name',x.display_name,'joinedAt',x.created_at,
    'isAdmin',x.is_admin,'onboardingComplete',x.onboarding_complete,'banned',coalesce(x.banned_until>now(),false),'deletionScheduled',x.deletion_scheduled_for is not null,
    'usedMicroUsd',x.used,'limitMicroUsd',x.lim,'atLimit',x.at_limit,'paidMinor',x.paid_minor,'payments',x.payments,
    'messagesSent',x.messages,'messagesToday',x.today,'lastMessageAt',x.last_at) order by x.ord)
   from (select picked.*,row_number() over(order by last_at desc nulls last,created_at desc,id) as ord from picked
    order by last_at desc nulls last,created_at desc,id offset (p_page-1)*per_page limit per_page) x),'[]'::jsonb),
  'checkedAt',now()) into result;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome) values(auth.uid(),'user.list','user',null,'succeeded');
 return result;
end;$$;
revoke all on function public.admin_user_list(text,integer) from public,anon;
grant execute on function public.admin_user_list(text,integer) to authenticated;

commit;
