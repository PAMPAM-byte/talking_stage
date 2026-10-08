begin;
alter table public.character_assets add column alt_text text not null default '';
alter table public.character_assets add column version integer not null default 1;
alter table public.character_assets add column width integer;
alter table public.character_assets add column height integer;
alter table public.character_assets add column source_hash text;
alter table public.character_assets add column reviewed_by uuid references auth.users(id);
alter table public.character_assets add column reviewed_at timestamptz;
alter table public.character_assets add column review_attested boolean not null default false;
alter table public.character_assets add column rejection_reason text;
create table private.direction_history (
 character_id uuid not null references public.characters(id), version integer not null,
 direction text not null, published_by uuid not null references auth.users(id), published_at timestamptz not null default now(),
 primary key(character_id,version)
);
alter table private.direction_history enable row level security;
revoke all on private.direction_history from public,anon,authenticated;
create function public.cast_has_eligible_assets(p_character uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.character_assets where character_id=p_character and slot='portrait' and published and review_state='approved' and review_attested and source_hash is not null)
  and exists(select 1 from public.character_assets where character_id=p_character and slot='gallery' and published and review_state='approved' and review_attested and source_hash is not null);
$$;
revoke all on function public.cast_has_eligible_assets(uuid) from public,anon;
grant execute on function public.cast_has_eligible_assets(uuid) to authenticated;
drop policy public_cast on public.characters;
create policy public_cast on public.characters for select to authenticated using(public.has_adult_access() and status='published' and public.cast_has_eligible_assets(id));

-- Only the trusted, inspecting server can register normalized files. Ordinary
-- administrator JWTs cannot bypass byte inspection by directly calling this RPC.
create function public.register_inspected_asset(p_id uuid,p_character uuid,p_actor uuid,p_slot text,p_alt text,p_width integer,p_height integer,p_hash text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=p_actor and p.onboarding_complete and p.adult_declared_at is not null)
  or p_id is null or p_character is null or p_slot is null or p_slot not in ('portrait','gallery','chat')
  or p_alt is null or char_length(trim(p_alt)) not between 1 and 240
  or p_width is null or p_height is null or p_width not between 256 and 8192 or p_height not between 256 and 8192
  or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_asset'; end if;
 if not exists(select 1 from private.cast_drafts where character_id=p_character) then raise exception 'character_not_found'; end if;
 insert into public.character_assets(id,character_id,storage_path,slot,alt_text,width,height,source_hash)
 values(p_id,p_character,p_character::text||'/'||p_id::text||'/original.webp',p_slot,trim(p_alt),p_width,p_height,p_hash);
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome) values(p_actor,'asset.upload','asset',p_id,'succeeded');
end;
$$;
revoke all on function public.register_inspected_asset(uuid,uuid,uuid,text,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.register_inspected_asset(uuid,uuid,uuid,text,text,integer,integer,text) to service_role;

create function public.admin_list_assets(p_character uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_cast_admin();
 return coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from public.character_assets a where p_character is null or a.character_id=p_character),'[]'::jsonb);
end;
$$;
create function public.admin_asset_upload_allowed(p_character uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_cast_admin(); perform private.limit_cast_mutation();
 if not exists(select 1 from private.cast_drafts where character_id=p_character) then raise exception 'character_not_found'; end if;
end;
$$;
revoke all on function public.admin_asset_upload_allowed(uuid) from public,anon;
grant execute on function public.admin_asset_upload_allowed(uuid) to authenticated;
create function public.admin_review_asset(p_id uuid,p_version integer,p_decision text,p_attested boolean,p_reason text default '')
returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_cast_admin(); perform private.limit_cast_mutation();
 if p_decision is null or p_decision not in ('approved','rejected')
  or (p_decision='approved' and p_attested is distinct from true)
  or (p_decision='rejected' and (p_reason is null or char_length(trim(p_reason)) not between 1 and 500)) then raise exception 'review_required'; end if;
 update public.character_assets set review_state=p_decision,published=false,reviewed_by=auth.uid(),reviewed_at=now(),review_attested=(p_decision='approved'),
  rejection_reason=case when p_decision='rejected' then trim(p_reason) end,version=version+1
 where id=p_id and version=p_version and source_hash is not null;
 if not found then raise exception 'conflict_or_uninspected'; end if;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome) values(auth.uid(),'asset.'||p_decision,'asset',p_id,'succeeded');
end;
$$;
create function public.admin_publish_asset(p_id uuid,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_cast_admin(); perform private.limit_cast_mutation();
 update public.character_assets set published=true,version=version+1 where id=p_id and version=p_version
  and review_state='approved' and review_attested and source_hash is not null;
 if not found then raise exception 'conflict_or_unapproved'; end if;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome) values(auth.uid(),'asset.publish','asset',p_id,'succeeded');
end;
$$;
create function public.admin_publish_cast(p_id uuid,p_version integer,p_attested boolean) returns void
language plpgsql security definer set search_path='' as $$
declare d private.cast_drafts;
begin
 perform private.require_cast_admin(); perform private.limit_cast_mutation();
 if p_attested is distinct from true then raise exception 'review_required'; end if;
 select * into d from private.cast_drafts where character_id=p_id for update;
 if not found or d.version<>p_version then raise exception 'conflict'; end if;
 -- Serialize asset review/publication with character publication.
 perform 1 from public.character_assets where character_id=p_id for update;
 if not exists(select 1 from public.character_assets where character_id=p_id and slot='portrait' and published and review_state='approved' and review_attested and source_hash is not null)
  or not exists(select 1 from public.character_assets where character_id=p_id and slot='gallery' and published and review_state='approved' and review_attested and source_hash is not null) then raise exception 'approved_assets_required'; end if;
 update public.characters set name=d.profile->>'name',age=(d.profile->>'age')::integer,gender=d.profile->>'gender',
  bio=d.profile->>'bio',conversation_clue=d.profile->>'conversationClue',fictional_location=d.profile->>'fictionalLocation',occupation=d.profile->>'occupation',
  interests=array(select jsonb_array_elements_text(d.profile->'interests')),personality=array(select jsonb_array_elements_text(d.profile->'personalityTags')),
  status='published',archived_at=null,updated_at=now(),version=version+1 where id=p_id;
 insert into private.character_direction(character_id,direction,version) values(p_id,d.direction,d.instruction_version)
 on conflict(character_id) do update set direction=excluded.direction,version=excluded.version,updated_at=now();
 insert into private.direction_history(character_id,version,direction,published_by) values(p_id,d.instruction_version,d.direction,auth.uid()) on conflict do nothing;
 update private.cast_drafts set version=version+1,updated_at=now() where character_id=p_id;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome) values(auth.uid(),'cast.publish','character',p_id,'succeeded');
end;
$$;
revoke all on function public.admin_list_assets(uuid),public.admin_review_asset(uuid,integer,text,boolean,text),public.admin_publish_asset(uuid,integer),public.admin_publish_cast(uuid,integer,boolean) from public,anon;
grant execute on function public.admin_list_assets(uuid),public.admin_review_asset(uuid,integer,text,boolean,text),public.admin_publish_asset(uuid,integer),public.admin_publish_cast(uuid,integer,boolean) to authenticated;
commit;
