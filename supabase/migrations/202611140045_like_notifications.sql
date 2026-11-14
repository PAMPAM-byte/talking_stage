-- Like-back notifications (founder request, 14 November 2026): in-app badge and popup, plus
-- browser push on the lock screen. Founder decision: show the character's name by default
-- ("Usman liked you back"), with a Settings switch for a private version. Every half hour
-- pg_cron asks the site to send pushes for likes back that have just become visible. Each like
-- is claimed once before sending, so nobody gets the same notification twice.
begin;

create table private.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(endpoint ~ '^https://' and length(endpoint)<=1000),
 p256dh text not null check(length(p256dh) between 20 and 200),
 auth text not null check(length(auth) between 8 and 100),
 created_at timestamptz not null default now(),
 last_sent_at timestamptz
);
create index push_subscriptions_user on private.push_subscriptions(user_id);
create table private.notification_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 show_names boolean not null default true,
 updated_at timestamptz not null default now()
);
-- Set by the activation script, never by hand: pg_cron calls the site's sender with this shared
-- secret, and the sender signs pushes with these VAPID keys. Readable only by the service role.
create table private.notification_dispatch (
 singleton boolean primary key default true check(singleton),
 url text, secret text, vapid_public text, vapid_private text,
 last_run_at timestamptz, last_sent integer
);
insert into private.notification_dispatch(singleton) values(true);
alter table private.character_likes add column notified_at timestamptz;
create index character_likes_unnotified on private.character_likes(show_at) where outcome='match' and notified_at is null;

alter table private.push_subscriptions enable row level security;
alter table private.notification_settings enable row level security;
alter table private.notification_dispatch enable row level security;
revoke all on private.push_subscriptions,private.notification_settings,private.notification_dispatch from public,anon,authenticated,service_role;

create function public.save_push_subscription(p_endpoint text,p_p256dh text,p_auth text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if (select count(*) from private.push_subscriptions where user_id=auth.uid())>=10 then
  delete from private.push_subscriptions where id=(select id from private.push_subscriptions where user_id=auth.uid() order by created_at limit 1);
 end if;
 -- One browser belongs to whoever signed in on it last.
 insert into private.push_subscriptions(user_id,endpoint,p256dh,auth) values(auth.uid(),p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,created_at=now();
end; $$;
create function public.delete_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 delete from private.push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint;
end; $$;
create function public.notification_preferences() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 return jsonb_build_object('showNames',coalesce((select show_names from private.notification_settings where user_id=auth.uid()),true),
  'devices',(select count(*) from private.push_subscriptions where user_id=auth.uid()));
end; $$;
create function public.save_notification_preferences(p_show_names boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if p_show_names is null then raise exception 'invalid'; end if;
 insert into private.notification_settings(user_id,show_names) values(auth.uid(),p_show_names)
 on conflict(user_id) do update set show_names=excluded.show_names,updated_at=now();
end; $$;

-- In-app: new likes back, newest first, for the Likes badge and the popup.
create function public.likes_pulse() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_adult_access() or not private.likes_on() then return jsonb_build_object('newCount',0,'latest',null); end if;
 return (select jsonb_build_object('newCount',count(*),'latest',(array_agg(jsonb_build_object('characterId',ch.id,'name',ch.name,'at',l.show_at) order by l.show_at desc,ch.id))[1])
  from private.character_likes l join public.characters ch on ch.id=l.character_id and ch.status='published'
  where l.user_id=auth.uid() and l.outcome='match' and l.show_at<=now() and l.seen_at is null);
end; $$;

-- Sender (service role only): claim likes back that just became visible, at most once each.
-- Older than a day are marked without sending, so turning push on never replays old news.
create function public.claim_like_notifications(p_limit integer default 500) returns jsonb
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
 update private.notification_dispatch set last_run_at=now(),last_sent=jsonb_array_length(claimed);
 return claimed;
end; $$;
create function public.forget_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path='' as $$
begin
 delete from private.push_subscriptions where endpoint=p_endpoint;
end; $$;
-- Service role only (see grants): the signing keys, but only to a caller holding the cron secret.
create function public.dispatch_config(p_secret text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('publicKey',vapid_public,'privateKey',vapid_private) from private.notification_dispatch
 where secret is not null and length(secret)>=32 and secret=p_secret and vapid_private is not null
$$;
create function public.push_public_key() returns text
language sql stable security definer set search_path='' as $$
 select vapid_public from private.notification_dispatch where public.has_adult_access()
$$;

revoke all on function public.save_push_subscription(text,text,text),public.delete_push_subscription(text),public.notification_preferences(),public.save_notification_preferences(boolean),public.likes_pulse(),public.push_public_key(),public.claim_like_notifications(integer),public.forget_push_subscription(text),public.dispatch_config(text) from public,anon;
grant execute on function public.save_push_subscription(text,text,text),public.delete_push_subscription(text),public.notification_preferences(),public.save_notification_preferences(boolean),public.likes_pulse(),public.push_public_key() to authenticated;
-- Sender functions: service role only; no user can claim notifications or read the keys.
revoke all on function public.claim_like_notifications(integer),public.forget_push_subscription(text),public.dispatch_config(text) from authenticated;
grant execute on function public.claim_like_notifications(integer),public.forget_push_subscription(text),public.dispatch_config(text) to service_role;
create function private.dispatch_like_notifications() returns void
language plpgsql security definer set search_path='' as $$
declare d private.notification_dispatch;
begin
 select * into d from private.notification_dispatch where singleton;
 if d.url is null or d.secret is null then return; end if;
 if not exists(select 1 from private.character_likes where outcome='match' and notified_at is null and show_at<=now()) then return; end if;
 perform net.http_post(url:=d.url,headers:=jsonb_build_object('content-type','application/json','x-talkingstage-dispatch',d.secret),body:='{}'::jsonb,timeout_milliseconds:=55000);
end; $$;
revoke all on function private.dispatch_like_notifications() from public,anon,authenticated;
commit;
