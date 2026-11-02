begin;

-- Founder decision, 3 November 2026: a light per-character knowledge base. While replying,
-- a character may note up to two short facts the user just shared about themselves (name,
-- city, job, interests, plans, dates). Notes are ordinary memories (consent 'ordinary_shared'),
-- visible and deletable in Settings > Memories, on by default and off when the user turns
-- memory off for that character. No extra model call: notes come back with the reply itself.

-- Adding a note is not a privacy change, so it must not discard in-flight replies or clear the
-- older-chat summary. Edits, deletions and preference changes still do.
create or replace function private.invalidate_memory_context() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('talkingstage.memory_note',true)='on' then return null;end if;
 update public.conversations set context_revision=context_revision+1
 where user_id=coalesce(new.user_id,old.user_id) and character_id=coalesce(new.character_id,old.character_id);
 return null;
end;$$;
revoke all on function private.invalidate_memory_context() from public,anon,authenticated;

-- Notes are short, self-described facts; contact, bank and credential details are never kept.
create function private.valid_memory_note(p_note text) returns boolean
language sql immutable set search_path='' as $$
 select p_note is not null and char_length(p_note) between 3 and 120
  and regexp_replace(p_note,'[\s().+-]','','g') !~ '\d{7,}'
  and p_note !~* '(@|https?:|www\.|password|passcode|\mpin\M|\mbvn\M|\mnin\M|account number|card number|cvv|otp)';
$$;
revoke all on function private.valid_memory_note(text) from public,anon,authenticated,service_role;

create function public.save_memory_notes(p_job uuid,p_actor uuid,p_notes jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare j private.reply_jobs;c public.conversations;note text;saved integer:=0;
begin
 if jsonb_typeof(p_notes) is distinct from 'array' or jsonb_array_length(p_notes)=0 then return 0;end if;
 select * into j from private.reply_jobs where id=p_job and state='completed' and origin='reply';
 if not found then return 0;end if;
 select * into c from public.conversations where id=j.conversation_id and user_id=p_actor and deleted_at is null and status='active' and generation=j.generation;
 if not found then return 0;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text||c.character_id::text,0));
 if exists(select 1 from public.memory_preferences where user_id=p_actor and character_id=c.character_id and not enabled) then return 0;end if;
 perform set_config('talkingstage.memory_note','on',true);
 insert into public.memory_preferences(user_id,character_id,enabled) values(p_actor,c.character_id,true) on conflict(user_id,character_id) do nothing;
 for note in select trim(regexp_replace(value,'\s+',' ','g')) from jsonb_array_elements_text(p_notes) with ordinality t(value,position) where position<=2 loop
  continue when not private.valid_memory_note(note);
  continue when exists(select 1 from public.memories where user_id=p_actor and character_id=c.character_id and deleted_at is null and lower(content)=lower(note));
  insert into public.memories(user_id,character_id,content,consent,source_message_id,source_conversation_id)
  values(p_actor,c.character_id,note,'ordinary_shared',j.user_message_id,c.id);
  saved:=saved+1;
 end loop;
 -- Keep the newest 30 notes, and never more than 50 memories in all; the user's own saves stay.
 update public.memories set deleted_at=now() where id in(
  select id from public.memories where user_id=p_actor and character_id=c.character_id and deleted_at is null and consent='ordinary_shared'
  order by saved_at desc,id desc offset 30);
 update public.memories set deleted_at=now() where id in(
  select id from public.memories where user_id=p_actor and character_id=c.character_id and deleted_at is null and consent='ordinary_shared'
  order by saved_at asc,id asc limit greatest(0,(select count(*) from public.memories where user_id=p_actor and character_id=c.character_id and deleted_at is null)-50));
 perform set_config('talkingstage.memory_note','off',true);
 return saved;
end;$$;
revoke all on function public.save_memory_notes(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_memory_notes(uuid,uuid,jsonb) to service_role;

-- Memory is on unless the user turned it off; saving a fact by hand no longer needs a prior opt-in.
create or replace function public.manage_memory(p_character uuid,p_operation text,p_content text default null,p_memory uuid default null,p_consent boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_character::text,0));
 if not exists(select 1 from public.conversations where user_id=auth.uid() and character_id=p_character and deleted_at is null)
 and not exists(select 1 from public.memories where user_id=auth.uid() and character_id=p_character and deleted_at is null) then raise exception 'not_found';end if;
 perform private.limit_conversation_mutation();
 if p_operation in ('enable','disable') then
  insert into public.memory_preferences(user_id,character_id,enabled) values(auth.uid(),p_character,p_operation='enable')
  on conflict(user_id,character_id) do update set enabled=excluded.enabled,updated_at=now();
 elsif p_operation='save' then
  if p_consent is distinct from true then raise exception 'consent_required';end if;
  if p_content is null or char_length(trim(p_content)) not between 1 and 500 then raise exception 'invalid_memory';end if;
  if exists(select 1 from public.memory_preferences where user_id=auth.uid() and character_id=p_character and not enabled) then raise exception 'memory_disabled';end if;
  if (select count(*) from public.memories where user_id=auth.uid() and character_id=p_character and deleted_at is null)>=50 then raise exception 'memory_limit';end if;
  insert into public.memory_preferences(user_id,character_id,enabled) values(auth.uid(),p_character,true) on conflict(user_id,character_id) do nothing;
  insert into public.memories(user_id,character_id,content,consent) values(auth.uid(),p_character,trim(p_content),'explicit');
 elsif p_operation='delete' then
  update public.memories set deleted_at=now() where id=p_memory and user_id=auth.uid() and character_id=p_character and deleted_at is null;
  if not found then raise exception 'not_found';end if;
 else raise exception 'invalid_operation';end if;
end;$$;
revoke all on function public.manage_memory(uuid,text,text,uuid,boolean) from public,anon;
grant execute on function public.manage_memory(uuid,text,text,uuid,boolean) to authenticated;

-- Tell the reply whether it may take notes: memory on (or never turned off) for this character.
alter function public.claim_reply(uuid,uuid,text) rename to claim_before_memory_notes;
alter function public.claim_before_memory_notes(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_memory_notes(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;notes boolean;
begin
 result:=private.claim_before_memory_notes(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select not exists(select 1 from public.memory_preferences p join public.conversations c on c.character_id=p.character_id and c.user_id=p.user_id
  join public.messages m on m.conversation_id=c.id where m.id=p_message and p.user_id=p_actor and not p.enabled) into notes;
 return result||jsonb_build_object('memoryNotes',notes);
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;

commit;
