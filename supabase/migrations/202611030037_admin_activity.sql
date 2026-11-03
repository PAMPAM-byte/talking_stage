begin;

-- Founder request, 3 November 2026: users and activity on the admin Operations screen.
-- Counts only; no names, emails or message text. "Today" is the Lagos calendar day.
-- Active now = people who sent a message in the last 10 minutes.
create index if not exists messages_user_recent on public.messages(created_at desc) where role='user';

create function public.admin_activity_stats() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare today timestamptz:=(date_trunc('day',now() at time zone 'Africa/Lagos')) at time zone 'Africa/Lagos';
begin
 perform private.require_cast_admin();
 return jsonb_build_object(
  'users',(select count(*) from public.profiles where adult_declared_at is not null and deletion_scheduled_for is null),
  'newToday',(select count(*) from public.profiles where adult_declared_at is not null and deletion_scheduled_for is null and created_at>=today),
  'activeNow',(select count(distinct c.user_id) from public.messages m join public.conversations c on c.id=m.conversation_id
    where m.role='user' and m.created_at>=now()-interval '10 minutes'),
  'activeToday',(select count(distinct c.user_id) from public.messages m join public.conversations c on c.id=m.conversation_id
    where m.role='user' and m.created_at>=today),
  'messagesSent',(select count(*) from public.messages where role='user'),
  'messagesToday',(select count(*) from public.messages where role='user' and created_at>=today),
  'characterReplies',(select count(*) from public.messages where role='character'),
  'checkedAt',now());
end;$$;
revoke all on function public.admin_activity_stats() from public,anon;
grant execute on function public.admin_activity_stats() to authenticated;

commit;
