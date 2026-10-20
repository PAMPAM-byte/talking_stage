begin;
alter table public.messages add column reply_to_id uuid references public.messages(id) on delete set null;
create index messages_reply_to on public.messages(reply_to_id) where reply_to_id is not null;
create function private.validate_message_quote() returns trigger language plpgsql set search_path='' as $$
begin
 if new.reply_to_id is not null and (new.role not in ('user','character') or not exists(
  select 1 from public.messages where id=new.reply_to_id and conversation_id=new.conversation_id
  and sequence<new.sequence and role in ('user','character') and kind in ('text','photo')
 )) then raise exception 'invalid_quote';end if;
 return new;
end;$$;
create trigger validate_message_quote before insert or update of reply_to_id,conversation_id,sequence on public.messages for each row execute function private.validate_message_quote();
revoke all on function private.validate_message_quote() from public,anon,authenticated,service_role;
create function private.message_quote(p_message uuid,p_conversation uuid) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',id,'role',role,'kind',kind,'text',left(coalesce(text,''),500),'sequence',sequence)
 from public.messages where id=p_message and conversation_id=p_conversation and role in ('user','character') and kind in ('text','photo');
$$;
revoke all on function private.message_quote(uuid,uuid) from public,anon,authenticated,service_role;

alter function public.save_user_message(uuid,uuid,integer,text) rename to save_before_quotes;
alter function public.save_before_quotes(uuid,uuid,integer,text) set schema private;
revoke all on function private.save_before_quotes(uuid,uuid,integer,text) from public,anon,authenticated,service_role;
create function public.save_quoted_user_message(p_conversation uuid,p_client_id uuid,p_generation integer,p_text text,p_reply_to uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations;existing public.messages;result jsonb;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 select * into c from public.conversations where id=p_conversation and user_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'not_found';end if;
 if p_generation is null or c.generation<>p_generation then raise exception 'thread_changed';end if;
 select * into existing from public.messages where conversation_id=c.id and client_message_id=p_client_id;
 if found and existing.reply_to_id is distinct from p_reply_to then raise exception 'idempotency_conflict';end if;
 if p_reply_to is not null and not exists(select 1 from public.messages where id=p_reply_to and conversation_id=c.id and sequence<c.next_sequence and role in ('user','character') and kind in ('text','photo')) then raise exception 'invalid_quote';end if;
 result:=private.save_before_quotes(p_conversation,p_client_id,p_generation,p_text);
 update public.messages set reply_to_id=p_reply_to where id=(result->>'id')::uuid;
 return result;
end;$$;
create function public.save_user_message(p_conversation uuid,p_client_id uuid,p_generation integer,p_text text) returns jsonb
language sql security definer set search_path='' as $$select public.save_quoted_user_message(p_conversation,p_client_id,p_generation,p_text,null);$$;
revoke all on function public.save_quoted_user_message(uuid,uuid,integer,text,uuid),public.save_user_message(uuid,uuid,integer,text) from public,anon;
grant execute on function public.save_quoted_user_message(uuid,uuid,integer,text,uuid),public.save_user_message(uuid,uuid,integer,text) to authenticated;

alter function public.conversation_thread(uuid,bigint) rename to thread_before_quotes;
alter function public.thread_before_quotes(uuid,bigint) set schema private;
revoke all on function private.thread_before_quotes(uuid,bigint) from public,anon,authenticated,service_role;
create function public.conversation_thread(p_id uuid,p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;history jsonb;
begin
 result:=private.thread_before_quotes(p_id,p_before);
 select coalesce(jsonb_agg(h||jsonb_build_object('replyTo',private.message_quote(m.reply_to_id,p_id)) order by position),'[]'::jsonb) into history
 from jsonb_array_elements(result->'messages') with ordinality items(h,position) join public.messages m on m.id=(h->>'id')::uuid and m.conversation_id=p_id;
 return result||jsonb_build_object('messages',history);
end;$$;
revoke all on function public.conversation_thread(uuid,bigint) from public,anon;
grant execute on function public.conversation_thread(uuid,bigint) to authenticated;

alter table private.reply_jobs add column quote_candidates uuid[] not null default '{}';
alter function public.claim_reply(uuid,uuid,text) rename to claim_before_quotes;
alter function public.claim_before_quotes(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_quotes(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;history jsonb;targets jsonb;c_id uuid;user_sequence bigint;
begin
 result:=private.claim_before_quotes(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select conversation_id,sequence into c_id,user_sequence from public.messages where id=p_message;
 select coalesce(jsonb_agg(h||jsonb_build_object('replyTo',private.message_quote(m.reply_to_id,c_id)) order by position),'[]'::jsonb) into history
 from jsonb_array_elements(result->'history') with ordinality items(h,position) join public.messages m on m.id=(h->>'id')::uuid and m.conversation_id=c_id;
 select coalesce(jsonb_agg(jsonb_build_object('messageId',id,'role',role,'kind',kind,'text',left(coalesce(text,''),180)) order by sequence),'[]'::jsonb) into targets
 from (select id,role,kind,text,sequence from public.messages where conversation_id=c_id and sequence<=user_sequence and role in ('user','character') and kind in ('text','photo') order by sequence desc limit 6) recent;
 update private.reply_jobs set quote_candidates=array(select (t->>'messageId')::uuid from jsonb_array_elements(targets) t) where id=(result->>'job')::uuid;
 return result||jsonb_build_object('history',history,'quoteTargets',targets);
end;$$;

create function public.finish_quoted_reply(p_job uuid,p_actor uuid,p_lease uuid,p_text text,p_failure text,p_asset uuid,p_reply_to uuid,p_request_amount bigint default null,p_reaction_message uuid default null,p_emoji text default null) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;result text;
begin
 select c0.* into c from public.conversations c0 join private.reply_jobs j0 on j0.conversation_id=c0.id where j0.id=p_job and c0.user_id=p_actor for update of c0;
 if not found then return 'discarded';end if;
 select * into j from private.reply_jobs where id=p_job for update;
 if j.state='completed' then return public.finish_reply(p_job,p_actor,p_lease,p_text,p_failure,p_asset);end if;
 if p_failure is not null then return public.finish_reply(p_job,p_actor,p_lease,null,p_failure,null);end if;
 if j.origin<>'reply' or p_reply_to is null or not coalesce(p_reply_to=any(j.quote_candidates),false)
 or not exists(select 1 from public.messages where id=p_reply_to and conversation_id=c.id and role in ('user','character') and kind in ('text','photo')) then
  return public.finish_reply(p_job,p_actor,p_lease,null,'invalid_output',null);
 end if;
 if p_request_amount is not null then
  result:=public.finish_gift_reply(p_job,p_actor,p_lease,p_text,null,p_asset,p_request_amount);
 elsif p_reaction_message is not null then
  result:=public.finish_reaction_reply(p_job,p_actor,p_lease,p_text,null,p_asset,p_reaction_message,p_emoji);
 else result:=public.finish_reply(p_job,p_actor,p_lease,p_text,null,p_asset);end if;
 if result='completed' then update public.messages set reply_to_id=p_reply_to where id=(select output_message_id from private.reply_jobs where id=j.id);end if;
 return result;
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text),public.finish_quoted_reply(uuid,uuid,uuid,text,text,uuid,uuid,bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text),public.finish_quoted_reply(uuid,uuid,uuid,text,text,uuid,uuid,bigint,uuid,text) to service_role;
commit;
