begin;
alter table public.message_reactions add column updated_at timestamptz not null default now();
create function private.touch_message_reaction() returns trigger
language plpgsql set search_path='' as $$begin new.updated_at:=now();return new;end;$$;
revoke all on function private.touch_message_reaction() from public,anon,authenticated,service_role;
create trigger touch_message_reaction before update on public.message_reactions for each row execute function private.touch_message_reaction();
alter function public.claim_reply(uuid,uuid,text) rename to claim_before_reaction_context;
alter function public.claim_before_reaction_context(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_reaction_context(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;extras jsonb;
begin
 result:=private.claim_before_reaction_context(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 -- Preserve the referent for reactions on photos and older messages omitted by
 -- the bounded text history. No old media is reopened or described from pixels.
 select coalesce(jsonb_agg(to_jsonb(recent)-'latest'),'[]'::jsonb) into extras from(
  select m.id as "messageId",m.role,m.kind,
   case when m.kind='photo' then '[Previously shared photo; visual details are not supplied.]' else left(m.text,400) end as text,
   (select jsonb_agg(jsonb_build_object('actor',r.actor,'emoji',r.emoji) order by r.actor) from public.message_reactions r where r.message_id=m.id) as reactions,
   (select max(r.updated_at) from public.message_reactions r where r.message_id=m.id) as latest
  from public.messages m
  where m.conversation_id=(select conversation_id from public.messages where id=p_message)
   and m.role in ('user','character') and m.kind in ('text','photo')
   and m.sequence<=(select sequence from public.messages where id=p_message)
   and not exists(select 1 from jsonb_array_elements(result->'history') h where h->>'id'=m.id::text)
   and exists(select 1 from public.message_reactions r where r.message_id=m.id)
  order by latest desc,m.sequence desc limit 4
 ) recent;
 return result||jsonb_build_object('reactionContext',extras);
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;
commit;
