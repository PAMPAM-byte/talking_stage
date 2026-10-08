begin;
-- One audited entry point; legacy mutation functions remain owner-only helpers.
create function public.admin_cast_command(p_operation text,p_id uuid default null,p_version integer default null,
 p_profile jsonb default null,p_direction text default null,p_attested boolean default false,p_reason text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result_id uuid; failure text; kind text;
begin
 perform private.require_cast_admin();
 if p_operation is null or p_operation not in ('cast.save_draft','cast.deactivate','cast.publish','asset.approved','asset.rejected','asset.publish','asset.reserve_upload') then raise exception 'invalid_operation'; end if;
 kind:=case when p_operation like 'cast.%' or p_operation='asset.reserve_upload' then 'character' else 'asset' end;
 begin
  case p_operation
   when 'cast.save_draft' then result_id:=public.admin_save_cast(p_id,p_version,p_profile,p_direction);
   when 'cast.deactivate' then perform public.admin_deactivate_cast(p_id,p_version);
   when 'cast.publish' then perform public.admin_publish_cast(p_id,p_version,p_attested);
   when 'asset.approved' then perform public.admin_review_asset(p_id,p_version,'approved',p_attested,p_reason);
   when 'asset.rejected' then perform public.admin_review_asset(p_id,p_version,'rejected',p_attested,p_reason);
   when 'asset.publish' then perform public.admin_publish_asset(p_id,p_version);
   when 'asset.reserve_upload' then perform public.admin_asset_upload_allowed(p_id);
  end case;
 exception when others then
  failure:=case when sqlerrm in ('conflict','conflict_or_uninspected','conflict_or_unapproved','invalid_cast','review_required','approved_assets_required','rate_limited','character_not_found') then sqlerrm else 'invalid_change' end;
 end;
 if failure is not null then
  insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome,reason) values(auth.uid(),p_operation,kind,p_id,'failed',failure);
  return jsonb_build_object('error',failure);
 end if;
 return jsonb_build_object('id',coalesce(result_id,p_id));
end; $$;
revoke execute on function public.admin_save_cast(uuid,integer,jsonb,text),public.admin_deactivate_cast(uuid,integer),
 public.admin_publish_cast(uuid,integer,boolean),public.admin_review_asset(uuid,integer,text,boolean,text),
 public.admin_publish_asset(uuid,integer),public.admin_asset_upload_allowed(uuid) from authenticated;
revoke all on function public.admin_cast_command(text,uuid,integer,jsonb,text,boolean,text) from public,anon;
grant execute on function public.admin_cast_command(text,uuid,integer,jsonb,text,boolean,text) to authenticated;

-- Only the validated inspecting server can record upload failures, never arbitrary actors via a member JWT.
create function public.record_upload_failure(p_actor uuid,p_character uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=p_actor and r.role='admin' and p.onboarding_complete and p.adult_declared_at is not null)
 or p_reason not in ('invalid_upload','inspection_failed','storage_unavailable','registration_failed') or p_reason is null then raise exception 'forbidden'; end if;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome,reason) values(p_actor,'asset.upload','character',p_character,'failed',p_reason);
end; $$;
revoke all on function public.record_upload_failure(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_upload_failure(uuid,uuid,text) to service_role;

create function public.admin_get_cast(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_cast_admin();
 return (select jsonb_build_object('id',c.id,'status',c.status,'version',d.version,'profile',d.profile,
 'direction',d.direction,'instructionVersion',d.instruction_version,'updatedAt',d.updated_at)
 from private.cast_drafts d join public.characters c on c.id=d.character_id where c.id=p_id);
end; $$;
create function public.admin_cast_page(p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare total integer; page integer;
begin
 perform private.require_cast_admin();
 if p_page is null or p_page<1 or p_page>100000 then raise exception 'invalid_page'; end if;
 select count(*) into total from private.cast_drafts;
 page:=least(p_page,greatest(1,ceil(total/12.0)::integer));
 return jsonb_build_object('total',total,'page',page,'characters',coalesce((select jsonb_agg(to_jsonb(rows)) from
 (select c.id,c.status,d.version,d.profile from private.cast_drafts d join public.characters c on c.id=d.character_id
 order by d.updated_at desc,d.character_id desc limit 12 offset (page-1)*12) rows),'[]'::jsonb));
end; $$;
create function public.admin_cast_preview(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_cast_admin();
 select jsonb_build_object('id',d.character_id,'profile',d.profile,'assets',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'slot',a.slot,'alt_text',a.alt_text) order by a.slot,a.id)
 from public.character_assets a where a.character_id=d.character_id and a.slot in ('portrait','gallery') and a.review_state='approved' and a.review_attested and a.source_hash is not null),'[]'::jsonb))
 into result from private.cast_drafts d where d.character_id=p_id;
 if result is not null then insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome) values(auth.uid(),'cast.preview','character',p_id,'succeeded'); end if;
 return result;
end; $$;
revoke all on function public.admin_get_cast(uuid),public.admin_cast_page(integer),public.admin_cast_preview(uuid) from public,anon;
grant execute on function public.admin_get_cast(uuid),public.admin_cast_page(integer),public.admin_cast_preview(uuid) to authenticated;

-- Invoker rights preserve customer RLS. Filters precede slicing, options cover the whole eligible collection.
create function public.discover_cast(p_page integer default 1,p_gender text default null,p_interest text default null,p_personality text default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare total integer; page integer; result jsonb;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if p_page is null or p_page<1 or p_page>100000 or (p_gender is not null and p_gender not in ('man','woman'))
 or char_length(p_interest)>60 or char_length(p_personality)>60 then raise exception 'invalid_filter'; end if;
 select count(*) into total from public.characters c where (p_gender is null or c.gender=p_gender)
 and (p_interest is null or p_interest=any(c.interests)) and (p_personality is null or p_personality=any(c.personality));
 page:=least(p_page,greatest(1,ceil(total/12.0)::integer));
 select jsonb_build_object('total',total,'page',page,'characters',coalesce((select jsonb_agg(to_jsonb(rows)) from
 (select id,name,age,gender,bio,conversation_clue,fictional_location,occupation,interests,personality from public.characters c
 where (p_gender is null or c.gender=p_gender) and (p_interest is null or p_interest=any(c.interests))
 and (p_personality is null or p_personality=any(c.personality)) order by name,id limit 12 offset (page-1)*12) rows),'[]'::jsonb),
 'interests',coalesce((select jsonb_agg(i order by i) from (select distinct unnest(interests) i from public.characters) options),'[]'::jsonb),
 'personalities',coalesce((select jsonb_agg(i order by i) from (select distinct unnest(personality) i from public.characters) options),'[]'::jsonb)) into result;
 return result;
end; $$;
revoke all on function public.discover_cast(integer,text,text,text) from public,anon;
grant execute on function public.discover_cast(integer,text,text,text) to authenticated;
commit;
