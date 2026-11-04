begin;

-- Founder request, 4 November 2026: money received on the admin Operations screen, so the
-- founder need not open Bachs. Live (production) payments only; sandbox tests are excluded.
-- Received = confirmed paid and not flagged for review. Amounts are gross, before Bachs fees.
-- Totals and per-character sums only; no payer names, emails or message text.
create function public.admin_payment_totals() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare today timestamptz:=(date_trunc('day',now() at time zone 'Africa/Lagos')) at time zone 'Africa/Lagos';
 month timestamptz:=(date_trunc('month',now() at time zone 'Africa/Lagos')) at time zone 'Africa/Lagos';
begin
 perform private.require_cast_admin();
 return (with live as (
   select i.*,coalesce(i.verified_at,i.created_at) as paid_at from public.payment_intents i where i.gateway_environment='production'),
  received as (select * from live where status='paid' and not needs_review)
 select jsonb_build_object(
  'totalMinor',coalesce((select sum(amount_minor) from received),0),
  'payments',(select count(*) from received),
  'payers',(select count(distinct user_id) from received),
  'todayMinor',coalesce((select sum(amount_minor) from received where paid_at>=today),0),
  'todayPayments',(select count(*) from received where paid_at>=today),
  'weekMinor',coalesce((select sum(amount_minor) from received where paid_at>=now()-interval '7 days'),0),
  'monthMinor',coalesce((select sum(amount_minor) from received where paid_at>=month),0),
  'largestMinor',coalesce((select max(amount_minor) from received),0),
  'lastPaidAt',(select max(paid_at) from received),
  'refundedMinor',coalesce((select sum(amount_minor) from live where status in ('refunded','disputed')),0),
  'refunds',(select count(*) from live where status in ('refunded','disputed')),
  'needsReview',(select count(*) from live where status='paid' and needs_review),
  'topCharacters',coalesce((select jsonb_agg(t order by t."amountMinor" desc,t.name) from (
    select ch.name,sum(r.amount_minor) as "amountMinor",count(*) as payments
    from received r join public.characters ch on ch.id=r.character_id group by ch.id,ch.name
    order by sum(r.amount_minor) desc,ch.name limit 5) t),'[]'::jsonb),
  'checkedAt',now()));
end;$$;
revoke all on function public.admin_payment_totals() from public,anon;
grant execute on function public.admin_payment_totals() to authenticated;

commit;
