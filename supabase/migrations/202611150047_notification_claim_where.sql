-- Fix (15 Nov 2026): the like-back sender failed in production with "UPDATE requires a WHERE
-- clause". Supabase's API sessions load pg_safeupdate, which rejects an UPDATE without WHERE, and
-- the claim recorded its last run on the one-row dispatch table without one. Same function,
-- with `where singleton`. Grants are kept by CREATE OR REPLACE.
begin;
create or replace function public.claim_like_notifications(p_limit integer default 500) returns jsonb
language plpgsql security definer set search_path='' as $$
declare claimed jsonb;
begin
 update private.character_likes set notified_at=now() where outcome='match' and notified_at is null and show_at<now()-interval '1 day';
 with due as (
  select l.user_id,l.character_id from private.character_likes l
  where l.outcome='match' and l.notified_at is null and l.show_at<=now() and private.likes_on()
  order by l.show_at limit greatest(1,least(coalesce(p_limit,500),2000)) for update skip locked
 ), marked as (
  update private.character_likes l set notified_at=now() from due where l.user_id=due.user_id and l.character_id=due.character_id returning l.user_id,l.character_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'characterName',ch.name,
   'showNames',coalesce((select s.show_names from private.notification_settings s where s.user_id=m.user_id),true),
   'subscriptions',(select jsonb_agg(jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth)) from private.push_subscriptions p where p.user_id=m.user_id))),'[]'::jsonb)
 into claimed
 from marked m join public.characters ch on ch.id=m.character_id and ch.status='published'
 where exists(select 1 from private.push_subscriptions p where p.user_id=m.user_id);
 update private.notification_dispatch set last_run_at=now(),last_sent=jsonb_array_length(claimed) where singleton;
 return claimed;
end; $$;
commit;
