begin;

-- Founder request, 3 November 2026: which characters people chat with most. Counts only.
-- people: distinct users who have sent the character at least one message (all time).
-- thisWeek: distinct users who messaged the character in the last 7 days.
-- messages: messages users have sent the character (all time).
create function public.admin_character_popularity() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_cast_admin();
 return coalesce((select jsonb_agg(jsonb_build_object('id',ch.id,'name',ch.name,'gender',ch.gender,'status',ch.status,
   'people',coalesce(s.people,0),'thisWeek',coalesce(s.this_week,0),'messages',coalesce(s.messages,0),'minutesSinceLast',floor(extract(epoch from now()-s.last_at)/60)::integer)
   order by coalesce(s.this_week,0) desc,coalesce(s.people,0) desc,coalesce(s.messages,0) desc,ch.name)
  from public.characters ch
  left join (select c.character_id,count(distinct c.user_id) people,count(distinct c.user_id) filter(where m.created_at>=now()-interval '7 days') this_week,
              count(*) messages,max(m.created_at) last_at
             from public.messages m join public.conversations c on c.id=m.conversation_id
             where m.role='user' group by c.character_id) s on s.character_id=ch.id
  where ch.status='published'),'[]'::jsonb);
end;$$;
revoke all on function public.admin_character_popularity() from public,anon;
grant execute on function public.admin_character_popularity() to authenticated;

commit;
