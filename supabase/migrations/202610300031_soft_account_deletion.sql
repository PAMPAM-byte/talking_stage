begin;
-- Founder decision (30 Oct): deleting an account schedules it. The account is
-- frozen and signed out for 30 days; signing in within that time can restore
-- it. After 30 days it is erased. Accounts with payment records can delete too:
-- their payment records are kept for accounting, without the account.
alter table public.profiles add column deletion_scheduled_for timestamptz;

-- A scheduled account keeps no app access: every adult-gated read and action stops.
create or replace function public.has_adult_access() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and onboarding_complete and adult_declared_at is not null and deletion_scheduled_for is null);
$$;

-- Payment records outlive the account: ownership is checked when a record is
-- written, not kept as a constraint that would block erasing the conversation.
do $$
declare constraint_name text;
begin
 select c.conname into constraint_name from pg_constraint c
 where c.conrelid='public.payment_intents'::regclass and c.contype='f' and c.confrelid='public.conversations'::regclass;
 if constraint_name is not null then execute format('alter table public.payment_intents drop constraint %I',constraint_name);end if;
end$$;
create function private.check_payment_conversation() returns trigger
language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.conversations where id=new.conversation_id and user_id=new.user_id and character_id=new.character_id) then
  raise exception 'payment_conversation_mismatch' using errcode='23503';end if;
 return new;
end;$$;
revoke all on function private.check_payment_conversation() from public,anon,authenticated,service_role;
create trigger check_payment_conversation before insert or update of conversation_id,user_id,character_id on public.payment_intents
 for each row execute function private.check_payment_conversation();

create function public.request_account_deletion(p_confirmation text) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); issued bigint; scheduled timestamptz:=now()+interval '30 days';
begin
 if actor is null or not public.has_adult_access() then raise exception 'forbidden'; end if;
 if not public.account_deletion_status() then raise exception 'deletion_unavailable'; end if;
 if p_confirmation is distinct from 'DELETE' then raise exception 'confirmation_required'; end if;
 issued:=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'iat')::bigint;
 if issued is null or issued<extract(epoch from now())-300 or issued>extract(epoch from now())+60 then raise exception 'reauth_required'; end if;
 perform 1 from public.profiles where id=actor for update;
 if public.is_admin() or exists(select 1 from public.character_assets where reviewed_by=actor)
 or exists(select 1 from private.direction_history where published_by=actor)
 or exists(select 1 from private.report_resolutions where actor_id=actor) then raise exception 'operator_account'; end if;
 update public.profiles set deletion_scheduled_for=scheduled where id=actor;
 return scheduled;
end;$$;

-- Restoring needs only the signed-in owner, since adult access is frozen while scheduled.
create function public.restore_account() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'forbidden'; end if;
 update public.profiles set deletion_scheduled_for=null where id=auth.uid() and deletion_scheduled_for>now();
 if not found then raise exception 'not_scheduled'; end if;
end;$$;
revoke all on function public.request_account_deletion(text),public.restore_account() from public,anon,service_role;
grant execute on function public.request_account_deletion(text),public.restore_account() to authenticated;

-- The same erasure as delete_own_account, run by the scheduler for one account.
-- Payment records keep their reference and amount; everything personal goes.
create function private.erase_account(p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from auth.users where id=p_actor for update;
 perform 1 from public.profiles where id=p_actor and deletion_scheduled_for<=now() for update;
 if not found then return; end if;
 if exists(select 1 from private.user_roles where user_id=p_actor) or exists(select 1 from public.character_assets where reviewed_by=p_actor)
 or exists(select 1 from private.direction_history where published_by=p_actor)
 or exists(select 1 from private.report_resolutions where actor_id=p_actor) then raise exception 'operator_account'; end if;
 perform id from public.conversations where user_id=p_actor order by id for update;
 delete from private.summary_reservations where actor_id=p_actor;
 delete from private.ai_reservations where actor_id=p_actor;
 delete from private.conversation_summaries where conversation_id in(select id from public.conversations where user_id=p_actor);
 delete from private.reply_jobs where conversation_id in(select id from public.conversations where user_id=p_actor);
 delete from public.memories where user_id=p_actor;
 delete from public.memory_preferences where user_id=p_actor;
 update private.admin_audit set target_id=null where target_kind='report' and target_id in(select id from public.reports where reporter_id=p_actor);
 delete from private.report_resolutions where report_id in(select id from public.reports where reporter_id=p_actor);
 delete from public.reports where reporter_id=p_actor;
 delete from public.messages where conversation_id in(select id from public.conversations where user_id=p_actor);
 delete from public.conversations where user_id=p_actor;
 delete from private.ai_daily_usage where scope=p_actor::text;
 update private.admin_audit set actor_id=null where actor_id=p_actor;
 insert into privacy_guard.account_erasures(actor_id) values(p_actor) on conflict(actor_id) do nothing;
 delete from auth.users where id=p_actor;
end;$$;
revoke all on function private.erase_account(uuid) from public,anon,authenticated,service_role;

-- Erases every account whose 30 days have passed. One failure does not stop the rest.
create function public.erase_due_accounts() returns integer
language plpgsql security definer set search_path='' as $$
declare due uuid; erased integer:=0;
begin
 for due in select id from public.profiles where deletion_scheduled_for<=now() order by deletion_scheduled_for loop
  begin perform private.erase_account(due); erased:=erased+1;
  exception when others then raise warning 'account erasure deferred: %', sqlerrm;
  end;
 end loop;
 return erased;
end;$$;
revoke all on function public.erase_due_accounts() from public,anon,authenticated;
grant execute on function public.erase_due_accounts() to service_role;

update private.privacy_configuration set account_deletion_enabled=true;

-- Run the erasure daily where pg_cron is available (hosted Supabase); local test databases skip it.
do $$
begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('erase-deleted-accounts','23 2 * * *','select public.erase_due_accounts()');
 end if;
end$$;
commit;
