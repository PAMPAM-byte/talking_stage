begin;
-- No hosted retention policy is assumed. Local integration enables this explicitly.
create table private.privacy_configuration (
 singleton boolean primary key default true check(singleton),
 account_deletion_enabled boolean not null default false
);
insert into private.privacy_configuration(singleton) values(true);
alter table private.privacy_configuration enable row level security;
revoke all on private.privacy_configuration from public,anon,authenticated,service_role;

create function public.account_deletion_status() returns boolean
language sql stable security definer set search_path='' as $$
 select public.has_adult_access() and coalesce((select account_deletion_enabled from private.privacy_configuration where singleton),false)
$$;

create function public.delete_own_account(p_confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); issued bigint;
begin
 if actor is null or not public.has_adult_access() then raise exception 'forbidden'; end if;
 if not public.account_deletion_status() then raise exception 'deletion_unavailable'; end if;
 if p_confirmation is distinct from 'DELETE' then raise exception 'confirmation_required'; end if;
 issued:=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'iat')::bigint;
 if issued is null or issued<extract(epoch from now())-300 or issued>extract(epoch from now())+60 then raise exception 'reauth_required'; end if;
 -- Freeze the owner and all owned threads before changing data. Reply/summary
 -- commits also lock threads, so a late completion cannot recreate removed rows.
 perform 1 from auth.users where id=actor for update;
 perform 1 from public.profiles where id=actor for update;
 if not found then raise exception 'forbidden'; end if;
 if public.is_admin() or exists(select 1 from public.character_assets where reviewed_by=actor)
 or exists(select 1 from private.direction_history where published_by=actor)
 or exists(select 1 from private.report_resolutions where actor_id=actor) then raise exception 'operator_account'; end if;
 perform id from public.conversations where user_id=actor order by id for update;
 if exists(select 1 from public.payment_intents where user_id=actor) then raise exception 'financial_records'; end if;

 delete from private.summary_reservations where actor_id=actor;
 delete from private.ai_reservations where actor_id=actor;
 delete from private.conversation_summaries where conversation_id in(select id from public.conversations where user_id=actor);
 delete from private.reply_jobs where conversation_id in(select id from public.conversations where user_id=actor);
 delete from public.memories where user_id=actor;
 delete from public.memory_preferences where user_id=actor;
 -- Reporter-owned evidence and notes are erased, including snapshots of messages
 -- that previously survived reset/delete. Audit keeps no report or actor link.
 update private.admin_audit set target_id=null where target_kind='report' and target_id in(select id from public.reports where reporter_id=actor);
 delete from private.report_resolutions where report_id in(select id from public.reports where reporter_id=actor);
 delete from public.reports where reporter_id=actor;
 delete from public.messages where conversation_id in(select id from public.conversations where user_id=actor);
 delete from public.conversations where user_id=actor;
 delete from private.ai_daily_usage where scope=actor::text;
 update private.admin_audit set actor_id=null where actor_id=actor;
 -- Auth cascades revoke sessions/identities and remove the profile and limits.
 -- Shared cast images and anonymous project spending totals are unaffected.
 delete from auth.users where id=actor;
end;
$$;
revoke all on function public.account_deletion_status(),public.delete_own_account(text) from public,anon,service_role;
grant execute on function public.account_deletion_status(),public.delete_own_account(text) to authenticated;
commit;
