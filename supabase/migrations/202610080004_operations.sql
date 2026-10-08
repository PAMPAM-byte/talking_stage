begin;
create table private.capability_controls (
 scope text primary key, character_id uuid unique references public.characters(id) on delete cascade,
 chat boolean not null default true, photos boolean not null default true, payments boolean not null default true,
 version integer not null default 1 check(version>0), updated_at timestamptz not null default now(),
 check(scope=coalesce(character_id::text,'global'))
);
alter table private.capability_controls enable row level security;
revoke all on private.capability_controls from public,anon,authenticated;
insert into private.capability_controls(scope) values('global');
alter table private.admin_audit add column reason text check(char_length(reason)<=500);
create function public.effective_capabilities(p_character uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare g private.capability_controls; c private.capability_controls; available boolean;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 select * into g from private.capability_controls where scope='global';
 select * into c from private.capability_controls where character_id=p_character;
 select exists(select 1 from public.characters where id=p_character and status='published' and public.cast_has_eligible_assets(id)) into available;
 return jsonb_build_object('chat',available and g.chat and coalesce(c.chat,true),
 'photos',available and g.photos and coalesce(c.photos,true),'payments',available and g.payments and coalesce(c.payments,true));
end; $$;
create function public.admin_list_controls() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_cast_admin();
 return jsonb_build_object('global',(select to_jsonb(g) from private.capability_controls g where scope='global'),
 'characters',coalesce((select jsonb_agg(jsonb_build_object('scope',d.character_id::text,'name',d.profile->>'name',
 'status',ch.status,'chat',coalesce(c.chat,true),'photos',coalesce(c.photos,true),'payments',coalesce(c.payments,true),
 'version',coalesce(c.version,0),'effective',public.effective_capabilities(d.character_id)) order by d.profile->>'name',d.character_id)
 from private.cast_drafts d join public.characters ch on ch.id=d.character_id
 left join private.capability_controls c on c.character_id=d.character_id),'[]'::jsonb));
end; $$;
-- Expected failures return data so their audit entry survives transaction rollback.
create function public.admin_save_controls(p_character uuid,p_version integer,p_chat boolean,p_photos boolean,p_payments boolean,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_version integer; result_version integer; failure text; key text:=coalesce(p_character::text,'global');
begin
 perform private.require_cast_admin();
 begin
  perform private.limit_cast_mutation();
  if p_version is null or p_version<0 or p_chat is null or p_photos is null or p_payments is null
  or p_reason is null or char_length(trim(p_reason)) not between 1 and 500 then raise exception 'invalid_controls'; end if;
  if p_character is not null then
   perform 1 from public.characters where id=p_character for update;
   if not found then raise exception 'invalid_controls'; end if;
  end if;
  select version into current_version from private.capability_controls where scope=key for update;
  if coalesce(current_version,0)<>p_version then raise exception 'conflict'; end if;
  insert into private.capability_controls(scope,character_id,chat,photos,payments) values(key,p_character,p_chat,p_photos,p_payments)
  on conflict(scope) do update set chat=excluded.chat,photos=excluded.photos,payments=excluded.payments,
   version=private.capability_controls.version+1,updated_at=now() returning version into result_version;
 exception when others then
  failure:=case when sqlerrm in ('conflict','rate_limited','invalid_controls') then sqlerrm else 'unavailable' end;
 end;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome,reason)
 values(auth.uid(),'operations.save',case when p_character is null then 'global' else 'character' end,p_character,
 case when failure is null then 'succeeded' else 'failed' end,case when failure is null then trim(p_reason) else failure end);
 return case when failure is null then jsonb_build_object('version',result_version) else jsonb_build_object('error',failure) end;
end; $$;
create function public.admin_list_audit(p_before uuid default null,p_outcome text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare anchor private.admin_audit; result jsonb;
begin
 perform private.require_cast_admin();
 if p_outcome is not null and p_outcome not in ('succeeded','failed') then raise exception 'invalid_filter'; end if;
 if p_before is not null then
  select * into anchor from private.admin_audit where id=p_before;
  if not found then raise exception 'invalid_cursor'; end if;
 end if;
 with page as (select id,actor_id,action,target_kind,target_id,outcome,reason,created_at from private.admin_audit
 where (p_outcome is null or outcome=p_outcome) and (p_before is null or (created_at,id)<(anchor.created_at,anchor.id))
 order by created_at desc,id desc limit 21), displayed as (select * from page order by created_at desc,id desc limit 20)
 select jsonb_build_object('events',coalesce((select jsonb_agg(to_jsonb(d) order by created_at desc,id desc) from displayed d),'[]'::jsonb),
 'next',case when (select count(*) from page)>20 then (select id from displayed order by created_at,id limit 1) else null end) into result;
 return result;
end; $$;
revoke all on function public.effective_capabilities(uuid),public.admin_list_controls(),public.admin_save_controls(uuid,integer,boolean,boolean,boolean,text),public.admin_list_audit(uuid,text) from public,anon;
grant execute on function public.effective_capabilities(uuid),public.admin_list_controls(),public.admin_save_controls(uuid,integer,boolean,boolean,boolean,text),public.admin_list_audit(uuid,text) to authenticated;
drop policy public_assets on public.character_assets;
create policy public_assets on public.character_assets for select to authenticated using (
 public.has_adult_access() and published and review_state='approved'
 and (public.effective_capabilities(character_id)->>'photos')::boolean
);
commit;
