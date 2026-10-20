begin;
-- Preserve the existing ownership, capability, mutation-limit and emoji checks.
alter function public.set_message_reaction(uuid,uuid,text) rename to set_reaction_before_incoming_only;
alter function public.set_reaction_before_incoming_only(uuid,uuid,text) set schema private;
revoke all on function private.set_reaction_before_incoming_only(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.set_message_reaction(p_conversation uuid,p_message uuid,p_emoji text default null) returns void
language plpgsql security definer set search_path='' as $$
declare message_role text;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 select m.role into message_role from public.messages m join public.conversations c on c.id=m.conversation_id
 where m.id=p_message and c.id=p_conversation and c.user_id=auth.uid() and c.deleted_at is null;
 if not found then raise exception 'not_found';end if;
 if p_emoji is not null and message_role<>'character' then raise exception 'self_reaction_not_allowed';end if;
 -- Existing self-reactions may still be removed; creating/changing one is denied.
 perform private.set_reaction_before_incoming_only(p_conversation,p_message,p_emoji);
end;$$;
revoke all on function public.set_message_reaction(uuid,uuid,text) from public,anon;
grant execute on function public.set_message_reaction(uuid,uuid,text) to authenticated;
commit;
