begin;
create schema privacy_guard;
revoke all on schema privacy_guard from public,anon,authenticated,service_role;
create table privacy_guard.account_erasures(actor_id uuid primary key,deleted_at timestamptz not null default now());
alter table privacy_guard.account_erasures enable row level security;
revoke all on privacy_guard.account_erasures from public,anon,authenticated,service_role;
-- Keep the guard outside the auth/public/private schemas used by data backups.
alter function public.delete_own_account(text) rename to delete_account_before_guard;
alter function public.delete_account_before_guard(text) set schema private;
revoke all on function private.delete_account_before_guard(text) from public,anon,authenticated,service_role;
create function public.delete_own_account(p_confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 perform private.delete_account_before_guard(p_confirmation);
 insert into privacy_guard.account_erasures(actor_id) values(actor) on conflict(actor_id) do nothing;
end;$$;
revoke all on function public.delete_own_account(text) from public,anon,service_role;
grant execute on function public.delete_own_account(text) to authenticated;
-- Database owner only. Called in a fresh isolated restore database, never exposed
-- to browser clients, and applies the same financial/operator protections.
create function private.erase_restored_account(p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 -- Freeze the owner and all owned threads before changing data. Reply/summary
 -- commits also lock threads, so a late completion cannot recreate removed rows.
 perform 1 from auth.users where id=p_actor for update;
 perform 1 from public.profiles where id=p_actor for update;
 if not found then return; end if;
 if exists(select 1 from private.user_roles where user_id=p_actor) or exists(select 1 from public.character_assets where reviewed_by=p_actor)
 or exists(select 1 from private.direction_history where published_by=p_actor)
 or exists(select 1 from private.report_resolutions where actor_id=p_actor) then raise exception 'operator_account'; end if;
 perform id from public.conversations where user_id=p_actor order by id for update;
 if exists(select 1 from public.payment_intents where user_id=p_actor) then raise exception 'financial_records'; end if;

 delete from private.summary_reservations where actor_id=p_actor;
 delete from private.ai_reservations where actor_id=p_actor;
 delete from private.conversation_summaries where conversation_id in(select id from public.conversations where user_id=p_actor);
 delete from private.reply_jobs where conversation_id in(select id from public.conversations where user_id=p_actor);
 delete from public.memories where user_id=p_actor;
 delete from public.memory_preferences where user_id=p_actor;
 -- Reporter-owned evidence and notes are erased, including snapshots of messages
 -- that previously survived reset/delete. Audit keeps no report or p_actor link.
 update private.admin_audit set target_id=null where target_kind='report' and target_id in(select id from public.reports where reporter_id=p_actor);
 delete from private.report_resolutions where report_id in(select id from public.reports where reporter_id=p_actor);
 delete from public.reports where reporter_id=p_actor;
 delete from public.messages where conversation_id in(select id from public.conversations where user_id=p_actor);
 delete from public.conversations where user_id=p_actor;
 delete from private.ai_daily_usage where scope=p_actor::text;
 update private.admin_audit set actor_id=null where actor_id=p_actor;
 -- Auth cascades revoke sessions/identities and remove the profile and limits.
 -- Shared cast images and anonymous project spending totals are unaffected.
 delete from auth.users where id=p_actor;
end;$$;
revoke all on function private.erase_restored_account(uuid) from public,anon,authenticated,service_role;
create function public.erasure_manifest() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('actorId',actor_id,'deletedAt',deleted_at) order by actor_id),'[]'::jsonb) from privacy_guard.account_erasures
$$;
revoke all on function public.erasure_manifest() from public,anon,authenticated;
grant execute on function public.erasure_manifest() to service_role;
commit;
