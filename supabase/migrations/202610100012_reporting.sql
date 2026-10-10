begin;

alter table public.reports add column operation_id uuid;
alter table public.reports add column version integer not null default 1 check(version > 0);
create unique index reports_operation on public.reports(reporter_id,operation_id);
create index reports_queue on public.reports(state,created_at desc,id desc);
alter table public.reports add constraint report_details_bound check(details is null or char_length(details)<=1000);
alter table private.report_resolutions add column actor_id uuid references auth.users(id);
alter table private.report_resolutions add constraint report_resolution_bound check(char_length(resolution) between 1 and 1000);

-- The selected evidence is separate from reporter-visible metadata. No whole
-- conversation, private character direction, storage path or user email is copied.
create table private.report_context (
 report_id uuid primary key references public.reports(id) on delete cascade,
 selected_context jsonb not null check(jsonb_typeof(selected_context)='object')
);
alter table private.report_context enable row level security;
revoke all on private.report_context from public,anon,authenticated;

create function private.limit_report_submission() returns void
language plpgsql security definer set search_path='' as $$
declare attempts integer;
begin
 insert into private.request_limits as limits(user_id,action,window_start,attempts)
 values(auth.uid(),'reports',now(),1)
 on conflict(user_id,action) do update set
 attempts=case when limits.window_start<now()-interval '1 minute' then 1 else limits.attempts+1 end,
 window_start=case when limits.window_start<now()-interval '1 minute' then now() else limits.window_start end
 returning limits.attempts into attempts;
 if attempts>30 then raise exception 'rate_limited'; end if;
end;
$$;

create function public.submit_report(p_kind text,p_target uuid,p_reason text,p_details text,p_operation uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous public.reports; report_id uuid; selected jsonb; character_id uuid;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if p_operation is null or p_target is null or p_kind is null or p_kind not in ('character','message','photo')
 or p_reason is null or p_reason not in ('Safety concern','Inappropriate content','Payment pressure','Photo concern','Other')
 or char_length(coalesce(p_details,''))>1000 then raise exception 'invalid_report'; end if;
 -- Serialize identical operation keys across concurrent requests.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_operation::text,0));
 select * into previous from public.reports where reporter_id=auth.uid() and operation_id=p_operation;
 if found then
  if previous.target_kind<>p_kind or previous.target_id<>p_target or previous.reason<>p_reason
   or coalesce(previous.details,'')<>trim(coalesce(p_details,'')) then raise exception 'idempotency_conflict'; end if;
  return jsonb_build_object('id',previous.id,'state',previous.state);
 end if;
 if p_kind='character' then
  select jsonb_build_object('kind','character','id',c.id,'name',c.name,'age',c.age,'bio',c.bio),c.id into selected,character_id
  from public.characters c where c.id=p_target and (c.status='published' or exists(
   select 1 from public.conversations v where v.character_id=c.id and v.user_id=auth.uid() and v.deleted_at is null)) for share of c;
 elsif p_kind='message' then
  select jsonb_build_object('kind','message','id',m.id,'characterId',v.character_id,'role',m.role,
   'messageKind',m.kind,'text',left(m.text,2000),'assetId',m.asset_id,'createdAt',m.created_at),v.character_id into selected,character_id
  from public.messages m join public.conversations v on v.id=m.conversation_id
  where m.id=p_target and v.user_id=auth.uid() and v.deleted_at is null for share of v,m;
 else
  select jsonb_build_object('kind','photo','id',a.id,'characterId',a.character_id,'altText',a.alt_text,'slot',a.slot),a.character_id into selected,character_id
  from public.character_assets a join public.characters c on c.id=a.character_id where a.id=p_target
   and ((c.status='published' and a.published and a.review_state='approved' and a.review_attested and
    (public.effective_capabilities(c.id)->>'photos')::boolean) or exists(
    select 1 from public.messages m join public.conversations v on v.id=m.conversation_id
    where m.asset_id=a.id and v.user_id=auth.uid() and v.deleted_at is null)) for share of a,c;
 end if;
 if selected is null then raise exception 'target_unavailable'; end if;
 selected:=selected||jsonb_build_object('characterName',(select name from public.characters where id=character_id));
 perform private.limit_report_submission();
 insert into public.reports(reporter_id,target_kind,target_id,reason,details,operation_id)
 values(auth.uid(),p_kind,p_target,p_reason,nullif(trim(coalesce(p_details,'')),''),p_operation) returning id into report_id;
 insert into private.report_context values(report_id,selected);
 return jsonb_build_object('id',report_id,'state','open');
end;
$$;

create function public.admin_list_reports(p_state text default null,p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_cast_admin();
 if p_page is null or p_page<1 or p_page>100000 or (p_state is not null and p_state not in ('open','in_review','resolved')) then raise exception 'invalid_filter'; end if;
 select coalesce(jsonb_agg(to_jsonb(rows) order by created_at desc,id desc),'[]'::jsonb) into result from (
  select id,target_kind,reason,state,created_at,version from public.reports where p_state is null or state=p_state
  order by created_at desc,id desc limit 10 offset (p_page-1)*10
 ) rows;
 return jsonb_build_object('reports',result,'page',p_page,'total',(select count(*) from public.reports where p_state is null or state=p_state));
end;
$$;

create function public.admin_report_detail(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_cast_admin();
 select jsonb_build_object('id',r.id,'reporterId',r.reporter_id,'targetKind',r.target_kind,'targetId',r.target_id,
  'reason',r.reason,'details',r.details,'state',r.state,'createdAt',r.created_at,'version',r.version,
  'context',c.selected_context,'resolution',n.resolution) into result
 from public.reports r left join private.report_context c on c.report_id=r.id
 left join private.report_resolutions n on n.report_id=r.id where r.id=p_id;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome,reason)
 values(auth.uid(),'report.view_context','report',p_id,case when result is null then 'failed' else 'succeeded' end,
  case when result is null then 'not_found' else null end);
 return result;
end;
$$;

-- Return expected errors instead of raising them so failed-action audit survives.
create function public.admin_report_command(p_id uuid,p_version integer,p_operation text,p_resolution text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous public.reports; failure text; result jsonb;
begin
 perform private.require_cast_admin();
 begin
  if p_operation is null or p_operation not in ('start_review','resolve') or p_version is null then raise exception 'invalid_report_action'; end if;
  select * into previous from public.reports where id=p_id for update;
  if not found then raise exception 'not_found'; end if;
  if previous.version<>p_version then raise exception 'conflict'; end if;
  if (p_operation='start_review' and previous.state<>'open') or (p_operation='resolve' and previous.state<>'in_review') then raise exception 'invalid_transition'; end if;
  if p_operation='resolve' and (p_resolution is null or char_length(trim(p_resolution)) not between 1 and 1000) then raise exception 'resolution_required'; end if;
  perform private.limit_cast_mutation();
  if p_operation='resolve' then
   insert into private.report_resolutions(report_id,resolution,actor_id) values(p_id,trim(p_resolution),auth.uid());
  end if;
  update public.reports set state=case when p_operation='resolve' then 'resolved' else 'in_review' end,version=version+1 where id=p_id;
  result:=jsonb_build_object('id',p_id,'state',case when p_operation='resolve' then 'resolved' else 'in_review' end,'version',previous.version+1);
 exception when others then
  failure:=case when sqlerrm in ('invalid_report_action','not_found','conflict','invalid_transition','resolution_required','rate_limited') then sqlerrm else 'unavailable' end;
 end;
 insert into private.admin_audit(actor_id,action,target_kind,target_id,outcome,reason)
 values(auth.uid(),case when p_operation='resolve' then 'report.resolve' when p_operation='start_review' then 'report.start_review' else 'report.invalid_action' end,'report',p_id,
  case when failure is null then 'succeeded' else 'failed' end,failure);
 return case when failure is null then result else jsonb_build_object('error',failure) end;
end;
$$;

revoke all on function private.limit_report_submission() from public,anon,authenticated;
revoke all on function public.submit_report(text,uuid,text,text,uuid),public.admin_list_reports(text,integer),public.admin_report_detail(uuid),public.admin_report_command(uuid,integer,text,text) from public,anon;
grant execute on function public.submit_report(text,uuid,text,text,uuid),public.admin_list_reports(text,integer),public.admin_report_detail(uuid),public.admin_report_command(uuid,integer,text,text) to authenticated;
commit;
