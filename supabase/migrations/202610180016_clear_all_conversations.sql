begin;
create function public.clear_all_conversations(p_clear_memories boolean default false) returns integer
language plpgsql security definer set search_path='' as $$
declare ids uuid[]; characters uuid[]; removed integer;
begin
 if not public.has_adult_access() then raise exception 'forbidden'; end if;
 if p_clear_memories is null then raise exception 'invalid_operation'; end if;
 perform private.limit_conversation_mutation();
 -- Lock every owned live chat, including archived chats and later list pages.
 select coalesce(array_agg(owned.id),'{}'::uuid[]),coalesce(array_agg(distinct owned.character_id),'{}'::uuid[])
 into ids,characters from (
  select c.id,c.character_id from public.conversations c
  where c.user_id=auth.uid() and c.deleted_at is null order by c.id for update
 ) owned;
 removed:=cardinality(ids);
 if removed=0 then return 0; end if;
 update public.memories set source_message_id=null,source_conversation_id=null
 where user_id=auth.uid() and source_conversation_id=any(ids);
 if p_clear_memories then
  update public.memories set deleted_at=coalesce(deleted_at,now())
  where user_id=auth.uid() and character_id=any(characters);
 end if;
 -- Message cascades erase queued jobs; generation/deletion invalidates copied
 -- reply leases, and the existing trigger erases conversation summaries.
 delete from public.messages where conversation_id=any(ids);
 update public.conversations set deleted_at=now(),generation=generation+1,next_sequence=1,
  relationship_stage='introductory',last_message_preview=null,last_message_at=null,
  unread_count=0,version=version+1,updated_at=now()
 where user_id=auth.uid() and id=any(ids);
 return removed;
end; $$;
revoke all on function public.clear_all_conversations(boolean) from public,anon;
grant execute on function public.clear_all_conversations(boolean) to authenticated;
commit;
