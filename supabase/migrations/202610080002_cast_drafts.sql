begin;

-- Editing is private. Public characters remain the last published snapshot.
alter table public.characters add column fictional_location text not null default '';
alter table public.characters add column occupation text not null default '';
create table private.cast_drafts (
  character_id uuid primary key references public.characters(id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  direction text not null check (char_length(direction) between 1 and 12000),
  instruction_version integer not null default 1 check (instruction_version > 0),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
alter table private.cast_drafts enable row level security;
revoke all on private.cast_drafts from public, anon, authenticated;

create function private.require_cast_admin() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() or not public.has_adult_access() then raise exception 'forbidden'; end if;
end;
$$;
create function private.limit_cast_mutation() returns void
language plpgsql security definer set search_path = '' as $$
declare count integer;
begin
  insert into private.request_limits as limits(user_id,action,window_start,attempts)
  values(auth.uid(),'cast',now(),1)
  on conflict(user_id,action) do update set
    attempts = case when limits.window_start < now() - interval '1 minute' then 1 else limits.attempts + 1 end,
    window_start = case when limits.window_start < now() - interval '1 minute' then now() else limits.window_start end
  returning limits.attempts into count;
  if count > 30 then raise exception 'rate_limited'; end if;
end;
$$;
create function public.admin_list_cast() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_cast_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',c.id,'status',c.status,'version',d.version,'profile',d.profile,
    'direction',d.direction,'instructionVersion',d.instruction_version,'updatedAt',d.updated_at
  ) order by d.updated_at desc) from private.cast_drafts d join public.characters c on c.id=d.character_id),'[]'::jsonb);
end;
$$;
create function public.admin_save_cast(p_id uuid,p_version integer,p_profile jsonb,p_direction text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; previous private.cast_drafts;
begin
  perform private.require_cast_admin();
  perform private.limit_cast_mutation();
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' or p_direction is null or p_version is null
    or char_length(trim(p_direction)) not between 1 and 12000 then raise exception 'invalid_cast'; end if;
  if exists(select 1 from jsonb_object_keys(p_profile) k where k not in
    ('name','age','gender','fictionalLocation','occupation','bio','conversationClue','interests','personalityTags')) then raise exception 'invalid_cast'; end if;
  if jsonb_typeof(p_profile->'name') is distinct from 'string'
    or char_length(trim(p_profile->>'name')) not between 1 and 40
    or jsonb_typeof(p_profile->'age') is distinct from 'number'
    or (p_profile->>'age')::integer not between 18 and 120
    or (p_profile->>'age')::numeric <> (p_profile->>'age')::integer
    or p_profile->>'gender' is null or p_profile->>'gender' not in ('man','woman')
    or jsonb_typeof(p_profile->'bio') is distinct from 'string' or char_length(trim(p_profile->>'bio')) not between 1 and 1200
    or jsonb_typeof(p_profile->'fictionalLocation') is distinct from 'string' or char_length(trim(p_profile->>'fictionalLocation')) not between 1 and 100
    or jsonb_typeof(p_profile->'occupation') is distinct from 'string' or char_length(trim(p_profile->>'occupation')) not between 1 and 100
    or jsonb_typeof(p_profile->'conversationClue') is distinct from 'string' or char_length(trim(p_profile->>'conversationClue')) not between 1 and 240
    or jsonb_typeof(p_profile->'interests') is distinct from 'array'
    or jsonb_typeof(p_profile->'personalityTags') is distinct from 'array' then raise exception 'invalid_cast'; end if;
  if jsonb_array_length(p_profile->'interests') not between 1 and 12 or jsonb_array_length(p_profile->'personalityTags') not between 1 and 12
    or exists(select 1 from jsonb_array_elements((p_profile->'interests') || (p_profile->'personalityTags')) item
      where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) not between 1 and 60) then raise exception 'invalid_cast'; end if;
  if p_id is null then
    if p_version <> 0 then raise exception 'conflict'; end if;
    insert into public.characters(name,age,gender) values(trim(p_profile->>'name'),(p_profile->>'age')::integer,p_profile->>'gender') returning id into result;
    insert into private.cast_drafts(character_id,profile,direction) values(result,p_profile,trim(p_direction));
  else
    select * into previous from private.cast_drafts where character_id=p_id for update;
    if not found or previous.version <> p_version then raise exception 'conflict'; end if;
    result := p_id;
    update private.cast_drafts set profile=p_profile,direction=trim(p_direction),version=version+1,
      instruction_version=instruction_version+case when direction <> trim(p_direction) then 1 else 0 end,updated_at=now()
      where character_id=result;
  end if;
  insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome)
    values(auth.uid(),'cast.save_draft','character',result,'succeeded');
  return result;
end;
$$;
create function public.admin_deactivate_cast(p_id uuid,p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_cast_admin();
  perform private.limit_cast_mutation();
  update private.cast_drafts set version=version+1,updated_at=now() where character_id=p_id and version=p_version;
  if not found then raise exception 'conflict'; end if;
  update public.characters set status='archived',archived_at=now(),updated_at=now(),version=version+1 where id=p_id;
  insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome)
    values(auth.uid(),'cast.deactivate','character',p_id,'succeeded');
end;
$$;
revoke all on function private.require_cast_admin(),private.limit_cast_mutation() from public,anon,authenticated;
revoke all on function public.admin_list_cast(),public.admin_save_cast(uuid,integer,jsonb,text),public.admin_deactivate_cast(uuid,integer) from public,anon;
grant execute on function public.admin_list_cast(),public.admin_save_cast(uuid,integer,jsonb,text),public.admin_deactivate_cast(uuid,integer) to authenticated;
commit;
