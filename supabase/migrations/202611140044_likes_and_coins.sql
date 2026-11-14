-- Likes and coins (founder request, 14 November 2026). Founder decisions:
-- * Discover's Meet becomes Like. A character decides when the like is sent, and the answer is
--   shown from the next half hour at least 20 minutes later ("decide now, show later", option C).
--   No scheduled job is needed. A character who doesn't like someone back is never announced.
-- * Everyone gets 10 coins once. Starting a conversation with a character who liked you back
--   uses 1 coin. Carrying on is free, and so is any character you already had a chat with.
-- * Coins are bought at ₦50 each, at least 10 (purchases arrive in a later migration).
--   Gifts are unchanged.
-- Installed switched off: nothing changes for users until private.likes_configuration.enabled.
begin;

create table private.likes_configuration (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into private.likes_configuration(singleton) values(true);

-- outcome 'no' is private: no function ever returns it as a refusal.
create table private.character_likes (
 user_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null references public.characters(id) on delete cascade,
 liked_at timestamptz not null default now(),
 show_at timestamptz not null,
 outcome text not null check(outcome in ('match','no')),
 seen_at timestamptz,
 primary key(user_id,character_id)
);
create index character_likes_revealed on private.character_likes(user_id,show_at) where outcome='match';

-- Append-only coin record; the balance is the sum. Rows are never edited.
create table private.coin_ledger (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 delta integer not null check(delta<>0 and delta between -100000 and 100000),
 kind text not null check(kind in ('welcome','purchase','start','admin')),
 character_id uuid,
 conversation_id uuid,
 payment_intent_id uuid unique,
 actor_id uuid,
 created_at timestamptz not null default now(),
 check(kind<>'start' or (delta=-1 and character_id is not null)),
 check(kind<>'welcome' or delta=10)
);
create unique index one_welcome_grant on private.coin_ledger(user_id) where kind='welcome';
create index coin_ledger_user on private.coin_ledger(user_id,created_at);

alter table private.likes_configuration enable row level security;
alter table private.character_likes enable row level security;
alter table private.coin_ledger enable row level security;
revoke all on private.likes_configuration,private.character_likes,private.coin_ledger from public,anon,authenticated,service_role;

create function private.likes_on() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from private.likes_configuration where singleton),false)
$$;
create function private.ensure_welcome_coins(p_user uuid) returns void language sql security definer set search_path='' as $$
 insert into private.coin_ledger(user_id,delta,kind) values(p_user,10,'welcome') on conflict do nothing
$$;
create function private.coin_balance(p_user uuid) returns integer language sql stable security definer set search_path='' as $$
 select coalesce(sum(delta),0)::integer from private.coin_ledger where user_id=p_user
$$;
-- The first half hour (:00 or :30, UTC) at least 20 minutes after the like.
create function private.like_show_at(p_liked timestamptz) returns timestamptz language sql immutable set search_path='' as $$
 select pg_catalog.to_timestamp(ceil(extract(epoch from p_liked+interval '20 minutes')/1800)*1800)
$$;
-- Each character's own pickiness: likes back between 4 and 8 in 10 people.
create function private.like_back_rate(p_character uuid) returns numeric language sql immutable set search_path='' as $$
 select 0.4+(((pg_catalog.hashtextextended('taste:'||p_character::text,0)%5)+5)%5)/10.0
$$;

create function public.likes_enabled() returns boolean language sql stable security definer set search_path='' as $$
 select public.has_adult_access() and private.likes_on()
$$;

create function public.like_character(p_character uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); existing private.character_likes; roll numeric; liked_back boolean;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if not private.likes_on() then raise exception 'likes_off'; end if;
 if not exists(select 1 from public.characters where id=p_character and status='published') then raise exception 'not_found'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('likes:'||uid::text,0));
 select * into existing from private.character_likes where user_id=uid and character_id=p_character;
 if found then
  -- A "no" may be tried again a week after it would have been shown; until then it reads as waiting.
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
 insert into private.character_likes(user_id,character_id,show_at,outcome) values(uid,p_character,private.like_show_at(now()),case when liked_back then 'match' else 'no' end);
 return jsonb_build_object('status','pending');
end; $$;

create function public.likes_overview() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if not private.likes_on() then return jsonb_build_object('enabled',false); end if;
 perform private.ensure_welcome_coins(uid);
 return jsonb_build_object('enabled',true,'coins',private.coin_balance(uid),
  'newCount',(select count(*) from private.character_likes l join public.characters ch on ch.id=l.character_id and ch.status='published'
    where l.user_id=uid and l.outcome='match' and l.show_at<=now() and l.seen_at is null),
  'matches',coalesce((select jsonb_agg(jsonb_build_object('characterId',ch.id,'name',ch.name,'age',ch.age,'clue',ch.conversation_clue,
     'likedBackAt',l.show_at,'seen',l.seen_at is not null,
     'conversationId',(select c.id from public.conversations c where c.user_id=uid and c.character_id=ch.id and c.deleted_at is null order by c.updated_at desc limit 1))
    order by l.show_at desc,ch.id)
   from private.character_likes l join public.characters ch on ch.id=l.character_id and ch.status='published'
   where l.user_id=uid and l.outcome='match' and l.show_at<=now()),'[]'::jsonb),
  -- Every like still waiting to be shown, plus hidden refusals: both simply read as "liked".
  'liked',coalesce((select jsonb_agg(l.character_id) from private.character_likes l where l.user_id=uid
   and not (l.outcome='match' and l.show_at<=now()) and not (l.outcome='no' and l.show_at<now()-interval '7 days')),'[]'::jsonb));
end; $$;

create function public.mark_likes_seen() returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 update private.character_likes set seen_at=now() where user_id=auth.uid() and outcome='match' and show_at<=now() and seen_at is null;
end; $$;

-- Existing chats, and characters someone already chatted with, never cost a coin.
create or replace function public.start_conversation(p_character uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; uid uuid:=auth.uid(); paid boolean;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||p_character::text,0));
 select id into result from public.conversations where user_id=uid and character_id=p_character and deleted_at is null
 order by case when status='active' then 0 else 1 end,updated_at desc,id limit 1 for update;
 if result is not null then return result; end if;
 if public.effective_capabilities(p_character)->>'chat' is distinct from 'true' then raise exception 'chat_paused'; end if;
 perform private.limit_conversation_mutation();
 paid:=exists(select 1 from public.conversations where user_id=uid and character_id=p_character)
  or exists(select 1 from private.coin_ledger where user_id=uid and character_id=p_character and kind='start');
 if private.likes_on() and not paid then
  if not exists(select 1 from private.character_likes where user_id=uid and character_id=p_character and outcome='match' and show_at<=now()) then raise exception 'not_matched'; end if;
  perform private.ensure_welcome_coins(uid);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('coins:'||uid::text,0));
  if private.coin_balance(uid)<1 then raise exception 'no_coins'; end if;
  insert into public.conversations(user_id,character_id) values(uid,p_character) returning id into result;
  insert into private.coin_ledger(user_id,delta,kind,character_id,conversation_id) values(uid,-1,'start',p_character,result);
  return result;
 end if;
 insert into public.conversations(user_id,character_id) values(uid,p_character) returning id into result;
 return result;
end; $$;

-- Support: give coins back (or correct a balance). Logged in Activity.
create function public.admin_grant_coins(p_user uuid,p_amount integer) returns integer
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_cast_admin();
 if p_amount is null or p_amount=0 or p_amount not between -1000 and 1000 then raise exception 'invalid_amount'; end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'not_found'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('coins:'||p_user::text,0));
 perform private.ensure_welcome_coins(p_user);
 if private.coin_balance(p_user)+p_amount<0 then raise exception 'invalid_amount'; end if;
 insert into private.coin_ledger(user_id,delta,kind,actor_id) values(p_user,p_amount,'admin',auth.uid());
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome) values(auth.uid(),'coins.adjust','user',p_user,'succeeded');
 return private.coin_balance(p_user);
end; $$;

revoke all on function private.likes_on(),private.ensure_welcome_coins(uuid),private.coin_balance(uuid),private.like_show_at(timestamptz),private.like_back_rate(uuid) from public,anon,authenticated;
revoke all on function public.likes_enabled(),public.like_character(uuid),public.likes_overview(),public.mark_likes_seen(),public.admin_grant_coins(uuid,integer) from public,anon;
grant execute on function public.likes_enabled(),public.like_character(uuid),public.likes_overview(),public.mark_likes_seen(),public.admin_grant_coins(uuid,integer) to authenticated;
revoke all on function public.start_conversation(uuid) from public,anon;
grant execute on function public.start_conversation(uuid) to authenticated;
commit;
