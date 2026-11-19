-- Likes are answered straight away (founder request, 19 November 2026). This replaces the half-hourly
-- answer from 14 November: each character still decides with their own pickiness, and everyone's first
-- like is still a like back, but a like back now shows the moment someone taps Like. A character who
-- doesn't like someone back is still never announced; the like simply reads as sent. Likes still waiting
-- for their half hour are shown now, and the existing :00/:30 push run tells those people.
begin;

create or replace function private.like_show_at(p_liked timestamptz) returns timestamptz language sql immutable set search_path='' as $$
 select p_liked
$$;

create or replace function public.like_character(p_character uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); existing private.character_likes; roll numeric; liked_back boolean;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if not private.likes_on() then raise exception 'likes_off'; end if;
 if not exists(select 1 from public.characters where id=p_character and status='published') then raise exception 'not_found'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('likes:'||uid::text,0));
 select * into existing from private.character_likes where user_id=uid and character_id=p_character;
 if found then
  -- A "no" may be tried again a week later; until then it reads as sent.
  if existing.outcome='no' and existing.show_at<now()-interval '7 days' then
   delete from private.character_likes where user_id=uid and character_id=p_character;
  else
   return jsonb_build_object('status',case when existing.outcome='match' and existing.show_at<=now() then 'match' else 'pending' end);
  end if;
 end if;
 if (select count(*) from private.character_likes where user_id=uid and liked_at>now()-interval '1 day')>=300 then raise exception 'rate_limited'; end if;
 roll:=(((pg_catalog.hashtextextended(uid::text||':'||p_character::text||':'||current_date::text,0)%1000)+1000)%1000)/1000.0;
 -- Everyone's first like is answered with a like back, so a new person never hears nothing.
 liked_back:=not exists(select 1 from private.character_likes where user_id=uid and outcome='match') or roll<private.like_back_rate(p_character);
 -- Shown on screen at once, so no push notification follows.
 insert into private.character_likes(user_id,character_id,show_at,outcome,notified_at)
 values(uid,p_character,now(),case when liked_back then 'match' else 'no' end,case when liked_back then now() end);
 return jsonb_build_object('status',case when liked_back then 'match' else 'pending' end);
end; $$;

update private.character_likes set show_at=now() where show_at>now();
commit;
