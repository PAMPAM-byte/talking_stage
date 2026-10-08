begin;
alter table public.conversations add column generation integer not null default 1 check(generation>0);
alter table public.conversations add column next_sequence bigint not null default 1 check(next_sequence>0);
update public.conversations c set next_sequence=coalesce((select max(sequence)+1 from public.messages m where m.conversation_id=c.id),1);
alter table public.memory_preferences alter column enabled set default false;
create table private.reply_jobs (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id),
 user_message_id uuid not null unique,
 generation integer not null, state text not null default 'blocked_provider' check(state in ('blocked_provider','pending','generating','completed','failed','cancelled')),
 created_at timestamptz not null default now(),
 foreign key(user_message_id,conversation_id) references public.messages(id,conversation_id) on delete cascade
);
alter table private.reply_jobs enable row level security;
revoke all on private.reply_jobs from public,anon,authenticated;
create function private.limit_conversation_mutation() returns void
language plpgsql security definer set search_path='' as $$
declare attempts integer;
begin
 insert into private.request_limits as limits(user_id,action,window_start,attempts) values(auth.uid(),'conversation',now(),1)
 on conflict(user_id,action) do update set attempts=case when limits.window_start<now()-interval '1 minute' then 1 else limits.attempts+1 end,
 window_start=case when limits.window_start<now()-interval '1 minute' then now() else limits.window_start end returning limits.attempts into attempts;
 if attempts>30 then raise exception 'rate_limited'; end if;
end; $$;
revoke all on function private.limit_conversation_mutation() from public,anon,authenticated;
create function public.start_conversation(p_character uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_character::text,0));
 select id into result from public.conversations where user_id=auth.uid() and character_id=p_character and deleted_at is null
 order by case when status='active' then 0 else 1 end,updated_at desc,id limit 1 for update;
 if result is not null then return result; end if;
 if public.effective_capabilities(p_character)->>'chat' is distinct from 'true' then raise exception 'chat_paused'; end if;
 perform private.limit_conversation_mutation();
 insert into public.conversations(user_id,character_id) values(auth.uid(),p_character) returning id into result;
 return result;
end; $$;
create function public.list_conversations(p_archived boolean default false,p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare total integer; page integer;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if p_page is null or p_page<1 or p_page>100000 or p_archived is null then raise exception 'invalid_page'; end if;
 select count(*) into total from public.conversations where user_id=auth.uid() and deleted_at is null and status=case when p_archived then 'archived' else 'active' end;
 page:=least(p_page,greatest(1,ceil(total/12.0)::integer));
 return jsonb_build_object('page',page,'total',total,'conversations',coalesce((select jsonb_agg(to_jsonb(rows)) from
 (select c.id,c.character_id,c.status,c.version,c.last_message_preview,c.last_message_at,c.updated_at,ch.name,ch.age
 from public.conversations c join public.characters ch on ch.id=c.character_id
 where c.user_id=auth.uid() and c.deleted_at is null and c.status=case when p_archived then 'archived' else 'active' end
 order by c.updated_at desc,c.id desc limit 12 offset (page-1)*12) rows),'[]'::jsonb));
end; $$;
create function public.conversation_thread(p_id uuid,p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.conversations; result jsonb;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 select * into c from public.conversations where id=p_id and user_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'not_found'; end if;
 if p_before is not null and p_before<1 then raise exception 'invalid_cursor'; end if;
 with page as(select id,sequence,role,kind,text,asset_id,created_at from public.messages where conversation_id=c.id
 and (p_before is null or sequence<p_before) order by sequence desc limit 40)
 select jsonb_build_object('conversation',jsonb_build_object('id',c.id,'character_id',c.character_id,'status',c.status,
 'version',c.version,'generation',c.generation,'name',(select name from public.characters where id=c.character_id)),
 'capabilities',public.effective_capabilities(c.character_id),
 'messages',coalesce((select jsonb_agg(to_jsonb(p) order by sequence) from page p),'[]'::jsonb),
 'older',case when exists(select 1 from public.messages where conversation_id=c.id and sequence<(select min(sequence) from page)) then (select min(sequence) from page) else null end,
 'repliesAvailable',false) into result;
 return result;
end; $$;
create function public.save_user_message(p_conversation uuid,p_client_id uuid,p_generation integer,p_text text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations; existing public.messages; saved public.messages;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 select * into c from public.conversations where id=p_conversation and user_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'not_found'; end if;
 if p_generation is null or c.generation<>p_generation then raise exception 'thread_changed'; end if;
 if p_client_id is null or p_text is null or char_length(trim(p_text)) not between 1 and 2000 then raise exception 'invalid_message'; end if;
 select * into existing from public.messages where conversation_id=c.id and client_message_id=p_client_id;
 if found then
  if existing.text is distinct from trim(p_text) then raise exception 'idempotency_conflict'; end if;
  return jsonb_build_object('id',existing.id,'sequence',existing.sequence,'replyState','blocked_provider');
 end if;
 if c.status<>'active' then raise exception 'conversation_archived'; end if;
 if public.effective_capabilities(c.character_id)->>'chat' is distinct from 'true' then raise exception 'chat_paused'; end if;
 perform private.limit_conversation_mutation();
 insert into public.messages(conversation_id,sequence,role,kind,text,client_message_id) values(c.id,c.next_sequence,'user','text',trim(p_text),p_client_id) returning * into saved;
 insert into private.reply_jobs(conversation_id,user_message_id,generation) values(c.id,saved.id,c.generation);
 update public.conversations set next_sequence=next_sequence+1,last_message_preview=left(saved.text,140),last_message_at=saved.created_at,version=version+1,updated_at=now() where id=c.id;
 return jsonb_build_object('id',saved.id,'sequence',saved.sequence,'replyState','blocked_provider');
end; $$;
create function public.manage_conversation(p_id uuid,p_version integer,p_operation text,p_clear_memories boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare c public.conversations;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 select * into c from public.conversations where id=p_id and user_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'not_found'; end if;
 if p_version is null or p_version<>c.version then raise exception 'conflict'; end if;
 if p_operation is null or p_operation not in ('archive','restore','reset','delete') or p_clear_memories is null then raise exception 'invalid_operation'; end if;
 perform private.limit_conversation_mutation();
 if p_operation in ('archive','restore') then
  update public.conversations set status=case when p_operation='archive' then 'archived' else 'active' end,version=version+1,updated_at=now() where id=c.id;
 else
  -- Preserve separately saved facts by detaching their deleted message sources.
  update public.memories set source_message_id=null,source_conversation_id=null
   where user_id=auth.uid() and character_id=c.character_id and source_conversation_id=c.id;
  if p_clear_memories then update public.memories set deleted_at=coalesce(deleted_at,now()) where user_id=auth.uid() and character_id=c.character_id; end if;
  delete from public.messages where conversation_id=c.id;
  update public.conversations set generation=generation+1,next_sequence=1,relationship_stage='introductory',
   last_message_preview=null,last_message_at=null,unread_count=0,version=version+1,updated_at=now(),
   deleted_at=case when p_operation='delete' then now() end where id=c.id;
 end if;
end; $$;
revoke all on function public.start_conversation(uuid),public.list_conversations(boolean,integer),public.conversation_thread(uuid,bigint),public.save_user_message(uuid,uuid,integer,text),public.manage_conversation(uuid,integer,text,boolean) from public,anon;
grant execute on function public.start_conversation(uuid),public.list_conversations(boolean,integer),public.conversation_thread(uuid,bigint),public.save_user_message(uuid,uuid,integer,text),public.manage_conversation(uuid,integer,text,boolean) to authenticated;
commit;
