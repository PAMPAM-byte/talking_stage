begin;
-- A texted burst is one message shown as several bubbles. A reply can quote one bubble.
alter table public.messages add column reply_to_part smallint check (reply_to_part between 0 and 3);

-- Bubbles exactly as the chat renders them: gift token removed, trimmed non-empty lines.
create function private.message_parts(p_text text) returns text[]
language sql immutable set search_path='' as $$
 select coalesce(array_agg(btrim(line,E' \t\r') order by n) filter (where btrim(line,E' \t\r')<>''),'{}')
 from regexp_split_to_table(replace(coalesce(p_text,''),'[[talkingstage:gift]]',''),E'\n') with ordinality s(line,n);
$$;
create function private.quote_part(p_quote jsonb,p_part smallint) returns jsonb
language sql stable set search_path='' as $$
 select case when p_part is null or jsonb_typeof(p_quote) is distinct from 'object' then p_quote else coalesce((
  select p_quote||jsonb_build_object('text',left(x.parts[p_part+1],500),'part',p_part)
  from public.messages m cross join lateral private.message_parts(m.text) x(parts)
  where m.id=(p_quote->>'id')::uuid and m.kind='text' and cardinality(x.parts)>greatest(p_part,1)
 ),p_quote) end;
$$;
revoke all on function private.message_parts(text),private.quote_part(jsonb,smallint) from public,anon,authenticated,service_role;

create function public.save_quoted_part_message(p_conversation uuid,p_client_id uuid,p_generation integer,p_text text,p_reply_to uuid,p_reply_part smallint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prior smallint;existed boolean;result jsonb;
begin
 select reply_to_part into prior from public.messages where conversation_id=p_conversation and client_message_id=p_client_id;
 existed:=found;
 -- Ownership, generation, idempotency and the quoted message itself are checked here first.
 result:=public.save_quoted_user_message(p_conversation,p_client_id,p_generation,p_text,p_reply_to);
 if existed and prior is distinct from p_reply_part then raise exception 'idempotency_conflict';end if;
 if p_reply_part is null or not exists(
  select 1 from public.messages m cross join lateral private.message_parts(m.text) x(parts)
  where m.id=p_reply_to and m.conversation_id=p_conversation and m.role='character' and m.kind='text' and cardinality(x.parts)>greatest(p_reply_part,1)
 ) then raise exception 'invalid_quote';end if;
 update public.messages set reply_to_part=p_reply_part where id=(result->>'id')::uuid;
 return result;
end;$$;
revoke all on function public.save_quoted_part_message(uuid,uuid,integer,text,uuid,smallint) from public,anon;
grant execute on function public.save_quoted_part_message(uuid,uuid,integer,text,uuid,smallint) to authenticated;

alter function public.conversation_thread(uuid,bigint) rename to thread_before_quote_parts;
alter function public.thread_before_quote_parts(uuid,bigint) set schema private;
revoke all on function private.thread_before_quote_parts(uuid,bigint) from public,anon,authenticated,service_role;
create function public.conversation_thread(p_id uuid,p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;history jsonb;
begin
 result:=private.thread_before_quote_parts(p_id,p_before);
 select coalesce(jsonb_agg(case when m.reply_to_part is null then h else h||jsonb_build_object('replyTo',private.quote_part(h->'replyTo',m.reply_to_part)) end order by position),'[]'::jsonb) into history
 from jsonb_array_elements(result->'messages') with ordinality items(h,position) join public.messages m on m.id=(h->>'id')::uuid and m.conversation_id=p_id;
 return result||jsonb_build_object('messages',history);
end;$$;
revoke all on function public.conversation_thread(uuid,bigint) from public,anon;
grant execute on function public.conversation_thread(uuid,bigint) to authenticated;

alter function public.claim_reply(uuid,uuid,text) rename to claim_before_quote_parts;
alter function public.claim_before_quote_parts(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_quote_parts(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;history jsonb;
begin
 result:=private.claim_before_quote_parts(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select coalesce(jsonb_agg(case when m.reply_to_part is null then h else h||jsonb_build_object('replyTo',private.quote_part(h->'replyTo',m.reply_to_part)) end order by position),'[]'::jsonb) into history
 from jsonb_array_elements(result->'history') with ordinality items(h,position) left join public.messages m on m.id=(h->>'id')::uuid;
 return result||jsonb_build_object('history',history);
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;
commit;
