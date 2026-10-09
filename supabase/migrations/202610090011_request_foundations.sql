begin;
alter table public.conversations add column requests_muted boolean not null default false;
alter table public.conversations add column requests_refused boolean not null default false;
alter table public.conversations add column last_monetary_request_at timestamptz;
-- Null is undecided, never unlimited. Only trusted operators configure policy.
create table private.monetary_request_policy (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 minimum_completed_exchanges integer check(minimum_completed_exchanges>=1),
 minimum_amount_minor bigint check(minimum_amount_minor>=1),
 maximum_amount_minor bigint check(maximum_amount_minor>=minimum_amount_minor),
 cooldown_seconds integer check(cooldown_seconds>=1), version integer not null default 1
);
insert into private.monetary_request_policy(singleton) values(true);
alter table private.monetary_request_policy enable row level security;
revoke all on private.monetary_request_policy from public,anon,authenticated,service_role;
create trigger monetary_policy_changed before update on private.monetary_request_policy for each row execute function private.version_ai_configuration();
create function private.invalidate_request_policy_context() returns trigger
language plpgsql security definer set search_path='' as $$begin
 update public.conversations set context_revision=context_revision+1 where deleted_at is null;return null;
end;$$;
revoke all on function private.invalidate_request_policy_context() from public,anon,authenticated,service_role;
create trigger monetary_policy_context_changed after update on private.monetary_request_policy for each row execute function private.invalidate_request_policy_context();
create function private.monetary_request_eligibility(p_conversation uuid,p_actor uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.conversations;policy private.monetary_request_policy;reason text;exchanges integer;
begin
 select * into c from public.conversations where id=p_conversation and user_id=p_actor and deleted_at is null;
 if not found or not exists(select 1 from public.profiles where id=p_actor and onboarding_complete and adult_declared_at is not null) then return jsonb_build_object('eligible',false,'reason','unavailable');end if;
 select * into policy from private.monetary_request_policy where singleton;
 if c.status<>'active' then reason:='archived';
 elsif private.compute_capabilities(c.character_id)->>'payments' is distinct from 'true' or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then reason:='paused';
 elsif not exists(select 1 from public.profiles where id=p_actor and requests_enabled) then reason:='disabled_by_user';
 elsif c.requests_muted then reason:='muted';
 elsif c.requests_refused then reason:='refused';
 elsif not policy.enabled or policy.minimum_completed_exchanges is null or policy.minimum_amount_minor is null or policy.maximum_amount_minor is null or policy.cooldown_seconds is null then reason:='unconfigured';
 else
  select count(*) into exchanges from private.reply_jobs where conversation_id=c.id and generation=c.generation and state='completed';
  if exchanges<policy.minimum_completed_exchanges then reason:='early_chat';
  elsif c.last_monetary_request_at is not null and c.last_monetary_request_at+pg_catalog.make_interval(secs=>policy.cooldown_seconds)>now() then reason:='cooldown';end if;
 end if;
 return jsonb_build_object('eligible',reason is null,'reason',reason,'policyVersion',policy.version);
end;$$;
revoke all on function private.monetary_request_eligibility(uuid,uuid) from public,anon,authenticated,service_role;
create function public.request_settings(p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare profile public.profiles;total integer;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 if p_page is null or p_page not between 1 and 1000 then raise exception 'invalid_page';end if;
 select * into profile from public.profiles where id=auth.uid();
 select count(*) into total from public.conversations where user_id=auth.uid() and deleted_at is null;
 return jsonb_build_object('enabled',profile.requests_enabled,'version',profile.version,'actionsAvailable',false,'page',p_page,'total',total,
 'conversations',coalesce((select jsonb_agg(to_jsonb(entry) order by updated_at desc,id) from
 (select c.id,c.version,c.requests_muted as muted,c.requests_refused as refused,c.status,c.updated_at,ch.name from public.conversations c join public.characters ch on ch.id=c.character_id
 where c.user_id=auth.uid() and c.deleted_at is null order by c.updated_at desc,c.id limit 12 offset (p_page-1)*12) entry),'[]'::jsonb));
end;$$;
create function public.set_request_preferences(p_enabled boolean,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare profile public.profiles;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 if p_enabled is null or p_version is null then raise exception 'invalid_preference';end if;
 select * into profile from public.profiles where id=auth.uid() for update;
 if profile.version<>p_version then raise exception 'conflict';end if;
 if profile.requests_enabled=p_enabled then return;end if;
 perform private.limit_conversation_mutation();
 update public.profiles set requests_enabled=p_enabled,version=version+1,updated_at=now() where id=auth.uid();
end;$$;
create function public.manage_conversation_requests(p_conversation uuid,p_operation text,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare c public.conversations;muted boolean;refused boolean;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 if p_operation is null or p_operation not in ('mute','unmute','decline','resume') or p_version is null then raise exception 'invalid_operation';end if;
 select * into c from public.conversations where id=p_conversation and user_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'not_found';end if;
 if c.version<>p_version then raise exception 'conflict';end if;
 muted:=case when p_operation='mute' then true when p_operation='unmute' then false else c.requests_muted end;
 refused:=case when p_operation='decline' then true when p_operation='resume' then false else c.requests_refused end;
 if muted=c.requests_muted and refused=c.requests_refused then return;end if;
 perform private.limit_conversation_mutation();
 update public.conversations set requests_muted=muted,requests_refused=refused,context_revision=context_revision+1,version=version+1,updated_at=now() where id=c.id;
 -- Refusal and mute change neither warmth nor fictional relationship state.
end;$$;
revoke all on function public.request_settings(integer),public.set_request_preferences(boolean,integer),public.manage_conversation_requests(uuid,text,integer) from public,anon;
grant execute on function public.request_settings(integer),public.set_request_preferences(boolean,integer),public.manage_conversation_requests(uuid,text,integer) to authenticated;
-- Preserve the existing summary/photo/lease claim as a private implementation.
alter function public.claim_reply(uuid,uuid,text) rename to claim_summary_reply;
alter function public.claim_summary_reply(uuid,uuid,text) set schema private;
revoke all on function private.claim_summary_reply(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;c public.conversations;
begin
 result:=private.claim_summary_reply(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id where m.id=p_message;
 return result||jsonb_build_object('requestControls',jsonb_build_object('actionsEnabled',false,
 'allowedByUser',(select requests_enabled from public.profiles where id=p_actor),'muted',c.requests_muted,'refused',c.requests_refused,
 'policy',private.monetary_request_eligibility(c.id,p_actor)));
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;
commit;
